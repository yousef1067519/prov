import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { apiCtx } from '@/lib/apiUser'
import { logActivity } from '@/lib/activity'
import { dispatchEvent } from '@/lib/notify'
import { sendEmail } from '@/lib/resend'

const ROLES = new Set(['Admin', 'Manager', 'Team Member'])

// Only the agency owner/admin manages the team (invite, change roles, remove).
// A member's apiCtx resolves to the owner's key, so without this gate any member
// could mutate the roster — check it explicitly on every mutating endpoint.
function isManager(ctx: { role: string; wsRole: string | null }): boolean {
  return ['Owner', 'Admin'].includes(ctx.role) || ['owner', 'admin'].includes(ctx.wsRole ?? '')
}

// GET — list the owner's team members (excluding removed). `canManage` tells the UI
// whether to show the invite/role/remove controls.
export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ members: [], canManage: false })
  const { data } = await ctx.sb
    .from('team_members')
    .select('id, member_email, role, status, created_at')
    .eq('owner_id', ctx.userId)
    .neq('status', 'removed')
    .order('created_at', { ascending: true })
  return NextResponse.json({ members: data ?? [], canManage: isManager(ctx) })
}

// POST — invite a member (creates a pending row + sends an invite email).
export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isManager(ctx)) return NextResponse.json({ error: 'Only a manager can invite team members' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const role = ROLES.has(body.role) ? body.role : 'Team Member'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  // Prevent duplicates.
  const { data: existing } = await ctx.sb.from('team_members')
    .select('id').eq('owner_id', ctx.userId).eq('member_email', email).neq('status', 'removed').maybeSingle()
  if (existing) return NextResponse.json({ error: 'That person is already on your team' }, { status: 409 })

  // Personal one-time invite code: the member redeems it at /join, which links
  // their account to this workspace — no payment, and their signup email doesn't
  // even have to match. Cleared on redemption (single-use).
  const inviteCode = randomBytes(5).toString('hex').toUpperCase() // 10 chars, e.g. 3F8A2C9D1B

  const { data, error } = await ctx.sb.from('team_members')
    .insert({ owner_id: ctx.userId, member_email: email, role, status: 'pending', invite_code: inviteCode })
    .select('id, member_email, role, status, created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Invite email (best effort — never blocks the response or leaks failures to the client).
  // Prefer the configured public URL, else fall back to the live request origin so links
  // are never dead even before NEXT_PUBLIC_APP_URL is set on the deployment.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  try {
    await sendEmail({
      to: email,
      subject: 'You’ve been invited to a Prov workspace',
      body:
        `You've been invited to join a Prov workspace as a ${role}.\n\n` +
        `Your personal invite code (one-time use):\n\n    ${inviteCode}\n\n` +
        `Join here: ${appUrl}/join?code=${inviteCode}\n\n` +
        `Or go to ${appUrl}/join and enter the code. You'll create your account (or sign in) and land straight in the workspace — no payment needed.`,
    })
  } catch (e) { console.error('invite email failed:', (e as Error).message) }

  await logActivity(ctx.sb, ctx.userId, { actorEmail: email, action: 'invited_member', resourceType: 'team_member', resourceId: data.id, meta: { role } })
  await dispatchEvent(ctx.sb, ctx.userId, { event: 'member_invited', text: `Invited ${email} as ${role}`, data: { email, role } })
  return NextResponse.json({ member: data })
}
