import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { accessTokenForUser } from '@/lib/googleTokens'
import { extractBody, stripQuoted, gmailGet, type GmailPart } from '@/lib/replySync'

// Full conversation with one recipient, straight from Gmail — every message
// sent to or received from them, oldest first, quoted history stripped.
// GET ?email=<recipient>

export async function GET(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = (req.nextUrl.searchParams.get('email') ?? '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Provide a valid email' }, { status: 400 })
  }

  const gmail = await accessTokenForUser(ctx.userId)
  if (!gmail) return NextResponse.json({ messages: [], skipped: 'no-gmail-token' })

  const q = encodeURIComponent(`from:${email} OR to:${email}`)
  const list = await gmailGet(gmail.token, `messages?q=${q}&maxResults=15`)
  const ids = ((list?.messages ?? []) as { id: string }[]).map(m => m.id)

  // Fetch all messages in parallel — sequential round-trips make expand feel broken.
  const fulls = await Promise.all(ids.map(id => gmailGet(gmail.token, `messages/${id}?format=full`)))

  const messages: { id: string; direction: 'sent' | 'received'; from: string; subject: string; body: string; date: number }[] = []
  for (let i = 0; i < fulls.length; i++) {
    const full = fulls[i]
    if (!full) continue
    const payload = full.payload as GmailPart | undefined
    const headers = payload?.headers ?? []
    const h = (name: string) => headers.find(x => x.name.toLowerCase() === name)?.value ?? ''
    const from = h('from')
    const body = stripQuoted(extractBody(payload)) || String(full.snippet ?? '')
    if (!body) continue
    messages.push({
      id: ids[i],
      direction: from.toLowerCase().includes(email) ? 'received' : 'sent',
      from,
      subject: h('subject'),
      body: body.slice(0, 5000),
      date: Number(full.internalDate ?? 0),
    })
  }

  messages.sort((a, b) => a.date - b.date)
  return NextResponse.json({ messages })
}
