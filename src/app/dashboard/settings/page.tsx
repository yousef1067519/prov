import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import SettingsPanel from '../SettingsPanel'

export default async function SettingsPage() {
  if (process.env.DEV_BYPASS_AUTH === 'true') return <SettingsPanel email="dev@prov.com" accessType="lifetime" daysLeft={null} />

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <SettingsPanel email={user.email ?? ''} accessType="lifetime" daysLeft={null} />
}
