import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { audit } from '@/lib/tenant'

// Workspace-standardized outreach sequences (§8.4).
// GET    ?status=approved      → list the workspace's sequences (optionally filtered)
// POST   { name, strategy_key?, steps }             → create a DRAFT
// PUT    { id, name?, steps?, strategy_key?, status? } → edit / approve / archive
// DELETE { id }                → remove a sequence
//
// Governance: any working role (owner/admin/account_manager) may create and
// edit drafts, but ONLY owner/admin may set status 'approved' (or archive an
// approved sequence). Approvals and archives are written to audit_log.
// Editing the content of an approved sequence sends it back to draft — an
// edit silently keeping the approved stamp would defeat the review.

const WORKING = ['owner', 'admin', 'account_manager']
const APPROVERS = ['owner', 'admin']
const STATUSES = ['draft', 'approved', 'archived']

interface SequenceStep { subject: string; body: string; days_after_previous: number }

/** Validate + normalize the steps payload. Returns null when malformed. */
function parseSteps(raw: unknown): SequenceStep[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 10) return null
  const steps: SequenceStep[] = []
  for (const s of raw) {
    if (!s || typeof s !== 'object') return null
    const { subject, body, days_after_previous } = s as Record<string, unknown>
    if (typeof subject !== 'string' || !subject.trim()) return null
    if (typeof body !== 'string' || !body.trim()) return null
    const days = Math.max(0, Math.min(60, Math.round(Number(days_after_previous) || 0)))
    steps.push({ subject: subject.trim(), body: String(body), days_after_previous: days })
  }
  steps[0].days_after_previous = 0 // step 0 is the initial send
  return steps
}

export async function GET(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.workspaceId) return NextResponse.json({ sequences: [] })

  const status = req.nextUrl.searchParams.get('status')
  let q = ctx.sb.from('outreach_sequences')
    .select('id, name, strategy_key, steps, status, approved_by, approved_at, created_by, created_at, updated_at')
    .eq('workspace_id', ctx.workspaceId)
    .order('updated_at', { ascending: false })
  if (status && STATUSES.includes(status)) q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sequences: data ?? [], role: ctx.wsRole })
}

export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.workspaceId) return NextResponse.json({ error: 'No workspace — run the enterprise migration first' }, { status: 409 })
  if (!ctx.wsRole || !WORKING.includes(ctx.wsRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const steps = parseSteps(body.steps)
  if (!name || !steps) return NextResponse.json({ error: 'A name and at least one valid step are required' }, { status: 400 })

  const { data, error } = await ctx.sb.from('outreach_sequences').insert({
    workspace_id: ctx.workspaceId,
    name,
    strategy_key: typeof body.strategy_key === 'string' && body.strategy_key ? body.strategy_key : null,
    steps,
    status: 'draft', // sequences are born drafts — approval is a separate, audited act
    created_by: ctx.userId,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sequence: data })
}

export async function PUT(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.workspaceId) return NextResponse.json({ error: 'No workspace — run the enterprise migration first' }, { status: 409 })
  if (!ctx.wsRole || !WORKING.includes(ctx.wsRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data: existing } = await ctx.sb.from('outreach_sequences')
    .select('id, name, status, strategy_key')
    .eq('id', body.id).eq('workspace_id', ctx.workspaceId).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  let contentChanged = false

  if (typeof body.name === 'string' && body.name.trim()) { patch.name = body.name.trim(); contentChanged = true }
  if (typeof body.strategy_key === 'string') { patch.strategy_key = body.strategy_key || null }
  if (body.steps !== undefined) {
    const steps = parseSteps(body.steps)
    if (!steps) return NextResponse.json({ error: 'steps must be a non-empty array of { subject, body, days_after_previous }' }, { status: 400 })
    patch.steps = steps
    contentChanged = true
  }

  const nextStatus = typeof body.status === 'string' ? body.status : null
  if (nextStatus && !STATUSES.includes(nextStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Approval is the governance gate: owner/admin only, audited.
  if (nextStatus === 'approved' && existing.status !== 'approved') {
    if (!APPROVERS.includes(ctx.wsRole)) {
      return NextResponse.json({ error: 'Only an owner or admin can approve a sequence' }, { status: 403 })
    }
    patch.status = 'approved'
    patch.approved_by = ctx.userId
    patch.approved_at = new Date().toISOString()
  } else if (nextStatus && nextStatus !== existing.status) {
    // Archiving (or un-archiving back to draft). Taking an APPROVED sequence
    // out of circulation is also owner/admin-only.
    if (existing.status === 'approved' && !APPROVERS.includes(ctx.wsRole)) {
      return NextResponse.json({ error: 'Only an owner or admin can change an approved sequence’s status' }, { status: 403 })
    }
    patch.status = nextStatus
    if (nextStatus !== 'approved') { patch.approved_by = null; patch.approved_at = null }
  }

  // Content edits invalidate a standing approval (unless this same request
  // re-approves, which only owner/admin got past above).
  if (contentChanged && existing.status === 'approved' && patch.status !== 'approved') {
    patch.status = 'draft'
    patch.approved_by = null
    patch.approved_at = null
  }

  const { data, error } = await ctx.sb.from('outreach_sequences')
    .update(patch).eq('id', existing.id).eq('workspace_id', ctx.workspaceId)
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tenant = { workspaceId: ctx.workspaceId, userId: ctx.userId, email: ctx.email }
  if (patch.status === 'approved') {
    await audit(ctx.sb, tenant, 'sequence.approved', 'sequence', existing.id, { name: data.name })
  } else if (patch.status === 'archived') {
    await audit(ctx.sb, tenant, 'sequence.archived', 'sequence', existing.id, { name: data.name })
  }

  return NextResponse.json({ sequence: data })
}

export async function DELETE(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.workspaceId) return NextResponse.json({ error: 'No workspace — run the enterprise migration first' }, { status: 409 })
  if (!ctx.wsRole || !WORKING.includes(ctx.wsRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data: existing } = await ctx.sb.from('outreach_sequences')
    .select('id, status').eq('id', body.id).eq('workspace_id', ctx.workspaceId).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status === 'approved' && !APPROVERS.includes(ctx.wsRole)) {
    return NextResponse.json({ error: 'Only an owner or admin can delete an approved sequence' }, { status: 403 })
  }

  const { error } = await ctx.sb.from('outreach_sequences')
    .delete().eq('id', existing.id).eq('workspace_id', ctx.workspaceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
