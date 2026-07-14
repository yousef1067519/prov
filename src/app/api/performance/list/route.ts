import { NextRequest, NextResponse } from 'next/server'
import { apiCtx, type ApiCtx } from '@/lib/apiUser'

// GET/POST /api/performance/list — the Intelligence query endpoint.
// Full-text search (q) runs against the generated search_tsv column (0021):
// campaign/brand/creator weighted highest, then category, then negotiation
// notes. Natural-language money phrases in q ("under $5k", "over $2k") are
// parsed into deal-value bounds before the text hits the tsquery.
//
// Filters: category, client_id, account_manager_member_id, deal-value range
// (integer cents), date range, status, creator_id, brand, min_score,
// min_rating, platform, plus the legacy JSONB metric ranges.
// Scope: workspace_id from apiCtx when the 0020 tenant model is live, with
// un-stamped rows falling back to the legacy agency_id key during cutover.
//
// Numeric range filters on JSONB metrics are applied in-memory after the DB
// cut — agency datasets are hundreds of records, not millions.

interface Filters {
  q?: string
  category?: string
  client_id?: string
  account_manager_member_id?: string
  min_deal_value_cents?: number
  max_deal_value_cents?: number
  min_rating?: number
  status?: string
  creator_id?: string
  brand?: string
  platform?: string
  date_from?: string
  date_to?: string
  min_score?: number
  min_views?: number
  max_views?: number
  min_revenue?: number
  max_revenue?: number
  min_engagement?: number
  sort?: string
  dir?: string
  limit: number
  offset: number
}

function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function normalize(raw: Record<string, unknown>): Filters {
  return {
    q: raw.q ? String(raw.q) : undefined,
    category: raw.category ? String(raw.category) : undefined,
    client_id: raw.client_id ? String(raw.client_id) : undefined,
    account_manager_member_id: raw.account_manager_member_id
      ? String(raw.account_manager_member_id)
      : raw.account_manager ? String(raw.account_manager) : undefined,
    min_deal_value_cents: num(raw.min_deal_value_cents),
    max_deal_value_cents: num(raw.max_deal_value_cents),
    min_rating: num(raw.min_rating),
    status: raw.status ? String(raw.status) : undefined,
    creator_id: raw.creator_id ? String(raw.creator_id) : undefined,
    brand: raw.brand ? String(raw.brand) : undefined,
    platform: raw.platform ? String(raw.platform) : undefined,
    date_from: raw.date_from ? String(raw.date_from) : undefined,
    date_to: raw.date_to ? String(raw.date_to) : undefined,
    min_score: num(raw.min_score),
    min_views: num(raw.min_views),
    max_views: num(raw.max_views),
    min_revenue: num(raw.min_revenue),
    max_revenue: num(raw.max_revenue),
    min_engagement: num(raw.min_engagement),
    sort: raw.sort ? String(raw.sort) : undefined,
    dir: raw.dir ? String(raw.dir) : undefined,
    limit: Math.min(200, Math.max(1, Number(raw.limit) || 50)),
    offset: Math.max(0, Number(raw.offset) || 0),
  }
}

// "fitness creators under $5k" → text "fitness creators" + max 500_000 cents.
function parseMoneyPhrases(raw: string): { text: string; minCents?: number; maxCents?: number } {
  let text = raw
  let minCents: number | undefined
  let maxCents: number | undefined
  const toCents = (n: string, unit?: string) => {
    const mult = unit?.toLowerCase() === 'm' ? 1_000_000 : unit?.toLowerCase() === 'k' ? 1_000 : 1
    return Math.round(parseFloat(n.replace(/,/g, '')) * mult * 100)
  }
  const under = /\b(?:under|below|less than|up to|max(?:imum)?)\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(k|m)?\b/i
  const over = /\b(?:over|above|more than|at least|min(?:imum)?)\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(k|m)?\b/i
  const u = text.match(under)
  if (u) { maxCents = toCents(u[1], u[2]); text = text.replace(under, ' ') }
  const o = text.match(over)
  if (o) { minCents = toCents(o[1], o[2]); text = text.replace(over, ' ') }
  return { text: text.trim(), minCents, maxCents }
}

// Filler words that are almost never in a record's text — dropping them keeps
// "fitness creators" from AND-requiring the literal word "creators".
const STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'for', 'with', 'in', 'of', 'on', 'to', 'my', 'our',
  'creator', 'creators', 'campaign', 'campaigns', 'deal', 'deals', 'record', 'records',
  'under', 'over', 'show', 'find', 'all',
])

function toTsQuery(text: string): string | null {
  const words = text.toLowerCase().split(/[^a-z0-9@_]+/).filter(w => w.length > 1 && !STOPWORDS.has(w))
  if (!words.length) return null
  return words.map(w => `${w}:*`).join(' & ')
}

type Rec = Record<string, unknown> & { metrics?: Record<string, unknown> | null }

