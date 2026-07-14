import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { saveGoogleRefreshToken } from '@/lib/googleTokens'

// Step 2 — Google redirects back here with ?code. Exchange it for tokens,
// fetch the connected account's email, and store the connection.
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin
  const code = req.nextUrl.searchParams.get('code')
  const settings = `${origin}/dashboard/settings`
  if (!code) return NextResponse.redirect(`${settings}?google=error`)

  const redirectUri = `${origin}/api/integrations/google/callback`
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokens.access_token) return NextResponse.redirect(`${settings}?google=error`)

    const uiRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const profile = await uiRes.json()

    // Persist the refresh token server-side so scheduled follow-ups can send
    // from this Gmail later without a browser session (cron has no cookies).
    if (tokens.refresh_token) {
      try {
        const ctx = await apiCtx()
        if (ctx) await saveGoogleRefreshToken(ctx.userId, profile.email ?? null, tokens.refresh_token)
      } catch { /* non-fatal — cookie transport still works for live sends */ }
    }

    const res = NextResponse.redirect(`${settings}?google=connected`)
    // Readable cookie for the UI; tokens kept httpOnly. (For production, store
    // tokens encrypted in the integrations table instead of a cookie.)
    res.cookies.set('prov_google_email', profile.email ?? '', { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })
    res.cookies.set('prov_google_tokens', JSON.stringify({
      access: tokens.access_token,
      refresh: tokens.refresh_token ?? null,
      expiry: Date.now() + (tokens.expires_in ?? 3600) * 1000,
    }), { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })
    return res
  } catch {
    return NextResponse.redirect(`${settings}?google=error`)
  }
}
