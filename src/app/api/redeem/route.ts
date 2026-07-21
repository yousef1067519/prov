import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { serviceClient } from '@/lib/apiUser'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'

// Redeem a comp code -> grants free access for the code's plan + days.
// Single-use: the code is claimed atomically (update ... where used_by is null),
// so two people can never redeem the same code.
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const cookieSb = createServerClient(URL, ANON, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  })
  const { data: { user } } = await cookieSb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in first, then enter your code.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const code = String(body.code ?? '').trim().toUpperCase()
  if (!code) return NextResponse.json({ error: 'Enter a code.' }, { status: 400 })

  const svc = serviceClient()
  // Atomic single-use claim.
  const { data: claimed, error } = await svc
    .from('redemption_codes')
    .update({ used_by: user.id, used_at: new Date().toISOString() })
    .eq('code', code)
    .is('used_by', null)
    .select('plan, days')
    .maybeSingle()

  if (error || !claimed) {
    return NextResponse.json({ error: 'That code is invalid or has already been used.' }, { status: 400 })
  }

  const compUntil = new Date(Date.now() + claimed.days * 864e5).toISOString()
  const { error: upErr } = await svc
    .from('profiles')
    .update({ access_type: claimed.plan, comp_until: compUntil })
    .eq('id', user.id)
  if (upErr) return NextResponse.json({ error: 'Could not apply the code — try again.' }, { status: 500 })

  return NextResponse.json({ ok: true, days: claimed.days })
}
