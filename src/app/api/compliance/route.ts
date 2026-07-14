import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { audit } from '@/lib/tenant'

// FTC compliance (§4.6): disclosure requirements per deal deliverable.
// Every status change lands in audit_log — who approved what and when is
// the entire point of this module.

const WRITE_ROLES = ['owner', 'admin', 'account_manager']

export async function GET(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })

  const url = req.nextUrl
  let q = ctx.sb.from('deliverable_disclosures')
    .select('*, deals(name, stage, client_id)')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false })
  if (url.searchParams.get('deal_id')) q = q.eq('deal_id', url.searchParams.get('deal_id'))
  if (url.searchParams.get('status')) q = q.eq('status', url.searchParams.get('status'))
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // The headline number: live deliverables with no verified disclosure.
  const exposed = (data ?? []).filter(d => d.status === 'live_unverified' || d.status === 'flagged').length
  return NextResponse.json({ disclosures: data ?? [], exposed })
}

export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (ctx.wsRole && !WRITE_ROLES.includes(ctx.wsRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const b = await req.json().catch(() => ({}))
  if (!b.deal_id || !b.deliverable_label) {
    return NextResponse.json({ error: 'deal_id and deliverable_label required' }, { status: 400 })
  }
  const { data, error } = await ctx.sb.from('deliverable_disclosures').insert({
    workspace_id: ctx.workspaceId,
    deal_id: b.deal_id,
    client_id: b.client_id ?? null,
    deliverable_label: String(b.deliverable_label).slice(0, 200),
    platform: b.platform ?? null,
    required_language: b.required_language || '#ad in the first line of the caption',
    placement: b.placement || 'caption_first_line',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await audit(ctx.sb, { workspaceId: ctx.workspaceId, userId: ctx.userId, email: ctx.email },
    'compliance.requirement_created', 'disclosure', data.id, { deal_id: b.deal_id, label: b.deliverable_label })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (ctx.wsRole && !WRITE_ROLES.includes(ctx.wsRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ['posted_url', 'proof_path', 'notes', 'platform', 'required_language', 'placement'] as const) {
    if (b[k] !== undefined) patch[k] = b[k]
  }
  if (b.status) {
    patch.status = b.status
    if (b.status === 'verified') {
      patch.verified_by = ctx.userId
      patch.verified_at = new Date().toISOString()
    }
  }

  const { data, error } = await ctx.sb.from('deliverable_disclosures')
    .update(patch).eq('id', b.id).eq('workspace_id', ctx.workspaceId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (b.status) {
    await audit(ctx.sb, { workspaceId: ctx.workspaceId, userId: ctx.userId, email: ctx.email },
      `compliance.${b.status}`, 'disclosure', data.id,
      { deliverable: data.deliverable_label, posted_url: data.posted_url })
  }
  return NextResponse.json(data)
}
