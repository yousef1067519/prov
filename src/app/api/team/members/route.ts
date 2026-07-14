import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { logActivity } from '@/lib/activity'
import { dispatchEvent } from '@/lib/notify'
import { sendEmail } from '@/lib/resend'

const ROLES = new Set(['Admin', 'Manager', 'Team Member'])

// GET — list the owner's team members (excluding removed).
export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ members: [] })
  const { data } = await ctx.sb
    .from('team_members')
    .select('id, member_email, role, status, created_at')
    .eq('owner_id', ctx.userId)
    .neq('status', 'removed')
    .order('created_at', { ascending: true })
  return NextResponse.json({ members: data ?? [] })
}

// POST — invite a member (creates a pending row + sends an invite email).
export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const { data, error } = await ctx.sb.from('team_members')
    .insert({ owner_id: ctx.userId, member_email: email, role, status: 'pending' })
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
      body: `You've been invited to join a Prov workspace as a ${role}.\n\nSign in (or sign up) with this email address at ${appUrl}/login to accept.`,
    })
  } catch (e) { console.error('invite email failed:', (e as Error).message) }

  await logActivity(ctx.sb, ctx.userId, { actorEmail: email, action: 'invited_member', resourceType: 'team_member', resourceId: data.id, meta: { role } })
  await dispatchEvent(ctx.sb, ctx.userId, { event: 'member_invited', text: `Invited ${email} as ${role}`, data: { email, role } })
  return NextResponse.json({ member: data })
}
