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

export async function GET() {
  const supabase = client(await cookies())
  let q = supabase.from('invoices').select('*').order('created_at', { ascending: false })
  if (process.env.DEV_BYPASS_AUTH !== 'true') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    q = q.eq('user_id', user.id)
  }
  const { data, error } = await q
  if (error) return NextResponse.json({ invoices: [], error: error.message })
  return NextResponse.json({ invoices: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = client(await cookies())
  let userId = 'dev-user'
  if (process.env.DEV_BYPASS_AUTH !== 'true') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    userId = user.id
  }
  const b = await req.json()
  const { data, error } = await supabase.from('invoices').insert({
    user_id: userId, number: b.number ?? null, brand_name: b.brand_name ?? null,
    amount: b.amount ?? 0, status: b.status ?? 'draft', due_date: b.due_date ?? null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoice: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = client(await cookies())
  const { id, ...patch } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data, error } = await supabase.from('invoices').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoice: data })
}
