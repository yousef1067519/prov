import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, serviceClient } from '@/lib/admin'

const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost']

// PATCH /api/admin/demos/[id] — { status }. Admin-only.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  if (!STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `status must be one of ${STATUSES.join(', ')}` }, { status: 400 })
  }
  const { data, error } = await serviceClient()
    .from('demo_requests').update({ status: body.status }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ request: data })
}
