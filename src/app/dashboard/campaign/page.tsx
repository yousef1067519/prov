import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardClient from '../DashboardClient'

export default async function CampaignPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )

  if (process.env.DEV_BYPASS_AUTH === 'true') {
    return <DashboardClient email="dev@prov.com" accessType="lifetime" daysLeft={null} />
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Team members ride the workspace's plan — same membership check as the
  // dashboard, so an invited employee is never bounced to the plan chooser.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder',
    { auth: { persistSession: false } },
  )
  const { data: membership } = await admin
    .from('team_members').select('owner_id').eq('member_user_id', user.id).eq('status', 'active').maybeSingle()
  if (membership) {
    return <DashboardClient email={user.email ?? ''} accessType="member" daysLeft={null} />
  }

  const { data: profile } = await supabase.from('profiles').select('access_type').eq('id', user.id).single()
  const accessType = profile?.access_type ?? 'none'
  if (!['lifetime', 'standard', 'vip'].includes(accessType)) redirect('/plans')

  return <DashboardClient email={user.email ?? ''} accessType={accessType} daysLeft={null} />
}
