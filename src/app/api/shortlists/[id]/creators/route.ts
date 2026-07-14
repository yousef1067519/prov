import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import type { ApiCtx } from '@/lib/apiUser'

// Add / remove creators on a shortlist (§8.3). The parent shortlist is
// always verified against the caller's workspace before touching members.

const WRITE_ROLES = ['owner', 'admin', 'account_manager']

async function ownedShortlist(ctx: ApiCtx, id: string): Promise<boolean> {
  const { data } = await ctx.sb.from('shortlists')
    .select('id').eq('id', id).eq('workspace_id', ctx.workspaceId!).maybeSingle()
  return !!data
}

// POST — add a creator ({ creator_id, note? }). Idempotent: re-adding
// updates the note instead of failing on the primary key.
export async function POST(req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  const { id } = await routeCtx.params
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (ctx.wsRole && !WRITE_ROLES.includes(ctx.wsRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!(await ownedShortlist(ctx, id))) return NextResponse.json({ error: 'Shortlist not found' }, { status: 404 })

  const b = await req.json().catch(() => ({}))
  if (!b.creator_id) return NextResponse.json({ error: 'creator_id required' }, { status: 400 })

  const { data, error } = await ctx.sb.from('shortlist_creators').upsert({
    shortlist_id: id,
    creator_id: b.creator_id,
    note: b.note ?? null,
    added_by: ctx.userId,
  }, { onConflict: 'shortlist_id,creator_id' }).select('shortlist_id, creator_id, note, added_by, added_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data })
}

// DELETE — remove a creator (?creator_id=...).
export async function DELETE(req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  const { id } = await routeCtx.params
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (ctx.wsRole && !WRITE_ROLES.includes(ctx.wsRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!(await ownedShortlist(ctx, id))) return NextResponse.json({ error: 'Shortlist not found' }, { status: 404 })

  const creatorId = req.nextUrl.searchParams.get('creator_id')
  if (!creatorId) return NextResponse.json({ error: 'creator_id required' }, { status: 400 })

  const { error } = await ctx.sb.from('shortlist_creators')
    .delete().eq('shortlist_id', id).eq('creator_id', creatorId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
