import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardHome from './DashboardHome'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  // Dev bypass — set DEV_BYPASS_AUTH=true in .env.local to skip auth
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    return <DashboardHome email="dev@prov.com" accessType="lifetime" daysLeft={null} />
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Workspace members (they joined someone else's account) get access via that workspace —
  // they don't need their own trial. Checked with the service role so RLS can't hide it.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder',
    { auth: { persistSession: false } },
  )
  const { data: membership } = await admin
    .from('team_members')
    .select('owner_id')
    .eq('member_user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (membership) {
    return <DashboardHome email={user.email ?? ''} accessType="member" daysLeft={null} />
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('access_type, trial_end')
    .eq('id', user.id)
    .single()

  // No active plan → the plan chooser (they stay signed in; subscribing unlocks the app).
  const accessType = profile?.access_type ?? 'none'
  if (!['lifetime', 'standard', 'vip'].includes(accessType)) redirect('/plans')

  // NOTE: the agency-type question now lives on the public front screen (first
  // visit to prov.agency → AgencyIntro → /for/<vertical>), not here. The dashboard
  // no longer gates on it.

  return <DashboardHome email={user.email ?? ''} accessType={accessType} daysLeft={null} />
}
