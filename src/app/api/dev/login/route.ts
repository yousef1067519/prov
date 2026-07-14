import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { serviceClient } from '@/lib/apiUser'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'

// DEV ONLY (gated by SHOW_LOGIN_CODE): GET /api/dev/login?email=... — top-level navigation
// that mints a session and sets the cookies ON the redirect response, then lands on /dashboard.
export async function GET(req: NextRequest) {
  // Hard block in production — this route mints a session for ANY email, so it
  // must never be reachable on the live site even if SHOW_LOGIN_CODE is set.
  if (process.env.NODE_ENV === 'production' || process.env.SHOW_LOGIN_CODE !== 'true') {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  const email = (req.nextUrl.searchParams.get('email') ?? '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.redirect(new URL('/devlogin?error=email', req.url))
  }

  // Generate a one-time code without sending an email (creates the user if new).
  const svc = serviceClient()
  let gen = await svc.auth.admin.generateLink({ type: 'magiclink', email })
  let type: 'email' | 'signup' = 'email'
  if (gen.error) {
    gen = await svc.auth.admin.generateLink({ type: 'signup', email, password: crypto.randomUUID() })
    type = 'signup'
  }
  const otp = gen.data?.properties?.email_otp
  if (gen.error || !otp) return NextResponse.redirect(new URL('/devlogin?error=create', req.url))

  // Give the (possibly brand-new) user an active trial + profile so they land in
  // onboarding instead of being bounced to the paywall.
  const userId = gen.data?.user?.id
  if (userId) {
    await svc.from('profiles').upsert(
      { id: userId, email, access_type: 'trial', trial_end: new Date(Date.now() + 10 * 864e5).toISOString() },
      { onConflict: 'id' },
    ).then(() => {}, () => {})
  }

  // Set the session cookies directly on the redirect response (secure:false for http localhost).
  const response = NextResponse.redirect(new URL('/dashboard', req.url))
  const sb = createServerClient(URL_, ANON, {
    cookies: {
      getAll() { return req.cookies.getAll() },
      setAll(list) { list.forEach(({ name, value, options }) => response.cookies.set(name, value, { ...options, secure: false })) },
    },
  })
  let { error } = await sb.auth.verifyOtp({ email, token: otp, type })
  if (error) ({ error } = await sb.auth.verifyOtp({ email, token: otp, type: type === 'signup' ? 'email' : 'signup' }))
  if (error) return NextResponse.redirect(new URL('/devlogin?error=verify', req.url))

  return response
}
