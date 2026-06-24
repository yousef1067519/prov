import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  if (process.env.DEV_BYPASS_AUTH === 'true') {
    const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ campaigns: data ?? [] })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('campaigns').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaigns: data ?? [] })
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const body = await req.json()
  const { name, niche, creator_ids, sponsor_ids } = body

  let userId = 'dev-user'
  if (process.env.DEV_BYPASS_AUTH !== 'true') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    userId = user.id
  }

  const { data, error } = await supabase.from('campaigns').insert({
    user_id: userId, name, niche,
    creator_ids: creator_ids ?? [],
    sponsor_ids: sponsor_ids ?? [],
    status: 'draft',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaign: data })
}
