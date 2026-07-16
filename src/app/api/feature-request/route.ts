import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { sendEmail } from '@/lib/resend'

// POST { request } — an agency asks for a feature. Emails the support inbox and
// records it as a support ticket so nothing is lost if email delivery hiccups.
// Reuses support_tickets (metadata.source = 'feature_request') — no new table.
export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  const text = String(b.request ?? '').trim().slice(0, 2000)
  if (!text) return NextResponse.json({ error: 'Tell us what you’d like Prov to do.' }, { status: 400 })

  // Store first — the record is the source of truth even if the email fails.
  let ticketId: string | null = null
  try {
    const { data } = await ctx.sb.from('support_tickets').insert({
      user_id: ctx.userId,
      message: `FEATURE REQUEST\n\n${text}`,
      priority: 'low',
      metadata: { source: 'feature_request', from: ctx.email },
    }).select('id').single()
    ticketId = data?.id ?? null
  } catch (e) {
    console.error('feature request insert failed:', (e as Error).message)
  }

  // Notify the team. Non-fatal: the request is already saved above.
  try {
    await sendEmail({
      to: process.env.SUPPORT_INBOX ?? 'providemediabrands@gmail.com',
      subject: `Feature request from ${ctx.email ?? 'a customer'}`,
      body:
        `${ctx.email ?? 'Unknown user'} asked for:\n\n${text}\n\n` +
        `— User ID: ${ctx.userId}${ticketId ? `\n— Ticket: ${ticketId}` : ''}\n` +
        `Reply straight to them at ${ctx.email ?? '(no email on file)'}.`,
      ...(ctx.email ? { replyTo: ctx.email } : {}),
    })
  } catch (e) {
    console.error('feature request email failed:', (e as Error).message)
    if (!ticketId) {
      return NextResponse.json({ error: 'Could not send your request — please try again.' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
