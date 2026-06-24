import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function client(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

async function uid(supabase: ReturnType<typeof client>) {
  if (process.env.DEV_BYPASS_AUTH === 'true') return 'dev-user'
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET() {
  const supabase = client(await cookies())
  let q = supabase.from('brands').select('*').order('created_at', { ascending: false })
  if (process.env.DEV_BYPASS_AUTH !== 'true') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    q = q.eq('user_id', user.id)
  }
  const { data, error } = await q
  if (error) return NextResponse.json({ brands: [], error: error.message })
  return NextResponse.json({ brands: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = client(await cookies())
  const userId = await uid(supabase)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json()
  const { data, error } = await supabase.from('brands').insert({
    user_id: userId, company: b.company, contact_name: b.contact_name ?? null,
    email: b.email ?? null, phone: b.phone ?? null, website: b.website ?? null,
    budget_range: b.budget_range ?? null, stage: b.stage ?? 'Prospect',
    notes: b.notes ?? null, last_contact: b.last_contact ?? null, next_followup: b.next_followup ?? null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ brand: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = client(await cookies())
  const { id, ...patch } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data, error } = await supabase.from('brands').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ brand: data })
}
