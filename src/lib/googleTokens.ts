import { serviceClient } from './apiUser'

// Server-side Google refresh tokens (google_tokens table, service-role only).
// This is what lets scheduled follow-ups send from the user's own Gmail hours
// or days later, when no browser session/cookies exist.

export async function saveGoogleRefreshToken(userId: string, email: string | null, refreshToken: string): Promise<boolean> {
  try {
    const { error } = await serviceClient().from('google_tokens').upsert(
      { user_id: userId, email, refresh_token: refreshToken, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    return !error
  } catch { return false }
}

export async function deleteGoogleRefreshToken(userId: string): Promise<void> {
  try { await serviceClient().from('google_tokens').delete().eq('user_id', userId) } catch {}
}

/** Mint a fresh access token for a user from their stored refresh token. */
export async function accessTokenForUser(userId: string): Promise<{ token: string; email: string | null } | null> {
  try {
    const { data } = await serviceClient().from('google_tokens').select('refresh_token, email').eq('user_id', userId).maybeSingle()
    if (!data?.refresh_token) return null
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        refresh_token: data.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    const tok = await res.json()
    if (!tok.access_token) return null
    return { token: tok.access_token, email: (data.email as string) ?? null }
  } catch { return null }
}
