import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/apiUser'

// Records an opt-out from an outreach email's tracking_id, then redirects to a
// confirmation page. No recipient PII in the URL — the token resolves to it.
export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t')
  const done = (state: string) => NextResponse.redirect(new URL(`/unsubscribe?state=${state}`, req.url))
  if (!t) return done('invalid')

  try {
    const sb = serviceClient()
    const { data: sent } = await sb.from('emails_sent')
      .select('recipient_email, campaign_id')
      .eq('tracking_id', t)
      .maybeSingle()
    if (!sent?.recipient_email) return done('invalid')

    // Resolve the workspace owner from the campaign so the opt-out is scoped.
    let ownerId: string | null = null
    if (sent.campaign_id) {
      const { data: camp } = await sb.from('campaigns').select('user_id').eq('id', sent.campaign_id).maybeSingle()
      ownerId = (camp?.user_id as string) ?? null
    }
    if (!ownerId) return done('invalid')

    await sb.from('email_suppressions').upsert(
      { owner_id: ownerId, email: String(sent.recipient_email).toLowerCase(), reason: 'unsubscribe' },
      { onConflict: 'owner_id,email' },
    )
    return done('done')
  } catch {
    return done('error')
  }
}
