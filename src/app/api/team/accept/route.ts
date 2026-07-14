import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { serviceClient } from '@/lib/apiUser'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'

// POST — called when a user opens the dashboard. If their email matches a pending invite,
// link their auth user to it and activate the membership (so they join the workspace).
export async function POST() {
  if (process.env.DEV_BYPASS_AUTH === 'true') return NextResponse.json({ accepted: 0 })

  const cookieStore = await cookies()
  const sb = createServerClient(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder', {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  })
  const { data: { user } } = await sb.auth.getUser()
  if (!user?.email) return NextResponse.json({ accepted: 0 })

  // Service role: link any unclaimed invite(s) for this email to this user, mark active.
  const { data } = await serviceClient()
    .from('team_members')
    .update({ member_user_id: user.id, status: 'active' })
    .eq('member_email', user.email.toLowerCase())
    .is('member_user_id', null)
    .select('id, owner_id')
  return NextResponse.json({ accepted: data?.length ?? 0 })
}
