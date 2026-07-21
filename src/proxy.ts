import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/dashboard', '/search']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
    {
      // ~1 year so refreshed session cookies persist across browser closes.
      cookieOptions: { maxAge: 60 * 60 * 24 * 365 },
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Skip auth check in dev bypass mode
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED.some(r => request.nextUrl.pathname.startsWith(r))
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // ENTERPRISE (§8.1): accounts are admin-provisioned, not self-served. Access =
  // a provisioned profile (access_type set by ops) OR membership in a workspace
  // (team members carry no access_type of their own). No trial/paywall gating.
  if (isProtected && user) {
    // Fetch access_type + comp_until. Defensive: if comp_until doesn't exist yet
    // (pre-migration), the first select errors, so we fall back to access_type only
    // and never deny access because of a missing column.
    let accessType = 'none'
    let compExpired = false
    const r1 = await supabase.from('profiles').select('access_type, comp_until').eq('id', user.id).maybeSingle()
    if (r1.error) {
      const r2 = await supabase.from('profiles').select('access_type').eq('id', user.id).maybeSingle()
      accessType = (r2.data?.access_type as string) ?? 'none'
    } else {
      accessType = (r1.data?.access_type as string) ?? 'none'
      const cu = r1.data?.comp_until as string | null | undefined
      if (cu && new Date(cu) < new Date()) compExpired = true // comp grant lapsed
    }
    // trial/starter/solo are the self-serve credit tiers; trial expiry is enforced
    // at the send route (credits), not here — the dashboard stays accessible.
    const provisioned = !compExpired && ['lifetime', 'standard', 'vip', 'solo', 'starter', 'trial'].includes(accessType)
    let hasAccess = provisioned
    if (!hasAccess) {
      // workspace_members read is allowed to the member themselves via the
      // security-definer helper in 0020 (legacy team_members RLS is owner-only).
      try {
        const { data: membership } = await supabase
          .from('workspace_members').select('id').eq('user_id', user.id).eq('status', 'active').limit(1).maybeSingle()
        hasAccess = Boolean(membership)
      } catch { /* 0020 not applied yet — fall through to /demo */ }
    }
    if (!hasAccess && user.email && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Invited team members ride the workspace's plan — they never pay. A fresh
      // signup's invite is still unlinked (team_members.member_user_id is null), and
      // legacy RLS is owner-only, so link + check it here with the service role
      // BEFORE deciding they have no access. Runs only on the no-access path.
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const svc = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { persistSession: false } },
        )
        // Claim any pending invites for this email…
        const { data: linked } = await svc.from('team_members')
          .update({ member_user_id: user.id, status: 'active' })
          .ilike('member_email', user.email)
          .is('member_user_id', null)
          .select('id')
        // …or find an already-linked active membership.
        if (linked?.length) hasAccess = true
        else {
          const { data: existing } = await svc.from('team_members')
            .select('id').eq('member_user_id', user.id).eq('status', 'active').limit(1).maybeSingle()
          hasAccess = Boolean(existing)
        }
      } catch { /* stay no-access */ }
    }
    if (!hasAccess) {
      // No plan yet → the plan chooser (they stay signed in; subscribing unlocks the app).
      const url = request.nextUrl.clone()
      url.pathname = '/plans'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
