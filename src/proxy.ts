import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/dashboard', '/search']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
    {
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
    const { data: profile } = await supabase.from('profiles').select('access_type').eq('id', user.id).single()
    const provisioned = ['lifetime', 'standard', 'vip'].includes(profile?.access_type ?? 'none')
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
    if (!hasAccess) {
      const url = request.nextUrl.clone()
      url.pathname = '/demo'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
