import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const niche = req.nextUrl.searchParams.get('niche') || ''

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  let query = supabase.from('sponsors').select('*').order('name')
  if (niche) query = query.ilike('industry', `%${niche}%`)

  const { data, error } = await query.limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sponsors: data })
}
