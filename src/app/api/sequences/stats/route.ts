import { NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'

// Per-sequence performance (§8.4): sends, replies, reply rate, wins.
// Sends carry sequence_id (0023); replies join back through
// responses.email_id → emails_sent.id, with a from_email → recipient_email
// fallback for replies the sync couldn't pin to a specific send.

// Deal statuses that count as a WIN — same vocabulary reports/generate uses.
const WIN_STATUSES = ['won', 'confirmed', 'agreed']

interface SeqStats { sends: number; replies: number; reply_rate: number; wins: number }

export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.workspaceId) return NextResponse.json({ stats: {} })

  const [{ data: sends }, { data: replies }] = await Promise.all([
    // Rows are stamped with user_id (the legacy workspace key apiCtx scopes to).
    ctx.sb.from('emails_sent')
      .select('id, sequence_id, recipient_email')
      .eq('user_id', ctx.userId)
      .not('sequence_id', 'is', null)
      .limit(5000),
    ctx.sb.from('responses')
      .select('email_id, from_email, deal_status')
      .eq('user_id', ctx.userId)
      .limit(5000),
  ])

  // Index the sequence's sends two ways for the reply join.
  const seqByEmailId = new Map<string, string>()
  const seqByRecipient = new Map<string, string>()
  const stats: Record<string, SeqStats> = {}
  for (const s of sends ?? []) {
    const seq = String(s.sequence_id)
    seqByEmailId.set(String(s.id), seq)
    if (s.recipient_email) seqByRecipient.set(String(s.recipient_email).toLowerCase(), seq)
    stats[seq] = stats[seq] ?? { sends: 0, replies: 0, reply_rate: 0, wins: 0 }
    stats[seq].sends++
  }

  for (const r of replies ?? []) {
    const seq = (r.email_id && seqByEmailId.get(String(r.email_id)))
      || (r.from_email && seqByRecipient.get(String(r.from_email).toLowerCase()))
    if (!seq || !stats[seq]) continue
    stats[seq].replies++
    if (WIN_STATUSES.includes(String(r.deal_status))) stats[seq].wins++
  }

  for (const seq of Object.keys(stats)) {
    const s = stats[seq]
    s.reply_rate = s.sends > 0 ? Math.round((s.replies / s.sends) * 1000) / 10 : 0
  }

  return NextResponse.json({ stats })
}
