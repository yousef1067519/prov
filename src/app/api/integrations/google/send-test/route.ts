import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getGoogleAccess, sendGmail } from '@/lib/google'

// Sends a real test email FROM the connected Gmail account, TO that same address.
export async function POST() {
  const store = await cookies()
  const email = store.get('prov_google_email')?.value
  if (!email) return NextResponse.json({ error: 'Connect Google first.' }, { status: 400 })

  const acc = await getGoogleAccess()
  if (!acc) return NextResponse.json({ error: 'Connect Google first.' }, { status: 400 })

  try {
    await sendGmail(acc.token, email, 'Prov test email', 'This is a test from Prov. Gmail sending is connected and working.')
    const res = NextResponse.json({ ok: true })
    if (acc.refreshedCookie) {
      res.cookies.set('prov_google_tokens', acc.refreshedCookie, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })
    }
    return res
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e)
    // Turn the raw Gmail API error into a clear, actionable message.
    let hint = 'Gmail send failed.'
    if (/has not been used|is disabled|accessNotConfigured|SERVICE_DISABLED/i.test(raw)) {
      hint = 'The Gmail API is not enabled for your Google Cloud project. Enable it, wait a minute, then try again.'
    } else if (/insufficient|scope|ACCESS_TOKEN_SCOPE|403/i.test(raw)) {
      hint = 'Your Google connection is missing the send permission. Disconnect and reconnect Google to grant it.'
    } else if (/invalid_grant|401|unauthorized/i.test(raw)) {
      hint = 'Your Google session expired. Disconnect and reconnect Google.'
    }
    return NextResponse.json({ error: hint, detail: raw }, { status: 502 })
  }
}