function buildQuery(ctx: ApiCtx, f: Filters, opts: { intelligence: boolean }) {
  let q = ctx.sb.from('performance_campaigns').select('*')

  // Workspace scope with legacy fallback for un-stamped rows (mirrors RLS).
  if (opts.intelligence && ctx.workspaceId) {
    q = q.or(`workspace_id.eq.${ctx.workspaceId},and(workspace_id.is.null,agency_id.eq.${ctx.userId})`)
  } else {
    q = q.eq('agency_id', ctx.userId)
  }

  if (f.q) {
    const { text } = parseMoneyPhrases(f.q)
    const ts = toTsQuery(text)
    if (opts.intelligence && ts) {
      q = q.textSearch('search_tsv', ts)
    } else if (text) {
      const term = text.replace(/[%,()]/g, '')
      q = q.or(`creator_handle.ilike.%${term}%,brand_name.ilike.%${term}%,campaign_name.ilike.%${term}%,product_promoted.ilike.%${term}%`)
    }
  }

  if (f.status) q = q.eq('campaign_status', f.status)
  if (f.creator_id) q = q.eq('creator_id', f.creator_id)
  if (f.brand) q = q.ilike('brand_name', `%${f.brand}%`)
  if (f.date_from) q = q.gte('campaign_date_posted', f.date_from)
  if (f.date_to) q = q.lte('campaign_date_posted', f.date_to)
  if (f.min_score != null) q = q.gte('performance_score', f.min_score)
  if (f.platform) q = q.not(`platforms->${f.platform.toLowerCase().replace(/[^a-z_]/g, '')}`, 'is', null)

  if (opts.intelligence) {
    if (f.category) q = q.eq('category', f.category)
    if (f.client_id) q = q.eq('client_id', f.client_id)
    if (f.account_manager_member_id) q = q.eq('account_manager_member_id', f.account_manager_member_id)
    if (f.min_rating != null) q = q.gte('outcome_rating', f.min_rating)
    // Deal-value bounds: explicit filters win over ones parsed out of q.
    const parsed = f.q ? parseMoneyPhrases(f.q) : { minCents: undefined, maxCents: undefined }
    const minDeal = f.min_deal_value_cents ?? parsed.minCents
    const maxDeal = f.max_deal_value_cents ?? parsed.maxCents
    if (minDeal != null) q = q.gte('deal_value_cents', minDeal)
    if (maxDeal != null) q = q.lte('deal_value_cents', maxDeal)
  }

  return q.limit(1000)
}

const n = (v: unknown) => Number(v) || 0
const views = (r: Rec) => n(r.metrics?.views)
const revenue = (r: Rec) => n(r.metrics?.revenue_generated)

// Sort accessors — numeric keys default desc, text keys default asc.
const ACCESSORS: Record<string, { get: (r: Rec) => number | string; defaultDir: 'asc' | 'desc' }> = {
  date: { get: r => new Date(String(r.campaign_date_posted ?? 0)).getTime() || 0, defaultDir: 'desc' },
  revenue: { get: revenue, defaultDir: 'desc' },
  views: { get: views, defaultDir: 'desc' },
  roi: { get: r => n(r.roi_generated), defaultDir: 'desc' },
  score: { get: r => n(r.performance_score), defaultDir: 'desc' },
  deal_value: { get: r => n(r.deal_value_cents), defaultDir: 'desc' },
  rating: { get: r => n(r.outcome_rating), defaultDir: 'desc' },
  campaign: { get: r => String(r.campaign_name ?? '').toLowerCase(), defaultDir: 'asc' },
  brand: { get: r => String(r.brand_name ?? '').toLowerCase(), defaultDir: 'asc' },
  creator: { get: r => String(r.creator_handle ?? '').toLowerCase(), defaultDir: 'asc' },
  category: { get: r => String(r.category ?? '').toLowerCase(), defaultDir: 'asc' },
}
// Legacy one-word sort names from the old tracker UI.
const LEGACY_SORTS: Record<string, { key: string; dir: 'asc' | 'desc' }> = {
  recent: { key: 'date', dir: 'desc' },
  oldest: { key: 'date', dir: 'asc' },
  revenue: { key: 'revenue', dir: 'desc' },
  views: { key: 'views', dir: 'desc' },
  roi: { key: 'roi', dir: 'desc' },
  score: { key: 'score', dir: 'desc' },
}

async function handle(ctx: ApiCtx, f: Filters) {
  // Primary: the 0021 intelligence query. If the migration isn't applied yet
  // (cutover window), fall back to the legacy ilike query so the page never
  // hard-fails.
  let { data, error } = await buildQuery(ctx, f, { intelligence: true })
  if (error) {
    ;({ data, error } = await buildQuery(ctx, f, { intelligence: false }))
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let rows = (data ?? []) as Rec[]

  // Metric range filters (JSONB) in memory.
  if (f.min_views != null) rows = rows.filter(r => views(r) >= f.min_views!)
  if (f.max_views != null) rows = rows.filter(r => views(r) <= f.max_views!)
  if (f.min_revenue != null) rows = rows.filter(r => revenue(r) >= f.min_revenue!)
  if (f.max_revenue != null) rows = rows.filter(r => revenue(r) <= f.max_revenue!)
  if (f.min_engagement != null) rows = rows.filter(r => n(r.metrics?.engagement_rate) >= f.min_engagement!)

  const legacy = f.sort ? LEGACY_SORTS[f.sort] : undefined
  const key = legacy?.key ?? (f.sort && ACCESSORS[f.sort] ? f.sort : 'date')
  const acc = ACCESSORS[key]
  const dir: 'asc' | 'desc' = f.dir === 'asc' || f.dir === 'desc' ? f.dir : legacy?.dir ?? acc.defaultDir
  rows.sort((a, b) => {
    const va = acc.get(a), vb = acc.get(b)
    const cmp = typeof va === 'string' || typeof vb === 'string'
      ? String(va).localeCompare(String(vb))
      : (va as number) - (vb as number)
    return dir === 'asc' ? cmp : -cmp
  })

  return NextResponse.json({ total: rows.length, records: rows.slice(f.offset, f.offset + f.limit) })
}

export async function GET(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return handle(ctx, normalize(Object.fromEntries(req.nextUrl.searchParams)))
}

export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  return handle(ctx, normalize(body))
}
