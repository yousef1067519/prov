import { createServerClient } from '@supabase/ssr'
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

  // ENTERPRISE (§8.1): admin-provisioned access only — no trial gating.
  const { data: profile } = await supabase.from('profiles').select('access_type').eq('id', user.id).single()
  const accessType = profile?.access_type ?? 'none'
  if (!['lifetime', 'standard', 'vip'].includes(accessType)) redirect('/?plan=required#pricing')

  return <DashboardClient email={user.email ?? ''} accessType={accessType} daysLeft={null} />
}
