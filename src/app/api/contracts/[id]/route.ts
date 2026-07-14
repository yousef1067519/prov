import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { audit } from '@/lib/tenant'

// §8.5 contract lifecycle: versioned edits + status actions with audit trail.
const WRITE_ROLES = ['owner', 'admin', 'account_manager']
const APPROVE_ROLES = ['owner', 'admin']

type Params = { params: Promise<{ id: string }> }

async function loadScoped(ctx: NonNullable<Awaited<ReturnType<typeof apiCtx>>>, id: string) {
  let q = ctx.sb.from('contracts').select('*').eq('id', id)
  q = ctx.workspaceId ? q.eq('workspace_id', ctx.workspaceId) : q.eq('user_id', ctx.userId)
  const { data } = await q.maybeSingle()
  return data
}

export async function GET(_req: NextRequest, { params }: Params) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const contract = await loadScoped(ctx, id)
  if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Version chain: walk parents + children sharing the same root.
  const root = contract.parent_contract_id ?? contract.id
  let vq = ctx.sb.from('contracts')
    .select('id, version, status, created_at')
    .or(`id.eq.${root},parent_contract_id.eq.${root}`)
    .order('version', { ascending: false })
  vq = ctx.workspaceId ? vq.eq('workspace_id', ctx.workspaceId) : vq.eq('user_id', ctx.userId)
  const { data: versions } = await vq
  return NextResponse.json({ contract, versions: versions ?? [] })
}

// PUT { body?, title? } — editing creates a NEW version row; versions are immutable.
export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (ctx.wsRole && !WRITE_ROLES.includes(ctx.wsRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const current = await loadScoped(ctx, id)
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (['executed', 'void'].includes(current.status)) {
    return NextResponse.json({ error: `A ${current.status} contract cannot be edited` }, { status: 409 })
  }
  const b = await req.json().catch(() => ({}))

  const { data, error } = await ctx.sb.from('contracts').insert({
    user_id: current.user_id,
    workspace_id: current.workspace_id,
    deal_id: current.deal_id,
    type: current.type,
    title: b.title !== undefined ? String(b.title).slice(0, 200) : current.title,
    counterparty_name: current.counterparty_name,
    creator_id: current.creator_id,
    sponsor_id: current.sponsor_id,
    campaign_id: current.campaign_id,
    body: b.body !== undefined ? String(b.body) : current.body,
    status: 'draft',
    merge_data: current.merge_data,
    version: (current.version ?? 1) + 1,
    parent_contract_id: current.parent_contract_id ?? current.id,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (ctx.workspaceId) {
    await audit(ctx.sb, { workspaceId: ctx.workspaceId, userId: ctx.userId, email: ctx.email },
      'contract.new_version', 'contract', data.id, { from: id, version: data.version })
  }
  return NextResponse.json(data)
}

// POST { action } — submit_for_approval | approve | send | mark_signed | mark_executed | void
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (ctx.wsRole && !WRITE_ROLES.includes(ctx.wsRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const current = await loadScoped(ctx, id)
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { action } = await req.json().catch(() => ({}))

  const transitions: Record<string, { from: string[]; to: string; patch?: Record<string, unknown> }> = {
    submit_for_approval: { from: ['draft'], to: 'internal_approval' },
    approve: { from: ['internal_approval'], to: 'draft', patch: { approved_by: ctx.userId, approved_at: new Date().toISOString() } },
    send: { from: ['draft'], to: 'sent' },
    mark_signed: { from: ['sent'], to: 'signed', patch: { signed_date: new Date().toISOString() } },
    mark_executed: { from: ['signed'], to: 'executed' },
    void: { from: ['draft', 'internal_approval', 'sent'], to: 'void' },
  }
  const t = transitions[action as string]
  if (!t) return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  if (!t.from.includes(current.status)) {
    return NextResponse.json({ error: `Cannot ${action} a ${current.status} contract` }, { status: 409 })
  }
  if (action === 'approve') {
    // Sending requires internal approval; approval itself is owner/admin only.
    if (ctx.wsRole && !APPROVE_ROLES.includes(ctx.wsRole)) {
      return NextResponse.json({ error: 'Only an owner or admin can approve contracts' }, { status: 403 })
    }
    // Approval requirement satisfied — record it, return to draft ready-to-send.
  }
  if (action === 'send' && ctx.workspaceId && !current.approved_at) {
    return NextResponse.json({ error: 'Contract needs internal approval before sending' }, { status: 409 })
  }

  const { data, error } = await ctx.sb.from('contracts')
    .update({ status: t.to, ...(t.patch ?? {}) })
    .eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (ctx.workspaceId) {
    await audit(ctx.sb, { workspaceId: ctx.workspaceId, userId: ctx.userId, email: ctx.email },
      `contract.${action}`, 'contract', id, { title: current.title, version: current.version })
  }
  return NextResponse.json(data)
}
