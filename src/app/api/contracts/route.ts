import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { audit } from '@/lib/tenant'
import { formatCents } from '@/lib/invoice-money'

// §8.5 contracts: list + create-from-clauses with merge fields from a deal.
const WRITE_ROLES = ['owner', 'admin', 'account_manager']

export async function GET(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let q = ctx.sb.from('contracts')
    .select('id, title, type, counterparty_name, status, version, deal_id, signed_date, created_at')
    .order('created_at', { ascending: false })
  // Workspace scope when 0020 is live; legacy user scope otherwise.
  q = ctx.workspaceId ? q.eq('workspace_id', ctx.workspaceId) : q.eq('user_id', ctx.userId)
  const status = req.nextUrl.searchParams.get('status')
  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contracts: data ?? [] })
}

// POST { title, deal_id?, clause_keys: string[], merge_overrides?: {} }
// Assembles the contract body from the clause library, filling {{fields}}
// from the linked deal where available.
export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (ctx.wsRole && !WRITE_ROLES.includes(ctx.wsRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const b = await req.json().catch(() => ({}))
  const clauseKeys: string[] = Array.isArray(b.clause_keys) && b.clause_keys.length
    ? b.clause_keys
    : ['parties_scope','deliverables','compensation','usage_ip','exclusivity','ftc_disclosure',
       'approval_revisions','kill_fee','ai_synthetic_media','morals_termination','dispute_law','original_content_warranty']

  // Workspace copies of a clause override the stock one with the same key.
  const { data: clauses, error: cErr } = await ctx.sb.from('contract_clauses')
    .select('key, title, body_md, sort, workspace_id')
    .in('key', clauseKeys)
    .order('sort')
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })
  const byKey = new Map<string, { title: string; body_md: string; sort: number }>()
  for (const c of clauses ?? []) {
    const existing = byKey.get(c.key)
    if (!existing || c.workspace_id) byKey.set(c.key, c) // workspace copy wins
  }

  // Merge data from the deal.
  const merge: Record<string, string> = {
    effective_date: new Date().toISOString().slice(0, 10),
    agency_name: '{{agency_name}}', brand: '{{brand}}', creator_name: '{{creator_name}}',
    deal_value: '{{deal_value}}', currency: 'USD', deliverables: '{{deliverables}}',
    payment_method: 'ACH bank transfer', territory: 'worldwide',
    exclusivity_days: '30', exclusivity_category: '{{exclusivity_category}}',
    submission_method: 'the Prov client portal', jurisdiction: '{{jurisdiction}}',
    ...((b.merge_overrides ?? {}) as Record<string, string>),
  }
  let dealRow: { name?: string; client_id?: string | null } | null = null
  if (b.deal_id && ctx.workspaceId) {
    const { data: deal } = await ctx.sb.from('deals')
      .select('name, value_cents, currency, deliverables, client_id, creators(name), clients(name)')
      .eq('id', b.deal_id).eq('workspace_id', ctx.workspaceId).maybeSingle()
    if (deal) {
      dealRow = deal
      merge.deal_value = formatCents(Number(deal.value_cents ?? 0), deal.currency ?? 'USD')
      merge.currency = deal.currency ?? 'USD'
      const dl = Array.isArray(deal.deliverables) ? deal.deliverables : []
      if (dl.length) merge.deliverables = dl.map((d: unknown, i: number) =>
        `${i + 1}. ${typeof d === 'string' ? d : JSON.stringify(d)}`).join('\n')
      const creator = deal.creators as unknown as { name?: string } | null
      const client = deal.clients as unknown as { name?: string } | null
      if (creator?.name) merge.creator_name = creator.name
      if (client?.name) merge.brand = client.name
    }
  }

  const fill = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => merge[k] ?? m)
  const body = clauseKeys
    .map((k, i) => byKey.get(k) ? `## ${i + 1}. ${byKey.get(k)!.title}\n\n${fill(byKey.get(k)!.body_md)}` : null)
    .filter(Boolean)
    .join('\n\n')

  const { data, error } = await ctx.sb.from('contracts').insert({
    user_id: ctx.userId,
    workspace_id: ctx.workspaceId,
    deal_id: b.deal_id ?? null,
    type: b.type === 'sponsor' ? 'sponsor' : 'influencer',
    title: String(b.title ?? dealRow?.name ?? 'Sponsorship agreement').slice(0, 200),
    counterparty_name: merge.creator_name !== '{{creator_name}}' ? merge.creator_name : (b.counterparty_name ?? null),
    body,
    status: 'draft',
    merge_data: merge,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (ctx.workspaceId) {
    await audit(ctx.sb, { workspaceId: ctx.workspaceId, userId: ctx.userId, email: ctx.email },
      'contract.created', 'contract', data.id, { title: data.title, deal_id: b.deal_id ?? null })
  }
  return NextResponse.json(data)
}
