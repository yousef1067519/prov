import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { logActivity } from '@/lib/activity'

type Ctx = { params: Promise<{ id: string }> }

// GET — internal notes for a campaign (newest first).
export async function GET(_req: NextRequest, ctx: Ctx) {
  const c = await apiCtx()
  if (!c) return NextResponse.json({ notes: [] })
  const { id: campaignId } = await ctx.params
  const { data } = await c.sb
    .from('internal_notes')
    .select('id, note, author_email, created_at, updated_at')
    .eq('owner_id', c.userId)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
  return NextResponse.json({ notes: data ?? [] })
}

// POST — add a note.
export async function POST(req: NextRequest, ctx: Ctx) {
  const c = await apiCtx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: campaignId } = await ctx.params
  const { note } = await req.json().catch(() => ({}))
  const text = String(note ?? '').trim()
  if (!text) return NextResponse.json({ error: 'note required' }, { status: 400 })

  const { data, error } = await c.sb.from('internal_notes')
    .insert({ owner_id: c.userId, campaign_id: campaignId, author_email: c.email, note: text.slice(0, 4000) })
    .select('id, note, author_email, created_at, updated_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(c.sb, c.userId, { actorEmail: c.email ?? undefined, action: 'added_note', resourceType: 'campaign', resourceId: campaignId })
  return NextResponse.json({ note: data })
}

// PATCH — edit a note ({ noteId, note }).
export async function PATCH(req: NextRequest) {
  const c = await apiCtx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { noteId, note } = await req.json().catch(() => ({}))
  const text = String(note ?? '').trim()
  if (!noteId || !text) return NextResponse.json({ error: 'noteId and note required' }, { status: 400 })

  const { data, error } = await c.sb.from('internal_notes')
    .update({ note: text.slice(0, 4000), updated_at: new Date().toISOString() })
    .eq('id', noteId).eq('owner_id', c.userId)
    .select('id, note, author_email, created_at, updated_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}

// DELETE /api/campaigns/:id/notes?noteId=
export async function DELETE(req: NextRequest) {
  const c = await apiCtx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const noteId = req.nextUrl.searchParams.get('noteId')
  if (!noteId) return NextResponse.json({ error: 'noteId required' }, { status: 400 })
  const { error } = await c.sb.from('internal_notes').delete().eq('id', noteId).eq('owner_id', c.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
