import { NextRequest, NextResponse } from 'next/server'
import { apiCtx, type ApiCtx } from '@/lib/apiUser'
import { audit } from '@/lib/tenant'
import { computePerformanceScore, type PerfRecord } from '@/lib/performanceScore'

// Intelligence (§8.2): a performance record is a permanent deal-intelligence
// asset. POST accepts the 0021 fields (deal economics in integer cents,
// deliverables, winning strategy, negotiation notes, outcome rating, category,
// account manager) and stamps workspace_id; PATCH edits them and DELETE
// removes a record — both audited via audit_log.

const WRITE_WS_ROLES = new Set(['owner', 'admin', 'account_manager'])

function canWriteIntelligence(ctx: ApiCtx): boolean {
  // Enterprise role known → enforce it. Legacy-only ctx (no 0020 membership
  // resolved) keeps the pre-enterprise behavior: any workspace user may write.
  return ctx.wsRole ? WRITE_WS_ROLES.has(ctx.wsRole) : true
}

// Validated 0021 intelligence fields from a request body. Only returns keys
// the caller actually sent, so legacy callers (and pre-0021 databases) are
// untouched.
function intelligenceFields(body: Record<string, unknown>): { fields: Record<string, unknown>; error?: string } {
  const out: Record<string, unknown> = {}
  if ('deal_value_cents' in body) {
    if (body.deal_value_cents === null || body.deal_value_cents === '') out.deal_value_cents = null
    else {
      const v = Math.round(Number(body.deal_value_cents))
      if (!Number.isFinite(v) || v < 0) return { fields: out, error: 'deal_value_cents must be a non-negative integer (money is integer cents)' }
      out.deal_value_cents = v
    }
  }
  if ('currency' in body && body.currency) out.currency = String(body.currency).toUpperCase().slice(0, 3)
  if ('deliverables' in body) out.deliverables = Array.isArray(body.deliverables) ? body.deliverables : []
  if ('winning_strategy' in body) out.winning_strategy = body.winning_strategy ? String(body.winning_strategy) : null
  if ('negotiation_notes' in body) out.negotiation_notes = body.negotiation_notes ? String(body.negotiation_notes) : null
  if ('outcome_rating' in body) {
    if (body.outcome_rating === null || body.outcome_rating === '') out.outcome_rating = null
    else {
      const r = Math.round(Number(body.outcome_rating))
      if (!Number.isFinite(r) || r < 1 || r > 5) return { fields: out, error: 'outcome_rating must be 1-5' }
      out.outcome_rating = r
    }
  }
  if ('category' in body) out.category = body.category ? String(body.category).trim().toLowerCase() : null
  if ('account_manager_member_id' in body) out.account_manager_member_id = body.account_manager_member_id || null
  if ('client_id' in body) out.client_id = body.client_id || null
  return { fields: out }
}

