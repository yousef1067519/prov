import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { audit } from '@/lib/tenant'

// §8.9 enterprise RBAC: workspace_members roles + per-client grants.
// Role changes and grants are owner/admin only and always audited.
const ADMIN_ROLES = ['owner', 'admin']
const VALID_ROLES = ['owner', 'admin', 'account_manager', 'analyst', 'client_viewer']

export async function GET() {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ members: [], clients: [] })

  const [{ data: members }, { data: clients }, { data: grants }] = await Promise.all([
    ctx.sb.from('workspace_members')
      .select('id, user_id, invited_email, role, status, created_at')
      .eq('workspace_id', ctx.workspaceId).neq('status', 'revoked').order('created_at'),
    ctx.sb.from('clients').select('id, name').eq('workspace_id', ctx.workspaceId).order('name'),
    ctx.sb.from('member_client_access').select('member_id, client_id'),
  ])
  const grantMap: Record<string, string[]> = {}
  for (const g of grants ?? []) (grantMap[g.member_id] ??= []).push(g.client_id)
  return NextResponse.json({
    members: (members ?? []).map(m => ({ ...m, client_ids: grantMap[m.id] ?? [] })),
    clients: clients ?? [],
    myRole: ctx.wsRole,
  })
}

// PUT { member_id, role } — change a member's role.
export async function PUT(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (ctx.wsRole && !ADMIN_ROLES.includes(ctx.wsRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  if (!b.member_id || !VALID_ROLES.includes(b.role)) {
    return NextResponse.json({ error: 'member_id and a valid role are required' }, { status: 400 })
  }
  const { data: target } = await ctx.sb.from('workspace_members')
    .select('id, role, invited_email, user_id').eq('id', b.member_id).eq('workspace_id', ctx.workspaceId).maybeSingle()
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (target.role === 'owner') {
    // The last owner must never lose owner — count owners first.
    const { count } = await ctx.sb.from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', ctx.workspaceId).eq('role', 'owner').eq('status', 'active')
    if ((count ?? 0) <= 1 && b.role !== 'owner') {
      return NextResponse.json({ error: 'A workspace must keep at least one owner' }, { status: 409 })
    }
  }
  const { error } = await ctx.sb.from('workspace_members').update({ role: b.role }).eq('id', b.member_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await audit(ctx.sb, { workspaceId: ctx.workspaceId, userId: ctx.userId, email: ctx.email },
    'role.changed', 'member', b.member_id, { from: target.role, to: b.role, member: target.invited_email ?? target.user_id })
  return NextResponse.json({ ok: true })
}

// POST { member_id, client_id, grant: boolean } — per-client access for client viewers.
export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (ctx.wsRole && !ADMIN_ROLES.includes(ctx.wsRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  if (!b.member_id || !b.client_id) return NextResponse.json({ error: 'member_id and client_id required' }, { status: 400 })

  // Both must belong to this workspace — never trust raw ids across tenants.
  const [{ data: member }, { data: client }] = await Promise.all([
    ctx.sb.from('workspace_members').select('id').eq('id', b.member_id).eq('workspace_id', ctx.workspaceId).maybeSingle(),
    ctx.sb.from('clients').select('id').eq('id', b.client_id).eq('workspace_id', ctx.workspaceId).maybeSingle(),
  ])
  if (!member || !client) return NextResponse.json({ error: 'Not found in this workspace' }, { status: 404 })

  if (b.grant) {
    const { error } = await ctx.sb.from('member_client_access')
      .upsert({ member_id: b.member_id, client_id: b.client_id })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await ctx.sb.from('member_client_access')
      .delete().eq('member_id', b.member_id).eq('client_id', b.client_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  await audit(ctx.sb, { workspaceId: ctx.workspaceId, userId: ctx.userId, email: ctx.email },
    b.grant ? 'client_access.granted' : 'client_access.revoked', 'member', b.member_id, { client_id: b.client_id })
  return NextResponse.json({ ok: true })
}
