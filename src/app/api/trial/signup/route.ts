import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  )
}

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const ip = getClientIp(req)

  // Admin client for IP dedup check and trial recording (bypasses RLS)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if this IP already has an active trial
  const { data: existingTrial } = await admin
    .from('trials')
    .select('id')
    .eq('ip_address', ip)
    .eq('status', 'active')
    .single()

  if (existingTrial) {
    return NextResponse.json(
      { error: 'A free trial has already been activated from your network. Sign in or subscribe to continue.' },
      { status: 409 }
    )
  }

  // Upsert trial record (pending until email verified)
  await admin.from('trials').upsert(
    { ip_address: ip, email, status: 'pending' },
    { onConflict: 'ip_address' }
  )

  // Skip email in dev bypass mode
  if (process.env.DEV_BYPASS_AUTH !== 'true') {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://prov.com'
    const { error: otpError } = await anon.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
        shouldCreateUser: true,
      },
    })

    if (otpError) {
      await admin.from('trials').delete().eq('email', email).eq('ip_address', ip)
      return NextResponse.json({ error: otpError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
