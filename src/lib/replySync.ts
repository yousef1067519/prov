import { aiChat, aiEnabled } from './claude'
import { serviceClient } from './apiUser'
import { accessTokenForUser } from './googleTokens'

// Reply Radar — scans the owner's Gmail inbox for replies to tracked outreach,
// records them in `responses`, marks the original send as replied (which makes
// the follow-up cron cancel any pending nudges), and classifies the deal.

const MAX_RECIPIENTS_PER_RUN = 25
const LOOKBACK_DAYS = 30

export interface ReplySyncResult {
  checked: number
  found: number
  skipped: string | null // reason nothing could run (e.g. no Gmail token)
}

/** interested / negotiating / declined from the reply text. */
async function classifyReply(text: string): Promise<string> {
  const t = text.toLowerCase()
  if (aiEnabled()) {
    try {
      const out = await aiChat({
        maxTokens: 10,
        messages: [{
          role: 'user',
          content: `A creator replied to a sponsorship outreach email. Classify their reply as exactly one word — interested, negotiating, or declined.\n\nReply:\n${text.slice(0, 2000)}`,
        }],
      })
      const label = out.trim().toLowerCase()
      if (['interested', 'negotiating', 'declined'].includes(label)) return label
    } catch { /* fall through to heuristic */ }
  }
  if (/(not interested|no thanks|no thank you|not a good fit|remove me|unsubscribe|not at this time|pass on this|decline)/.test(t)) return 'declined'
  if (/(rate|price|pricing|budget|how much|\$|fee|compensation|payment|terms|contract|usage rights)/.test(t)) return 'negotiating'
  return 'interested'
}

/** Draft a suggested response to send back to the creator. */
async function suggestReply(creatorReply: string, dealStatus: string): Promise<string | null> {
  if (!aiEnabled()) return null
  try {
    const prompts: Record<string, string> = {
      interested: `A creator replied "yes" to a sponsorship pitch. Draft a SHORT (1-2 sentences) next-step email: confirm details, send contract, or schedule a call. Be warm and concise.\n\nTheir reply:\n${creatorReply.slice(0, 500)}`,
      negotiating: `A creator replied with budget/terms questions to a sponsorship pitch. Draft a SHORT (2-3 sentences) response addressing their concern and moving toward a deal. Be helpful and clear.\n\nTheir reply:\n${creatorReply.slice(0, 500)}`,
      declined: `A creator declined a sponsorship pitch. Draft a SHORT (1 sentence) graceful exit that leaves the door open for future collabs.\n\nTheir reply:\n${creatorReply.slice(0, 500)}`,
    }
    const out = await aiChat({
      maxTokens: 80,
      messages: [{ role: 'user', content: prompts[dealStatus] || prompts.interested }],
    })
    return out.trim() || null
  } catch { return null }
}

/** Extract the plain-text body from a Gmail message payload (recursive parts walk). */
export function extractBody(payload: GmailPart | undefined): string {
  if (!payload) return ''
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  }
  for (const part of payload.parts ?? []) {
    const text = extractBody(part)
    if (text) return text
  }
  return ''
}

/** Strip quoted history ("On ... wrote:" and "> " lines) so we store just the new text. */
export function stripQuoted(body: string): string {
  // Gmail wraps the attribution line, so match it across newlines first.
  const cut = body.split(/\r?\nOn [\s\S]{5,200}? wrote:/)[0] ?? body
  const lines = cut.split('\n')
  const out: string[] = []
  for (const line of lines) {
    if (/^On .{5,80} wrote:\s*$/.test(line.trim())) break
    if (line.trimStart().startsWith('>')) continue
    out.push(line)
  }
  return out.join('\n').trim()
}

export interface GmailPart {
  mimeType?: string
  body?: { data?: string }
  parts?: GmailPart[]
  headers?: { name: string; value: string }[]
}

