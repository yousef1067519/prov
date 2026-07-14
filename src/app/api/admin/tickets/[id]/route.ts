import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, serviceClient } from '@/lib/admin'

type Ctx = { params: Promise<{ id: string }> }

const STATUSES = new Set(['open', 'in_progress', 'resolved'])
const PRIORITIES = new Set(['low', 'medium', 'high'])

// GET /api/admin/tickets/:id — full ticket + submitter metadata.
export async function GET(_req: NextRequest, ctx: Ctx) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params

  const sb = serviceClient()
  const { data: ticket, error } = await sb.from('support_tickets').select('*').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  const { data: profile } = await sb.from('profiles').select('email, access_type, created_at').eq('id', ticket.user_id).maybeSingle()
  return NextResponse.json({ ticket: { ...ticket, user: profile ?? null } })
}

// PATCH /api/admin/tickets/:id — update status and/or priority.
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status != null) {
    if (!STATUSES.has(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    patch.status = body.status
  }
  if (body.priority != null) {
    if (!PRIORITIES.has(body.priority)) return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
    patch.priority = body.priority
  }

  const sb = serviceClient()
  const { data, error } = await sb.from('support_tickets').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ticket: data })
}

// DELETE /api/admin/tickets/:id
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params

  const sb = serviceClient()
  const { error } = await sb.from('support_tickets').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
