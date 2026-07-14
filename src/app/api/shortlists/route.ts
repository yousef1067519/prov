import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { audit } from '@/lib/tenant'

// Shortlists (§8.3): curated creator lists shared across the workspace.
// Tables live in 0022_creators_pipeline.sql; RLS mirrors 0020. API routes act
// through the service client + explicit workspace scoping (house pattern).

const WRITE_ROLES = ['owner', 'admin', 'account_manager']

const CREATOR_COLS = 'id, name, niche, platform, subscribers, avg_views, engagement_rate, email, country, quality_score, vetting_status, brand_safety_flags'

// GET — all shortlists in the workspace (optionally one client), each with
// its creators.
export async function GET(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })

  const clientId = req.nextUrl.searchParams.get('client_id')
  let q = ctx.sb.from('shortlists')
    .select(`id, client_id, name, created_by, created_at, shortlist_creators(creator_id, note, added_by, added_at, creators(${CREATOR_COLS}))`)
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false })
  if (clientId) q = q.eq('client_id', clientId)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const shortlists = (data ?? []).map(s => ({
    id: s.id,
    client_id: s.client_id,
    name: s.name,
    created_by: s.created_by,
    created_at: s.created_at,
    creators: (s.shortlist_creators ?? []).map((m: Record<string, unknown>) => ({
      creator_id: m.creator_id,
      note: m.note,
      added_by: m.added_by,
      added_at: m.added_at,
      creator: m.creators ?? null,
    })),
  }))
  return NextResponse.json({ shortlists })
}

// POST — create a shortlist.
export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (ctx.wsRole && !WRITE_ROLES.includes(ctx.wsRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const b = await req.json().catch(() => ({}))
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 120) : ''
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const { data, error } = await ctx.sb.from('shortlists').insert({
    workspace_id: ctx.workspaceId,
    client_id: b.client_id ?? null,
    name,
    created_by: ctx.userId,
  }).select('id, client_id, name, created_by, created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await audit(ctx.sb, { workspaceId: ctx.workspaceId, userId: ctx.userId, email: ctx.email },
    'shortlist.created', 'shortlist', data.id, { name, client_id: b.client_id ?? null })
  return NextResponse.json({ shortlist: { ...data, creators: [] } })
}

// PUT — rename (or re-scope to a client).
export async function PUT(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (ctx.wsRole && !WRITE_ROLES.includes(ctx.wsRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (b.name !== undefined) {
    const name = typeof b.name === 'string' ? b.name.trim().slice(0, 120) : ''
    if (!name) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    patch.name = name
  }
  if (b.client_id !== undefined) patch.client_id = b.client_id
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const { data, error } = await ctx.sb.from('shortlists')
    .update(patch).eq('id', b.id).eq('workspace_id', ctx.workspaceId)
    .select('id, client_id, name, created_by, created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shortlist: data })
}

// DELETE — remove a shortlist (?id=...). Members cascade via FK.
export async function DELETE(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (ctx.wsRole && !WRITE_ROLES.includes(ctx.wsRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await ctx.sb.from('shortlists')
    .delete().eq('id', id).eq('workspace_id', ctx.workspaceId).select('id, name').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Shortlist not found' }, { status: 404 })

  await audit(ctx.sb, { workspaceId: ctx.workspaceId, userId: ctx.userId, email: ctx.email },
    'shortlist.deleted', 'shortlist', data.id, { name: data.name })
  return NextResponse.json({ ok: true })
}
