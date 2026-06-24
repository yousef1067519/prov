import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const body = await req.json()
  const { campaign_id, emails } = body
  // emails: Array<{ to, subject, body, recipient_type: 'creator'|'sponsor' }>

  if (!emails?.length) {
    return NextResponse.json({ error: 'No emails to send' }, { status: 400 })
  }

  const results = []
  for (const email of emails) {
    const tracking_id = randomUUID()
    try {
      // Simulate sends in dev when no Resend key is configured
      if (process.env.RESEND_API_KEY) {
        await sendEmail({ to: email.to, subject: email.subject, body: email.body })
      }

      // Track the send — non-fatal: a tracking failure shouldn't fail the send
      let id: string | undefined
      try {
        const { data } = await supabase.from('emails_sent').insert({
          campaign_id,
          recipient_email: email.to,
          recipient_type: email.recipient_type ?? 'creator',
          subject: email.subject,
          body: email.body,
          status: 'sent',
          tracking_id,
        }).select().single()
        id = data?.id
      } catch {
        // tracking row failed (e.g. no campaign in dev) — send still succeeded
      }

      results.push({ email: email.to, status: 'sent', id })
    } catch (err) {
      results.push({ email: email.to, status: 'error', error: String(err) })
    }
  }

  return NextResponse.json({ results })
}
