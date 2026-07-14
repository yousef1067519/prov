import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Returns a Supabase client for reading the shared creators catalog.
// - Dev-bypass (no logged-in user): use the service role so RLS doesn't hide
//   everything while testing locally.
// - Production: use the anon client bound to the request's auth cookies, so the
//   creators RLS policy applies (only active subscribers can read).
export async function creatorsReadClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
  if (process.env.DEV_BYPASS_AUTH === 'true' && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  }
  const cookieStore = await cookies()
  return createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } })
}
