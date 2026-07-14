import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CreatorProfilePanel from '../../CreatorProfilePanel'

export default async function CreatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (process.env.DEV_BYPASS_AUTH === 'true') return <CreatorProfilePanel id={id} />

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <CreatorProfilePanel id={id} />
}