export async function gmailGet(token: string, path: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

/** Scan Gmail for replies to this owner's tracked sends. */
export async function syncRepliesForOwner(ownerId: string): Promise<ReplySyncResult> {
  const sb = serviceClient()

  const gmail = await accessTokenForUser(ownerId)
  if (!gmail) return { checked: 0, found: 0, skipped: 'no-gmail-token' }

  // Recent sends that haven't been marked replied yet.
  const since = new Date(Date.now() - LOOKBACK_DAYS * 864e5).toISOString()
  const { data: sends } = await sb
    .from('emails_sent')
    .select('id, campaign_id, recipient_email, recipient_type, created_at')
    .eq('user_id', ownerId)
    .eq('status', 'sent')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200)
  if (!sends?.length) return { checked: 0, found: 0, skipped: null }

  // One lookup per unique recipient (their oldest tracked send bounds the search).
  const byRecipient = new Map<string, typeof sends>()
  for (const s of sends) {
    const key = String(s.recipient_email).toLowerCase()
    if (!byRecipient.has(key)) byRecipient.set(key, [])
    byRecipient.get(key)!.push(s)
  }

  let checked = 0
  let found = 0
  for (const [recipient, theirSends] of [...byRecipient].slice(0, MAX_RECIPIENTS_PER_RUN)) {
    checked++

    // One response row per sender — kept current with their latest message.
    const { data: existingRows } = await sb
      .from('responses')
      .select('id, gmail_message_id')
      .eq('user_id', ownerId)
      .ilike('from_email', recipient)
      .limit(1)
    const existing = existingRows?.[0] ?? null

    // Search their inbox messages newer than our first send to this person.
    const oldestSend = theirSends[theirSends.length - 1]
    const afterTs = Math.floor(new Date(oldestSend.created_at as string).getTime() / 1000)
    const q = encodeURIComponent(`from:${recipient} in:inbox after:${afterTs}`)
    const list = await gmailGet(gmail.token, `messages?q=${q}&maxResults=1`)
    const msgs = (list?.messages ?? []) as { id: string }[]
    if (!msgs.length) continue

    // Same message we already recorded — nothing new; don't reset read state.
    if (existing && existing.gmail_message_id === msgs[0].id) continue

    const full = await gmailGet(gmail.token, `messages/${msgs[0].id}?format=full`)
    if (!full) continue
    const payload = full.payload as GmailPart | undefined
    const headers = payload?.headers ?? []
    const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value ?? recipient
    const fromName = fromHeader.replace(/<.*>/, '').replace(/"/g, '').trim() || null
    const body = stripQuoted(extractBody(payload)) || String(full.snippet ?? '')
    if (!body) continue

    const dealStatus = await classifyReply(body)
    const aiSuggestion = await suggestReply(body, dealStatus)
    const newestSend = theirSends[0]

    if (existing) {
      // Newer message from this sender — refresh the row and mark it unread.
      const { error: updErr } = await sb
        .from('responses')
        .update({
          message: body.slice(0, 5000),
          deal_status: dealStatus,
          ai_suggestion: aiSuggestion,
          gmail_message_id: msgs[0].id,
          updated_at: new Date().toISOString(),
          read_at: null,
        })
        .eq('id', existing.id)
      if (updErr) continue
    } else {
      const { error: insErr } = await sb.from('responses').insert({
        campaign_id: newestSend.campaign_id,
        email_id: newestSend.id,
        user_id: ownerId,
        from_email: recipient,
        from_name: fromName,
        message: body.slice(0, 5000),
        recipient_type: newestSend.recipient_type ?? 'creator',
        deal_status: dealStatus,
        ai_suggestion: aiSuggestion,
        gmail_message_id: msgs[0].id,
      })
      if (insErr) continue
    }

    // Mark every tracked send to this person replied — the follow-up cron
    // sees status='replied' and cancels their pending nudges.
    await sb
      .from('emails_sent')
      .update({ status: 'replied', replied_at: new Date().toISOString() })
      .eq('user_id', ownerId)
      .ilike('recipient_email', recipient)
      .eq('status', 'sent')

    found++
  }

  return { checked, found, skipped: null }
}
