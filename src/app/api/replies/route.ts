import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { syncRepliesForOwner } from '@/lib/replySync'

// Replies for the current workspace.
//   GET  ?campaign_id=   → list recorded replies (newest first)
//   POST                 → scan Gmail for new replies right now, then list

export async function GET(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaignId = req.nextUrl.searchParams.get('campaign_id')
  let q = ctx.sb.from('responses').select('*').eq('user_id', ctx.userId)
  // Ignore local-only campaign ids ("local-…") — a non-uuid filter would error.
  if (campaignId && /^[0-9a-f-]{36}$/i.test(campaignId)) q = q.eq('campaign_id', campaignId)
  const { data, error } = await q.order('created_at', { ascending: false }).limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ replies: data ?? [] })
}

// Mark a reply read — clears the green unread highlight on the Track page.
export async function PATCH(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'Provide an id' }, { status: 400 })

  const { error } = await ctx.sb
    .from('responses')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', ctx.userId)
    .is('read_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function POST() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await syncRepliesForOwner(ctx.userId)

  const { data } = await ctx.sb
    .from('responses')
    .select('*')
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .limit(100)

  return NextResponse.json({ ...result, replies: data ?? [] })
}
