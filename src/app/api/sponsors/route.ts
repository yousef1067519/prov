import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Sponsor directory — server-side filtered so it scales past the sample set.
//   GET ?niche=&country=&q=&limit=
export async function GET(req: NextRequest) {
  const niche = req.nextUrl.searchParams.get('niche') || ''
  const country = req.nextUrl.searchParams.get('country') || ''
  const q = req.nextUrl.searchParams.get('q') || ''
  const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 100))

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  let query = supabase.from('sponsors').select('*').order('name')
  // Match the canonical niche column when present, falling back to the
  // human-readable industry label for rows imported before niches existed.
  if (niche) query = query.or(`niche.eq.${niche},industry.ilike.%${niche}%`)
  if (country) query = query.ilike('country', country)
  if (q) query = query.ilike('name', `%${q}%`)

  const { data, error } = await query.limit(limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sponsors: data })
}
