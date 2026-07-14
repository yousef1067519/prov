import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { logActivity } from '@/lib/activity'
import { dispatchEvent } from '@/lib/notify'

type Ctx = { params: Promise<{ id: string }> }

// POST { decision: 'approved' | 'rejected', comment? } — review a content item.
export async function POST(req: NextRequest, ctx: Ctx) {
  const c = await apiCtx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const { decision, comment } = await req.json().catch(() => ({}))
  if (decision !== 'approved' && decision !== 'rejected') {
    return NextResponse.json({ error: 'decision must be approved or rejected' }, { status: 400 })
  }
  if (decision === 'rejected' && !String(comment ?? '').trim()) {
    return NextResponse.json({ error: 'A comment is required when rejecting' }, { status: 400 })
  }

  const { data, error } = await c.sb.from('content_items').update({
    status: decision,
    review_comment: comment ? String(comment).slice(0, 1000) : null,
    reviewed_by: c.email,
    reviewed_at: new Date().toISOString(),
  }).eq('id', id).eq('owner_id', c.userId).select('id, status, review_comment, reviewed_by, reviewed_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(c.sb, c.userId, { actorEmail: c.email ?? undefined, action: `content_${decision}`, resourceType: 'content', resourceId: id })
  await dispatchEvent(c.sb, c.userId, { event: `content_${decision}`, text: `Content ${decision}${comment ? ` — "${String(comment).slice(0, 80)}"` : ''}`, data: { contentId: id } })
  return NextResponse.json({ item: data })
}
