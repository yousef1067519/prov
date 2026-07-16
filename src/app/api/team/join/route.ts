import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { serviceClient } from '@/lib/apiUser'

// POST — redeem a one-time team invite code from /join.
//   { code }                          → signed-in user: link them to the workspace.
//   { code, name?, email, password }  → new person: create the account, then link.
// The code is the linking key (signup email need not match the invite email) and
// is cleared on success — strictly single-use.

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const code = String(b.code ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (code.length < 6) return NextResponse.json({ error: 'Enter your invite code.' }, { status: 400 })

  const svc = serviceClient()
  const { data: invite } = await svc.from('team_members')
    .select('id, owner_id, member_email, role')
    .eq('invite_code', code)
    .is('member_user_id', null)
    .neq('status', 'removed')
    .maybeSingle()
  if (!invite) {
    return NextResponse.json({ error: 'That code is invalid or was already used. Ask your manager to re-invite you.' }, { status: 404 })
  }

  // Who is redeeming? Prefer the signed-in session; otherwise create the account.
  const cookieStore = await cookies()
  const sb = createServerClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder', {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  })
  const { data: { user: sessionUser } } = await sb.auth.getUser()

  let userId = sessionUser?.id ?? null
  let created = false

  if (!userId) {
    const email = String(b.email ?? '').trim().toLowerCase()
    const password = String(b.password ?? '')
    const name = String(b.name ?? '').trim().slice(0, 120)
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.', needsAccount: true }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.', needsAccount: true }, { status: 400 })
    }
    const { data: createdUser, error: createErr } = await svc.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: name ? { full_name: name } : undefined,
    })
    if (createErr) {
      const exists = /already|exists|registered/i.test(createErr.message)
      return NextResponse.json({
        error: exists
          ? 'An account with that email already exists — sign in first, then enter your code.'
          : createErr.message,
        needsAccount: true,
      }, { status: 409 })
    }
    userId = createdUser.user.id
    created = true
  }

  // Link the membership and burn the code.
  const { error: linkErr } = await svc.from('team_members')
    .update({ member_user_id: userId, status: 'active', invite_code: null })
    .eq('id', invite.id)
    .is('member_user_id', null) // guard against a concurrent redeem
  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, created, role: invite.role })
}
