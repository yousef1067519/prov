// Workspace write-permission check for apiCtx-based routes (§8.3).
// Enterprise roles (0020) win when present; during cutover, workspaces where
// 0020 isn't applied yet fall back to the legacy team roles.
import type { ApiCtx } from './apiUser'

const WS_WRITE_ROLES = new Set(['owner', 'admin', 'account_manager'])
const LEGACY_WRITE_ROLES = new Set(['Owner', 'Admin', 'Manager'])

export function canManageWorkspace(ctx: Pick<ApiCtx, 'role' | 'wsRole'>): boolean {
  if (ctx.wsRole) return WS_WRITE_ROLES.has(ctx.wsRole)
  return LEGACY_WRITE_ROLES.has(ctx.role)
}
