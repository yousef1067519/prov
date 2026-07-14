// Enterprise tenant context (§8.1). Resolves the caller's workspace, role,
// and per-client visibility on top of the 0020 multi-tenant schema.
//
// RLS is the source of truth for row access; this module is the API-layer
// mirror of the same rules (role_in_workspace / visible_client_ids) so route
// handlers can fail fast with 403s and scope service-role queries correctly.
import type { SupabaseClient } from '@supabase/supabase-js'

export type WorkspaceRole = 'owner' | 'admin' | 'account_manager' | 'analyst' | 'client_viewer'

export interface TenantCtx {
  userId: string
  email: string | null
  workspaceId: string
  orgId: string
  role: WorkspaceRole
  /** null = all clients visible (working roles); array = granted subset (client_viewer). */
  clientScope: string[] | null
  /** Legacy user_id this workspace bridges (rows keyed on user_id pre-0020). */
  legacyOwnerId: string | null
}

const WRITE_ROLES: WorkspaceRole[] = ['owner', 'admin', 'account_manager']

/**
 * Resolve tenant context for a user. `workspaceId` optionally selects among
 * the user's workspaces (multi-workspace users); defaults to the first active
 * membership (owner memberships preferred).
 */
export async function tenantCtx(
  svc: SupabaseClient,
  userId: string,
  email: string | null,
  workspaceId?: string | null,
): Promise<TenantCtx | null> {
  let q = svc
    .from('workspace_members')
    .select('id, workspace_id, role, workspaces!inner(org_id, legacy_owner_id)')
    .eq('user_id', userId)
    .eq('status', 'active')
  if (workspaceId) q = q.eq('workspace_id', workspaceId)
  const { data: memberships } = await q

  if (!memberships?.length) return null
  const m = [...memberships].sort(a => (a.role === 'owner' ? -1 : 1))[0]
  const ws = m.workspaces as unknown as { org_id: string; legacy_owner_id: string | null }

  let clientScope: string[] | null = null
  if (m.role === 'client_viewer') {
    const { data: grants } = await svc
      .from('member_client_access').select('client_id').eq('member_id', m.id)
    clientScope = (grants ?? []).map(g => g.client_id as string)
  }

  return {
    userId, email,
    workspaceId: m.workspace_id as string,
    orgId: ws.org_id,
    role: m.role as WorkspaceRole,
    clientScope,
    legacyOwnerId: ws.legacy_owner_id,
  }
}

export function canWrite(ctx: Pick<TenantCtx, 'role'>): boolean {
  return WRITE_ROLES.includes(ctx.role)
}

/** Throws a Response-shaped error object routes can return directly. */
export function requireRole(ctx: TenantCtx, ...roles: WorkspaceRole[]): void {
  if (!roles.includes(ctx.role)) {
    throw Object.assign(new Error('FORBIDDEN'), { status: 403, role: ctx.role })
  }
}

/** Append an audit_log row. Never throws — auditing must not break the action. */
export async function audit(
  svc: SupabaseClient,
  ctx: Pick<TenantCtx, 'workspaceId' | 'userId' | 'email'>,
  action: string,
  entityType: string,
  entityId?: string | null,
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    await svc.from('audit_log').insert({
      workspace_id: ctx.workspaceId,
      actor_user_id: ctx.userId,
      actor_email: ctx.email,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      meta,
    })
  } catch (e) {
    console.error('audit_log insert failed:', (e as Error).message)
  }
}
