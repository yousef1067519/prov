import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/apiUser'

// POST { email, password, name? } — create a Prov account with a password.
// Uses the admin API with email_confirm so no confirmation email is needed
// (Supabase's built-in mailer is rate-limited and unreliable for this). The
// client signs in with the password immediately after. Access to the app
// still requires a plan, so an unverified email can't reach anything paid.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const email = String(b.email ?? '').trim().toLowerCase()
  const password = String(b.password ?? '')
  const name = String(b.name ?? '').trim().slice(0, 120)

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const svc = serviceClient()
  const { data, error } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: name ? { full_name: name } : undefined,
  })

  if (error) {
    const msg = /already|exists|registered/i.test(error.message)
      ? 'An account with that email already exists — sign in instead.'
      : error.message
    return NextResponse.json({ error: msg }, { status: 409 })
  }

  // The on_auth_user_created trigger inserts the profile row; stamp the name on it too.
  if (data?.user?.id && name) {
    await svc.from('profiles').update({ full_name: name }).eq('id', data.user.id).then(() => {}, () => {})
  }

  return NextResponse.json({ ok: true })
}
