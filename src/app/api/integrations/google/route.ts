import { NextRequest, NextResponse } from 'next/server'

// Step 1 of Google OAuth — redirect the user to Google's consent screen.
export async function GET(req: NextRequest) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(`${req.nextUrl.origin}/dashboard/settings?google=unconfigured`)
  }
  const redirectUri = `${req.nextUrl.origin}/api/integrations/google/callback`
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    // gmail.readonly powers Reply Radar (detecting replies to outreach).
    scope: 'openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly',
  })
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
}
