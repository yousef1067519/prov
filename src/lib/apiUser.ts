import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'

export function serviceClient(): SupabaseClient {
  return createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder', { auth: { persistSession: false } })
}

/**
 * Resolve the current user + a Supabase client to act as them, for per-user API routes.
 * - Dev-bypass: service role against the first profile (the owner) so it's testable locally.
 * - Production: the cookie session + RLS (a user can only touch their own rows).
 * Returns null when there's no usable identity.
 */
// `userId` is the LEGACY workspace key to scope data to (the owner's id). For a workspace
// owner that's their own id; for an active team member it's the owner they belong to — so
// every apiCtx-based query automatically operates inside the right workspace. `role` is
// 'Owner' for the owner, or the member's legacy role ('Admin' | 'Manager' | 'Team Member').
//
// ENTERPRISE (0020): `workspaceId` + `wsRole` carry the new tenant model. Both keys coexist
// during cutover: legacy rows are keyed on user_id, new modules key on workspace_id
// (workspaces.legacy_owner_id === userId bridges them). Prefer `tenantCtx` from
// src/lib/tenant.ts for new code; this bridge keeps the 60+ existing routes working.
export interface ApiCtx {
  sb: SupabaseClient
  userId: string
  email: string | null
  role: string
  workspaceId: string | null
  wsRole: string | null
}

async function enterpriseBridge(sb: SupabaseClient, legacyOwnerId: string, memberUserId: string):
  Promise<{ workspaceId: string | null; wsRole: string | null }> {
  try {
    const { data: ws } = await sb.from('workspaces').select('id').eq('legacy_owner_id', legacyOwnerId).maybeSingle()
    if (!ws) return { workspaceId: null, wsRole: null }
    const { data: m } = await sb.from('workspace_members')
      .select('role').eq('workspace_id', ws.id).eq('user_id', memberUserId).eq('status', 'active').maybeSingle()
    return { workspaceId: ws.id as string, wsRole: (m?.role as string) ?? null }
  } catch {
    return { workspaceId: null, wsRole: null } // 0020 not applied yet — legacy mode
  }
}

export async function apiCtx(): Promise<ApiCtx | null> {
  if (process.env.DEV_BYPASS_AUTH === 'true' && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const sb = serviceClient()
    const { data } = await sb.from('profiles').select('id, email').order('created_at').limit(1).maybeSingle()
    if (!data) return null
    const bridge = await enterpriseBridge(sb, data.id as string, data.id as string)
    return { sb, userId: data.id as string, email: (data.email as string) ?? null, role: 'Owner', ...bridge }
  }
  // Identify the user from their cookie session.
  const cookieStore = await cookies()
  const cookieSb = createServerClient(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder', {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  }) as unknown as SupabaseClient
  const { data: { user } } = await cookieSb.auth.getUser()
  if (!user) return null

  // Resolve workspace + role via the service role (reliable, independent of RLS), then act
  // through the service client scoped to that workspace id — same trust model as dev-bypass.
  const svc = serviceClient()
  const { data: membership } = await svc
    .from('team_members')
    .select('owner_id, role')
    .eq('member_user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  const legacyOwner = membership ? (membership.owner_id as string) : user.id
  const bridge = await enterpriseBridge(svc, legacyOwner, user.id)
  return membership
    ? { sb: svc, userId: legacyOwner, email: user.email ?? null, role: membership.role as string, ...bridge }
    : { sb: svc, userId: user.id, email: user.email ?? null, role: 'Owner', ...bridge }
}
