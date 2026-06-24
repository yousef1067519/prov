import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const FIELDS = ['agency_name', 'agency_title', 'company_name', 'company_email', 'company_website', 'company_phone', 'company_logo_url'] as const

function client(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

export async function GET() {
  if (process.env.DEV_BYPASS_AUTH === 'true') return NextResponse.json({ profile: null })
  const supabase = client(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ profile: null })
  const { data } = await supabase.from('profiles').select(FIELDS.join(',')).eq('id', user.id).single()
  return NextResponse.json({ profile: data ?? null })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const patch: Record<string, string> = {}
  for (const f of FIELDS) if (typeof body[f] === 'string') patch[f] = body[f]

  if (process.env.DEV_BYPASS_AUTH === 'true') return NextResponse.json({ ok: true, dev: true })
  const supabase = client(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
