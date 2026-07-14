import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { logActivity } from '@/lib/activity'

type Ctx = { params: Promise<{ id: string }> }

// POST { file_path, notes? } — add a new version of an existing content item.
// The new file becomes current; the item resets to 'pending' for re-approval.
export async function POST(req: NextRequest, ctx: Ctx) {
  const c = await apiCtx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const { file_path, notes } = await req.json().catch(() => ({}))
  if (!file_path) return NextResponse.json({ error: 'file_path required' }, { status: 400 })

  const { data: item } = await c.sb.from('content_items').select('version_num').eq('id', id).eq('owner_id', c.userId).maybeSingle()
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const next = (item.version_num ?? 1) + 1

  const { error: vErr } = await c.sb.from('content_versions').insert({
    content_id: id, owner_id: c.userId, version_num: next, file_path,
    notes: notes ? String(notes).slice(0, 500) : null,
  })
  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 })

  const { data, error } = await c.sb.from('content_items').update({
    file_path, version_num: next, status: 'pending', review_comment: null, reviewed_by: null, reviewed_at: null,
  }).eq('id', id).eq('owner_id', c.userId).select('id, version_num, status').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(c.sb, c.userId, { actorEmail: c.email ?? undefined, action: 'content_new_version', resourceType: 'content', resourceId: id, meta: { version: next } })
  return NextResponse.json({ item: data })
}
