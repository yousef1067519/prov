import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { audit } from '@/lib/tenant'
import { ACTIVE_DEAL_STAGES } from '@/lib/antiCollision'

// Pipeline CRM (§8.3): deals over the 0020 deals table.
// sourced → outreach → negotiating → contract → live → completed (+lost).
// Money is integer cents (value_cents) — never floats.

const STAGES = ['sourced', 'outreach', 'negotiating', 'contract', 'live', 'completed', 'lost'] as const
type Stage = typeof STAGES[number]
const WRITE_ROLES = ['owner', 'admin', 'account_manager']

function asCents(v: unknown): number | null {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n) // integer cents, defensively rounded
}

// GET — deals for the workspace (optionally one client), plus the client list
// for the board's per-client filter and per-creator active-deal counts for
// the double-pitch risk chip.
export async function GET(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })

  const clientId = req.nextUrl.searchParams.get('client_id')
  let q = ctx.sb.from('deals')
    .select('*, creators(id, name, platform, niche), clients(id, name)')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false })
  if (clientId) q = q.eq('client_id', clientId)
  const { data: deals, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: clients } = await ctx.sb.from('clients')
    .select('id, name').eq('workspace_id', ctx.workspaceId).order('name')

  // Active-deal counts per creator across the WHOLE workspace (not just the
  // filtered client) so double-pitch risk is visible from any board view.
  const activeByCreator: Record<string, number> = {}
  const { data: active } = await ctx.sb.from('deals')
    .select('creator_id')
    .eq('workspace_id', ctx.workspaceId)
    .in('stage', [...ACTIVE_DEAL_STAGES])
    .not('creator_id', 'is', null)
  for (const d of active ?? []) {
    const id = d.creator_id as string
    activeByCreator[id] = (activeByCreator[id] ?? 0) + 1
  }

  return NextResponse.json({ deals: deals ?? [], clients: clients ?? [], activeByCreator })
}

// POST — create a deal.
export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (ctx.wsRole && !WRITE_ROLES.includes(ctx.wsRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const b = await req.json().catch(() => ({}))
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 200) : ''
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const stage: Stage = STAGES.includes(b.stage) ? b.stage : 'sourced'
  const value = b.value_cents === undefined ? 0 : asCents(b.value_cents)
  if (value === null) return NextResponse.json({ error: 'value_cents must be a non-negative integer' }, { status: 400 })

  const { data, error } = await ctx.sb.from('deals').insert({
    workspace_id: ctx.workspaceId,
    client_id: b.client_id ?? null,
    creator_id: b.creator_id ?? null,
    sponsor_id: b.sponsor_id ?? null,
    campaign_id: b.campaign_id ?? null,
    name,
    stage,
    value_cents: value,
    currency: typeof b.currency === 'string' && b.currency ? b.currency.slice(0, 3).toUpperCase() : 'USD',
    notes: b.notes ?? null,
    stage_changed_at: new Date().toISOString(),
  }).select('*, creators(id, name, platform, niche), clients(id, name)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await audit(ctx.sb, { workspaceId: ctx.workspaceId, userId: ctx.userId, email: ctx.email },
    'deal.created', 'deal', data.id, { name, stage, value_cents: value, client_id: b.client_id ?? null })
  return NextResponse.json({ deal: data })
}

// PUT — update stage / value / details. Stage changes stamp stage_changed_at
// and land in audit_log (who moved what, from where to where).
export async function PUT(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (ctx.wsRole && !WRITE_ROLES.includes(ctx.wsRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: existing } = await ctx.sb.from('deals')
    .select('id, stage, name').eq('id', b.id).eq('workspace_id', ctx.workspaceId).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ['name', 'notes', 'client_id', 'creator_id', 'sponsor_id', 'won_strategy'] as const) {
    if (b[k] !== undefined) patch[k] = b[k]
  }
  if (b.value_cents !== undefined) {
    const value = asCents(b.value_cents)
    if (value === null) return NextResponse.json({ error: 'value_cents must be a non-negative integer' }, { status: 400 })
    patch.value_cents = value
  }
  const stageChanged = b.stage !== undefined && b.stage !== existing.stage
  if (b.stage !== undefined) {
    if (!STAGES.includes(b.stage)) return NextResponse.json({ error: 'invalid stage' }, { status: 400 })
    patch.stage = b.stage
    if (stageChanged) patch.stage_changed_at = new Date().toISOString()
  }

  const { data, error } = await ctx.sb.from('deals')
    .update(patch).eq('id', b.id).eq('workspace_id', ctx.workspaceId)
    .select('*, creators(id, name, platform, niche), clients(id, name)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (stageChanged) {
    await audit(ctx.sb, { workspaceId: ctx.workspaceId, userId: ctx.userId, email: ctx.email },
      'deal.stage_changed', 'deal', data.id, { name: data.name, from: existing.stage, to: b.stage })
  }
  return NextResponse.json({ deal: data })
}
