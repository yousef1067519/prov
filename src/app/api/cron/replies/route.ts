import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/apiUser'
import { syncRepliesForOwner } from '@/lib/replySync'

// Reply Radar dispatcher. Hit once daily by Vercel Cron (vercel.json) — Vercel's free
// Hobby tier caps crons at once/day; bump back to every 30min ("30 * * * *") once on
// Pro. For each user with a stored Gmail refresh token: scan their inbox for replies
// to tracked sends, record them in `responses`, and mark sends replied (auto-cancels
// follow-ups).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization') ?? ''
  const manual = req.headers.get('x-cron-secret') ?? ''
  if (!secret || (auth !== `Bearer ${secret}` && manual !== secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = serviceClient()
  const { data: tokens, error } = await sb.from('google_tokens').select('user_id').limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!tokens?.length) return NextResponse.json({ ok: true, owners: 0, found: 0 })

  let checked = 0
  let found = 0
  for (const t of tokens) {
    try {
      const r = await syncRepliesForOwner(t.user_id as string)
      checked += r.checked
      found += r.found
    } catch { /* one owner failing shouldn't block the rest */ }
  }

  return NextResponse.json({ ok: true, owners: tokens.length, checked, found })
}
