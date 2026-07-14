import { NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'

// GET /api/performance/rollups — Intelligence aggregates in one round trip:
// per client, per category, per account manager, and per quarter, each with
// spend (deal_value_cents), revenue (tracked revenue, integer cents), average
// outcome rating, and record count. Also returns the workspace's clients and
// members so the UI can label buckets and build filter dropdowns without
// extra requests.
// Aggregates in Node, matching the analytics route: agency datasets are
// hundreds of records, not millions. All money stays integer cents.
// Scope: workspace_id from apiCtx, with un-stamped rows falling back to the
// legacy agency_id key during cutover.

interface Bucket {
  key: string
  label: string
  count: number
  spend_cents: number
  revenue_cents: number
  avg_rating: number | null
}

type Rec = Record<string, unknown> & { metrics?: Record<string, unknown> | null }

interface Acc { count: number; spend: number; revenue: number; ratingSum: number; ratingCount: number }

function bump(map: Map<string, Acc>, key: string, r: Rec) {
  const a = map.get(key) ?? { count: 0, spend: 0, revenue: 0, ratingSum: 0, ratingCount: 0 }
  a.count++
  a.spend += Number(r.deal_value_cents) || 0
  a.revenue += Math.round((Number(r.metrics?.revenue_generated) || 0) * 100)
  const rating = Number(r.outcome_rating)
  if (rating >= 1 && rating <= 5) { a.ratingSum += rating; a.ratingCount++ }
  map.set(key, a)
}

function toBuckets(map: Map<string, Acc>, label: (key: string) => string): Bucket[] {
  return [...map.entries()].map(([key, a]) => ({
    key,
    label: label(key),
    count: a.count,
    spend_cents: a.spend,
    revenue_cents: a.revenue,
    avg_rating: a.ratingCount ? Math.round((a.ratingSum / a.ratingCount) * 10) / 10 : null,
  }))
}

function quarterKey(dateStr: unknown): string {
  const d = dateStr ? new Date(String(dateStr)) : new Date()
  const t = Number.isFinite(d.getTime()) ? d : new Date()
  return `${t.getFullYear()}-Q${Math.floor(t.getMonth() / 3) + 1}`
}

export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let q = ctx.sb.from('performance_campaigns').select('*')
  if (ctx.workspaceId) {
    q = q.or(`workspace_id.eq.${ctx.workspaceId},and(workspace_id.is.null,agency_id.eq.${ctx.userId})`)
  } else {
    q = q.eq('agency_id', ctx.userId)
  }
  const { data, error } = await q.limit(5000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data ?? []) as Rec[]

  // ── Lookups: clients + members of this workspace (labels + filter options) ──
  let clients: Array<{ id: string; name: string }> = []
  let members: Array<{ id: string; label: string; role: string }> = []
  if (ctx.workspaceId) {
    const [{ data: cl }, { data: wm }] = await Promise.all([
      ctx.sb.from('clients').select('id, name').eq('workspace_id', ctx.workspaceId).order('name'),
      ctx.sb.from('workspace_members').select('id, user_id, invited_email, role')
        .eq('workspace_id', ctx.workspaceId).eq('status', 'active'),
    ])
    clients = (cl ?? []) as Array<{ id: string; name: string }>
    const wmRows = (wm ?? []) as Array<{ id: string; user_id: string | null; invited_email: string | null; role: string }>
    const userIds = wmRows.map(m => m.user_id).filter((u): u is string => !!u)
    const profileById = new Map<string, { full_name: string | null; email: string | null }>()
    if (userIds.length) {
      const { data: profs } = await ctx.sb.from('profiles').select('id, full_name, email').in('id', userIds)
      for (const p of (profs ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>) {
        profileById.set(p.id, { full_name: p.full_name, email: p.email })
      }
    }
    members = wmRows.map(m => {
      const p = m.user_id ? profileById.get(m.user_id) : undefined
      return { id: m.id, label: p?.full_name || p?.email || m.invited_email || 'Member', role: m.role }
    })
  }
  const clientName = new Map(clients.map(c => [c.id, c.name]))
  const memberLabel = new Map(members.map(m => [m.id, m.label]))

  // ── Aggregate ──
  const byClient = new Map<string, Acc>()
  const byCategory = new Map<string, Acc>()
  const byManager = new Map<string, Acc>()
  const byQuarter = new Map<string, Acc>()
  const totals: Acc = { count: 0, spend: 0, revenue: 0, ratingSum: 0, ratingCount: 0 }

  for (const r of rows) {
    bump(byClient, String(r.client_id ?? 'unassigned'), r)
    bump(byCategory, String(r.category ?? '').trim().toLowerCase() || 'uncategorized', r)
    bump(byManager, String(r.account_manager_member_id ?? 'unassigned'), r)
    bump(byQuarter, quarterKey(r.campaign_date_posted), r)
    totals.count++
    totals.spend += Number(r.deal_value_cents) || 0
    totals.revenue += Math.round((Number(r.metrics?.revenue_generated) || 0) * 100)
    const rating = Number(r.outcome_rating)
    if (rating >= 1 && rating <= 5) { totals.ratingSum += rating; totals.ratingCount++ }
  }

  const byRevenue = (a: Bucket, b: Bucket) => b.revenue_cents - a.revenue_cents || b.count - a.count

  return NextResponse.json({
    totals: {
      count: totals.count,
      spend_cents: totals.spend,
      revenue_cents: totals.revenue,
      avg_rating: totals.ratingCount ? Math.round((totals.ratingSum / totals.ratingCount) * 10) / 10 : null,
    },
    byClient: toBuckets(byClient, k => (k === 'unassigned' ? 'No client' : clientName.get(k) ?? 'Unknown client')).sort(byRevenue),
    byCategory: toBuckets(byCategory, k => (k === 'uncategorized' ? 'Uncategorized' : k)).sort(byRevenue),
    byAccountManager: toBuckets(byManager, k => (k === 'unassigned' ? 'Unassigned' : memberLabel.get(k) ?? 'Former member')).sort(byRevenue),
    byQuarter: toBuckets(byQuarter, k => k.replace('-', ' ')).sort((a, b) => a.key.localeCompare(b.key)),
    clients,
    members,
  })
}
