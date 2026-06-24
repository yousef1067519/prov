import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import TemplatesLibrary from '../TemplatesLibrary'

export default async function TemplatesPage() {
  if (process.env.DEV_BYPASS_AUTH === 'true') return <TemplatesLibrary email="dev@prov.com" accessType="lifetime" daysLeft={null} />

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <TemplatesLibrary email={user.email ?? ''} accessType="lifetime" daysLeft={null} />
}
