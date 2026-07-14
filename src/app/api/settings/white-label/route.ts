import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'

// Resolve the current user + a client to read/write their profile.
// Dev-bypass: use the service role against the first profile (the owner) so it's testable
// on localhost; production: the cookie session + RLS (a user can only touch their own row).
async function ctx(): Promise<{ sb: SupabaseClient; userId: string } | null> {
  if (process.env.DEV_BYPASS_AUTH === 'true' && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const sb = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data } = await sb.from('profiles').select('id').order('created_at').limit(1).maybeSingle()
    return data ? { sb, userId: data.id } : null
  }
  const cookieStore = await cookies()
  const sb = createServerClient(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder', {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  }) as unknown as SupabaseClient
  const { data: { user } } = await sb.auth.getUser()
  return user ? { sb, userId: user.id } : null
}

const DEFAULT = { enabled: false, name: 'Prov', logo: '', primary: '#FFD700', accent: '#CA8A04', footer: '', domain: '' }
const str = (v: unknown, max = 2_000_000) => (typeof v === 'string' ? v.slice(0, max) : '')

type ProfileWL = {
  white_label_enabled?: boolean | null
  white_label_name?: string | null
  white_label_logo_url?: string | null
  white_label_colors?: { primary?: string; accent?: string } | null
  white_label_footer?: string | null
  white_label_domain?: string | null
}

function toWhiteLabel(row: ProfileWL | null) {
  if (!row) return DEFAULT
  const colors = row.white_label_colors ?? {}
  return {
    enabled: !!row.white_label_enabled,
    name: row.white_label_name || 'Prov',
    logo: row.white_label_logo_url || '',
    primary: colors.primary || '#FFD700',
    accent: colors.accent || '#CA8A04',
    footer: row.white_label_footer || '',
    domain: row.white_label_domain || '',
  }
}

const COLS = 'white_label_enabled, white_label_name, white_label_logo_url, white_label_colors, white_label_footer, white_label_domain'

export async function GET() {
  const c = await ctx()
  if (!c) return NextResponse.json({ whiteLabel: DEFAULT, error: 'Unauthorized' }, { status: 401 })
  const { data } = await c.sb.from('profiles').select(COLS).eq('id', c.userId).maybeSingle()
  return NextResponse.json({ whiteLabel: toWhiteLabel(data as ProfileWL) })
}

export async function POST(req: NextRequest) {
  const c = await ctx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const wl = await req.json().catch(() => ({}))
  const patch = {
    white_label_enabled: !!wl.enabled,
    white_label_name: str(wl.name, 120),
    white_label_logo_url: str(wl.logo),            // data URL (UI caps at 1MB); move to Storage later
    white_label_colors: { primary: str(wl.primary, 9) || '#FFD700', accent: str(wl.accent, 9) || '#CA8A04' },
    white_label_footer: str(wl.footer, 300),
    white_label_domain: str(wl.domain, 200),
    updated_at: new Date().toISOString(),
  }
  const { error } = await c.sb.from('profiles').update(patch).eq('id', c.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, whiteLabel: toWhiteLabel(patch as ProfileWL) })
}