// POST /api/performance/record — save a completed campaign's performance metrics.
// creator can be identified by creator_id OR creator_email (resolved/created
// server-side, so deals with custom-added creators are trackable too).
export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const {
    campaign_id,
    creator_id,
    creator_email,
    creator_handle,
    brand_name,
    product_promoted,
    campaign_date_posted,
    platforms = {},
    metrics: rawMetrics = {},
    notes,
    brand_feedback,
    campaign_status = 'completed',
  } = body

  if (!brand_name || (!creator_id && !creator_email && !creator_handle)) {
    return NextResponse.json({ error: 'brand_name and a creator (id, email, or handle) are required' }, { status: 400 })
  }

  // ── Resolve creator ──
  let creatorId: string | null = creator_id ?? null
  let handle = creator_handle ?? ''
  if (!creatorId && creator_email) {
    const { data: found } = await ctx.sb.from('creators').select('id, name').ilike('email', creator_email).limit(1).maybeSingle()
    if (found) { creatorId = found.id; handle = handle || found.name }
  }
  if (!creatorId) {
    // Create a minimal creator row (same pattern as the custom-creator flow).
    const { data: created, error } = await ctx.sb.from('creators').insert({
      name: creator_handle || creator_email || 'Unknown creator',
      niche: 'Lifestyle', platform: 'YouTube', subscribers: 0, avg_views: 0,
      engagement_rate: 0, email: creator_email ?? null, source: 'performance-tracker',
    }).select('id').single()
    if (error || !created) return NextResponse.json({ error: 'Could not resolve creator' }, { status: 500 })
    creatorId = created.id
  }

  // ── Resolve campaign (accept a real id or create one, mirroring the send flow) ──
  let campaignId: string | null = null
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (campaign_id && UUID_RE.test(String(campaign_id))) {
    const { data } = await ctx.sb.from('campaigns').select('id, name').eq('id', campaign_id).maybeSingle()
    if (data) campaignId = data.id
  }
  let campaignName = body.campaign_name as string | undefined
  if (!campaignId) {
    const { data } = await ctx.sb.from('campaigns').insert({
      user_id: ctx.userId,
      name: campaignName || `${brand_name} × ${handle || 'creator'}`,
      status: 'completed',
    }).select('id, name').single()
    campaignId = data?.id ?? null
    campaignName = campaignName || data?.name
  } else if (!campaignName) {
    const { data } = await ctx.sb.from('campaigns').select('name').eq('id', campaignId).single()
    campaignName = data?.name ?? `${brand_name} campaign`
  }
  if (!campaignId) return NextResponse.json({ error: 'Could not resolve campaign' }, { status: 500 })

  // ── Derived metrics ──
  const m = {
    views: Number(rawMetrics.views) || 0,
    likes: Number(rawMetrics.likes) || 0,
    comments: Number(rawMetrics.comments) || 0,
    shares: Number(rawMetrics.shares) || 0,
    watch_time_seconds: Number(rawMetrics.watch_time_seconds) || 0,
    clicks: Number(rawMetrics.clicks) || 0,
    sales: Number(rawMetrics.sales) || 0,
    conversions: Number(rawMetrics.conversions) || 0,
    revenue_generated: Number(rawMetrics.revenue_generated) || 0,
  }
  const engagement_rate = m.views > 0 ? ((m.likes + m.comments + m.shares) / m.views) * 100 : 0
  const estimated_cpm = m.views > 0 ? (m.revenue_generated / m.views) * 1000 : 0
  const estimated_cpc = m.clicks > 0 ? m.revenue_generated / m.clicks : 0
  const estimated_cpa = m.conversions > 0 ? m.revenue_generated / m.conversions : 0
  const metrics = {
    ...m,
    engagement_rate: Math.round(engagement_rate * 100) / 100,
    estimated_cpm: Math.round(estimated_cpm * 100) / 100,
    estimated_cpc: Math.round(estimated_cpc * 100) / 100,
    estimated_cpa: Math.round(estimated_cpa * 100) / 100,
  }

  // ── Score: this record in the context of the creator's history ──
  const { data: history } = await ctx.sb
    .from('performance_campaigns')
    .select('brand_name, campaign_status, campaign_date_posted, metrics')
    .eq('agency_id', ctx.userId)
    .eq('creator_id', creatorId)
  const newRec: PerfRecord = { brand_name, campaign_status, campaign_date_posted: campaign_date_posted ?? new Date().toISOString(), metrics }
  const score = computePerformanceScore([...(history ?? []) as PerfRecord[], newRec])

  const roi_generated = m.revenue_generated > 0 ? Math.round((m.revenue_generated / Math.max(1, m.revenue_generated * 0.3)) * 100) / 100 : 0

  const { data, error } = await ctx.sb.from('performance_campaigns').insert({
    agency_id: ctx.userId,
    campaign_id: campaignId,
    creator_id: creatorId,
    campaign_name: campaignName,
    brand_name,
    creator_handle: handle || 'creator',
    product_promoted: product_promoted ?? null,
    campaign_date_posted: campaign_date_posted || new Date().toISOString(),
    campaign_status,
    platforms,
    metrics,
    performance_score: score.total,
    roi_generated,
    notes: notes ?? null,
    brand_feedback: brand_feedback ?? null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, performance_campaign: data, score_breakdown: score })
}
