import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, serviceClient } from '@/lib/admin'

// GET /api/admin/demos?status=&q= — admin-only list of sales-led demo requests.
export async function GET(req: NextRequest) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const status = sp.get('status')
  const q = sp.get('q')?.trim()

  let query = serviceClient()
    .from('demo_requests')
    .select('id, agency_name, contact_name, email, team_size, clients_count, monthly_deals, priority_need, message, status, created_at')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (q) query = query.or(`agency_name.ilike.%${q}%,contact_name.ilike.%${q}%,email.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ requests: [], error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data ?? [] })
}
