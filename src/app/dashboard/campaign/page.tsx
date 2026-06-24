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

  const { data: profile } = await supabase.from('profiles').select('access_type, trial_end').eq('id', user.id).single()
  const accessType = profile?.access_type ?? 'none'
  const trialEnd = profile?.trial_end ? new Date(profile.trial_end) : null
  const now = new Date()
  const hasAccess = accessType === 'lifetime' || (accessType === 'trial' && trialEnd && trialEnd > now)
  if (!hasAccess) redirect('/trial')
  const daysLeft = accessType === 'trial' && trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000)) : null

  return <DashboardClient email={user.email ?? ''} accessType={accessType} daysLeft={daysLeft} />
}
