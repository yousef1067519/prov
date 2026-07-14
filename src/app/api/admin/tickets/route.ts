import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, serviceClient } from '@/lib/admin'

// GET /api/admin/tickets?status=&priority=&q=&from=&to=
// Admin-only. Reads ALL tickets via the service role (bypasses RLS) behind the allowlist gate.
export async function GET(req: NextRequest) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const status = sp.get('status')
  const priority = sp.get('priority')
  const q = sp.get('q')?.trim()
  const from = sp.get('from')
  const to = sp.get('to')

  const sb = serviceClient()
  let query = sb
    .from('support_tickets')
    .select('id, user_id, message, status, priority, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (q) query = query.ilike('message', `%${q}%`)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ tickets: [], error: error.message }, { status: 500 })

  // Enrich with the submitting user's email for the inbox view (one lookup, mapped in).
  const tickets = data ?? []
  const ids = [...new Set(tickets.map(t => t.user_id))]
  let emails: Record<string, string> = {}
  if (ids.length) {
    const { data: profs } = await sb.from('profiles').select('id, email').in('id', ids)
    emails = Object.fromEntries((profs ?? []).map(p => [p.id, p.email]))
  }

  return NextResponse.json({
    tickets: tickets.map(t => ({ ...t, user_email: emails[t.user_id] ?? null })),
  })
}
