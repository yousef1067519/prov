import { cookies } from 'next/headers'

interface Tokens { access: string; refresh: string | null; expiry: number }

/** Returns a valid Google access token, refreshing it if expired. */
export async function getGoogleAccess(): Promise<{ token: string; refreshedCookie?: string } | null> {
  const store = await cookies()
  const raw = store.get('prov_google_tokens')?.value
  if (!raw) return null
  let t: Tokens
  try { t = JSON.parse(raw) } catch { return null }

  // Still valid (60s buffer).
  if (Date.now() < t.expiry - 60_000) return { token: t.access }

  // Expired — refresh.
  if (!t.refresh) return { token: t.access }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: t.refresh,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) return { token: t.access }
  const next: Tokens = { access: data.access_token, refresh: t.refresh, expiry: Date.now() + (data.expires_in ?? 3600) * 1000 }
  return { token: data.access_token, refreshedCookie: JSON.stringify(next) }
}

/** Sends a plain-text email from the connected Gmail account. */
export async function sendGmail(access: string, to: string, subject: string, body: string) {
  const mime = [`To: ${to}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset=UTF-8', '', body].join('\r\n')
  const rawMsg = Buffer.from(mime).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: rawMsg }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    // Surface the real reason (disabled API vs missing scope vs quota) to the caller.
    const err = new Error(`Gmail API ${res.status}: ${detail.slice(0, 400)}`)
    ;(err as Error & { status?: number }).status = res.status
    throw err
  }
  return res.json()
}
