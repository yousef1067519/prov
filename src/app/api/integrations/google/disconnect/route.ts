import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(`${req.nextUrl.origin}/dashboard/settings?google=disconnected`)
  res.cookies.set('prov_google_email', '', { path: '/', maxAge: 0 })
  res.cookies.set('prov_google_tokens', '', { path: '/', maxAge: 0 })
  return res
}
