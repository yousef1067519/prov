import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { VERTICALS } from '@/lib/verticals'
import ChooseAgencyClient from './ChooseAgencyClient'

export const metadata: Metadata = { title: 'Set up Prov for your agency' }

// First-run vertical picker. The dashboard redirects here when a signed-in user
// hasn't chosen their agency type yet (profiles.agency_type_set = false).
export default async function ChooseAgencyPage() {
  if (process.env.DEV_BYPASS_AUTH !== 'true') {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
  }

  const options = Object.values(VERTICALS).map(v => ({ id: v.id, label: v.label, blurb: v.blurb }))
  return <ChooseAgencyClient options={options} />
}
