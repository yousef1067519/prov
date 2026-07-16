import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { logActivity } from '@/lib/activity'

type Ctx = { params: Promise<{ id: string }> }
const ROLES = new Set(['Admin', 'Manager', 'Team Member'])

// Managing the roster (role changes, removals) is owner/admin only. A member's
// apiCtx resolves to the owner key, so this gate is what actually stops a regular
// member from editing other members.
function isManager(c: { role: string; wsRole: string | null }): boolean {
  return ['Owner', 'Admin'].includes(c.role) || ['owner', 'admin'].includes(c.wsRole ?? '')
}

// PATCH — change a member's role (and/or activate a pending member).
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const c = await apiCtx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isManager(c)) return NextResponse.json({ error: 'Only a manager can change roles' }, { status: 403 })
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))

  const patch: Record<string, unknown> = {}
  if (body.role != null) {
    if (!ROLES.has(body.role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    patch.role = body.role
  }
  if (body.status != null) {
    if (!['pending', 'active'].includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    patch.status = body.status
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { data, error } = await c.sb.from('team_members')
    .update(patch).eq('id', id).eq('owner_id', c.userId)
    .select('id, member_email, role, status, created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(c.sb, c.userId, { actorEmail: data.member_email, action: 'updated_member', resourceType: 'team_member', resourceId: id, meta: patch })
  return NextResponse.json({ member: data })
}

// DELETE — remove a member from the team.
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const c = await apiCtx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isManager(c)) return NextResponse.json({ error: 'Only a manager can remove members' }, { status: 403 })
  const { id } = await ctx.params

  const { data } = await c.sb.from('team_members').select('member_email').eq('id', id).eq('owner_id', c.userId).maybeSingle()
  const { error } = await c.sb.from('team_members').delete().eq('id', id).eq('owner_id', c.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(c.sb, c.userId, { actorEmail: data?.member_email, action: 'removed_member', resourceType: 'team_member', resourceId: id })
  return NextResponse.json({ ok: true })
}
