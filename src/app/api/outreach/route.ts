import { NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'

// Outreach history for the Track page — one entry per recipient, newest
// activity first. A recipient's entry carries their latest reply (with
// read/unread state) so the UI can highlight unread responses.

interface Reply {
  id: string
  message: string
  deal_status: string
  ai_suggestion: string | null
  read_at: string | null
  updated_at: string | null
  created_at: string
  from_name: string | null
}

export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: sends }, { data: replies }] = await Promise.all([
    ctx.sb.from('emails_sent')
      .select('id, recipient_email, recipient_name, recipient_type, subject, body, status, created_at')
      .eq('user_id', ctx.userId)
      .order('created_at', { ascending: false })
      .limit(500),
    ctx.sb.from('responses')
      .select('id, from_email, from_name, message, deal_status, ai_suggestion, read_at, updated_at, created_at')
      .eq('user_id', ctx.userId)
      .limit(500),
  ])

  const replyBySender = new Map<string, Reply>()
  for (const r of replies ?? []) replyBySender.set(String(r.from_email).toLowerCase(), r as Reply)

  interface SentItem { id: string; subject: string; body: string; status: string; created_at: string }
  interface Entry {
    email: string; name: string | null; type: string
    sends: number; last_subject: string; last_sent_at: string; first_sent_at: string
    replied: boolean; reply: Reply | null; last_activity: string
    history: SentItem[]
  }
  const MAX_HISTORY = 20
  const byRecipient = new Map<string, Entry>()
  for (const s of sends ?? []) {
    const key = String(s.recipient_email).toLowerCase()
    const item: SentItem = { id: s.id, subject: s.subject, body: s.body, status: s.status, created_at: s.created_at }
    const cur = byRecipient.get(key)
    if (cur) {
      cur.sends++
      cur.first_sent_at = s.created_at // rows are newest-first, so last seen is oldest
      if (!cur.name && s.recipient_name) cur.name = s.recipient_name
      if (cur.history.length < MAX_HISTORY) cur.history.push(item)
    } else {
      const reply = replyBySender.get(key) ?? null
      byRecipient.set(key, {
        email: key,
        name: s.recipient_name ?? reply?.from_name ?? null,
        type: s.recipient_type ?? 'creator',
        sends: 1,
        last_subject: s.subject,
        last_sent_at: s.created_at,
        first_sent_at: s.created_at,
        replied: !!reply || s.status === 'replied',
        reply,
        last_activity: reply ? (reply.updated_at ?? reply.created_at) : s.created_at,
        history: [item],
      })
    }
  }

  const outreach = [...byRecipient.values()].sort((a, b) => {
    // Unread replies pin to the top, then most recent activity.
    const aUnread = a.reply && !a.reply.read_at ? 1 : 0
    const bUnread = b.reply && !b.reply.read_at ? 1 : 0
    if (aUnread !== bUnread) return bUnread - aUnread
    return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
  })

  return NextResponse.json({ outreach })
}
