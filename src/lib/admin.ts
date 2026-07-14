import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'

/** Comma-separated allowlist of admin emails (env ADMIN_EMAILS). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

/** Service-role client — bypasses RLS. Use ONLY inside admin-gated handlers. */
export function serviceClient(): SupabaseClient {
  return createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder', {
    auth: { persistSession: false },
  })
}

/**
 * Returns the admin's email if the current session belongs to an allow-listed admin,
 * otherwise null. This is the single gate for every admin route and the /admin page.
 */
export async function getAdmin(): Promise<string | null> {
  // Dev-only admin bypass — never honored in production, even if the flag leaks.
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_BYPASS_AUTH === 'true') return 'dev-admin'
  const cookieStore = await cookies()
  const sb = createServerClient(
    URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await sb.auth.getUser()
  const email = user?.email?.toLowerCase()
  if (!email) return null
  return adminEmails().includes(email) ? email : null
}
