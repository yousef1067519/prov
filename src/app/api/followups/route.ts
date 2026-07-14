import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'

// Scheduled follow-up queue for the current workspace.
//   GET  ?campaign_id=&status=   → list (newest send first)
//   DELETE { id }                → cancel a pending follow-up

export async function GET(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaignId = req.nextUrl.searchParams.get('campaign_id')
  const status = req.nextUrl.searchParams.get('status')

  let q = ctx.sb.from('scheduled_emails').select('*').eq('owner_id', ctx.userId)
  // Ignore local-only campaign ids ("local-…") — a non-uuid filter would error.
  if (campaignId && /^[0-9a-f-]{36}$/i.test(campaignId)) q = q.eq('campaign_id', campaignId)
  if (status) q = q.eq('status', status)
  const { data, error } = await q.order('send_at', { ascending: true }).limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ followups: data ?? [] })
}

export async function DELETE(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'Provide an id' }, { status: 400 })

  // Only pending rows can be cancelled, and only within this workspace.
  const { data, error } = await ctx.sb
    .from('scheduled_emails')
    .update({ status: 'cancelled', fail_reason: 'cancelled by user' })
    .eq('id', id)
    .eq('owner_id', ctx.userId)
    .eq('status', 'pending')
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'Not found or already sent' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
