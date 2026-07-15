import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/apiUser'
import { accessTokenForUser } from '@/lib/googleTokens'
import { sendGmail } from '@/lib/google'
import { sendEmail } from '@/lib/resend'
import { unsubscribeFooter } from '@/lib/unsubscribe'
import { randomUUID } from 'crypto'

// Follow-up dispatcher. Hit once daily by Vercel Cron (vercel.json) — Vercel's free
// Hobby tier caps crons at once/day; bump back to hourly ("0 * * * *") once on Pro.
// For each due scheduled email: skip if the recipient replied or unsubscribed,
// otherwise send from the owner's Gmail (server-side refresh token) or Resend fallback.
export async function GET(req: NextRequest) {
  // Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` when the env
  // var is set. Also accept x-cron-secret for manual/local triggering.
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization') ?? ''
  const manual = req.headers.get('x-cron-secret') ?? ''
  if (!secret || (auth !== `Bearer ${secret}` && manual !== secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = serviceClient()
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

  const { data: due, error } = await sb
    .from('scheduled_emails')
    .select('*')
    .eq('status', 'pending')
    .lte('send_at', new Date().toISOString())
    .order('send_at')
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!due?.length) return NextResponse.json({ ok: true, processed: 0 })

  // Cache per-owner transport for the batch.
  const gmailByOwner = new Map<string, { token: string } | null>()

  let sent = 0, cancelled = 0, failed = 0
  for (const row of due) {
    const recipient = String(row.recipient_email).toLowerCase()

    // 1) Cancel if the recipient unsubscribed.
    try {
      const { data: sup } = await sb.from('email_suppressions').select('id').eq('email', recipient).limit(1)
      if (sup?.length) {
        await sb.from('scheduled_emails').update({ status: 'cancelled', fail_reason: 'unsubscribed' }).eq('id', row.id)
        cancelled++; continue
      }
    } catch { /* suppressions table optional */ }

    // 2) Cancel if they already replied (tracked reply or response row).
    try {
      const [{ data: replied }, { data: resp }] = await Promise.all([
        sb.from('emails_sent').select('id').eq('recipient_email', row.recipient_email).eq('status', 'replied').limit(1),
        row.campaign_id
          ? sb.from('responses').select('id').eq('campaign_id', row.campaign_id).ilike('from_email', row.recipient_email).limit(1)
          : Promise.resolve({ data: [] as { id: string }[] }),
      ])
      if (replied?.length || resp?.length) {
        await sb.from('scheduled_emails').update({ status: 'cancelled', fail_reason: 'replied' }).eq('id', row.id)
        cancelled++; continue
      }
    } catch { /* fall through to send */ }

    // 3) Send — owner's Gmail first, Resend fallback.
    const trackingId = randomUUID()
    const fullBody = row.body + '\n' + unsubscribeFooter(origin, trackingId)
    try {
      let transport = 'resend'
      if (row.owner_id) {
        if (!gmailByOwner.has(row.owner_id)) gmailByOwner.set(row.owner_id, await accessTokenForUser(row.owner_id))
        const g = gmailByOwner.get(row.owner_id)
        if (g) { await sendGmail(g.token, row.recipient_email, row.subject, fullBody); transport = 'gmail' }
        else if (process.env.RESEND_API_KEY) await sendEmail({ to: row.recipient_email, subject: row.subject, body: fullBody })
        else throw new Error('no transport (no Gmail token, no RESEND_API_KEY)')
      } else if (process.env.RESEND_API_KEY) {
        await sendEmail({ to: row.recipient_email, subject: row.subject, body: fullBody })
      } else {
        throw new Error('no transport')
      }

      await sb.from('scheduled_emails').update({ status: 'sent', fail_reason: null }).eq('id', row.id)
      try {
        await sb.from('emails_sent').insert({
          campaign_id: row.campaign_id,
          user_id: row.owner_id ?? undefined,
          recipient_email: row.recipient_email,
          recipient_name: row.recipient_name,
          recipient_type: row.recipient_type ?? 'creator',
          subject: row.subject,
          body: fullBody,
          status: 'sent',
          tracking_id: trackingId,
        })
      } catch { /* tracking non-fatal */ }
      sent++
      void transport
    } catch (e) {
      await sb.from('scheduled_emails').update({ status: 'failed', fail_reason: String(e).slice(0, 300) }).eq('id', row.id)
      failed++
    }
  }

  return NextResponse.json({ ok: true, processed: due.length, sent, cancelled, failed })
}
