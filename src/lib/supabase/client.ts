'use client'
import { createBrowserClient } from '@supabase/ssr'

// maxAge ~1 year so the auth cookies persist across browser closes (users stay
// signed in on their device). Without an explicit maxAge these are session
// cookies that die when the browser is closed.
const ONE_YEAR = 60 * 60 * 24 * 365

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
    { cookieOptions: { maxAge: ONE_YEAR } },
  )
}
