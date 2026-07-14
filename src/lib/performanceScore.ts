// Performance Score (0-100) — the single number agencies quote in negotiations.
// Weights: consistency 25, revenue 25, views 20, engagement 15, brand retention 10,
// completion 5. Normalization tiers are calibrated for mid-size creator deals
// (a $25K campaign with 1M views scores well; MrBeast-scale caps out).

export interface PerfRecord {
  brand_name: string
  campaign_status: string
  campaign_date_posted: string | null
  metrics: {
    views?: number
    likes?: number
    comments?: number
    shares?: number
    revenue_generated?: number
    engagement_rate?: number
  }
}

export interface ScoreBreakdown {
  consistency: number      // /25
  revenue: number          // /25
  views: number            // /20
  engagement: number       // /15
  brand_retention: number  // /10
  completion: number       // /5
  total: number            // /100
}

function clamp(n: number, max: number) { return Math.max(0, Math.min(max, n)) }

export function computePerformanceScore(records: PerfRecord[]): ScoreBreakdown {
  if (!records.length) {
    return { consistency: 0, revenue: 0, views: 0, engagement: 0, brand_retention: 0, completion: 0, total: 0 }
  }

  // Consistency: campaigns per month over the creator's active window (min 1 month).
  const dates = records.map(r => r.campaign_date_posted ? new Date(r.campaign_date_posted).getTime() : Date.now())
  const spanMonths = Math.max(1, (Math.max(...dates) - Math.min(...dates)) / (30 * 864e5))
  const perMonth = records.length / spanMonths
  const consistency = clamp((perMonth / 2) * 25, 25) // 2+/month = full marks

  // Revenue: average revenue per campaign, $50K avg = full marks.
  const avgRevenue = records.reduce((s, r) => s + (r.metrics.revenue_generated || 0), 0) / records.length
  const revenue = clamp((avgRevenue / 50_000) * 25, 25)

  // Views: average views per campaign, 2M avg = full marks.
  const avgViews = records.reduce((s, r) => s + (r.metrics.views || 0), 0) / records.length
  const views = clamp((avgViews / 2_000_000) * 20, 20)

  // Engagement: average engagement rate, 8% = full marks.
  const avgEng = records.reduce((s, r) => s + (r.metrics.engagement_rate || 0), 0) / records.length
  const engagement = clamp((avgEng / 8) * 15, 15)

  // Brand retention: share of brands that came back for 2+ campaigns.
  const freq: Record<string, number> = {}
  for (const r of records) freq[r.brand_name] = (freq[r.brand_name] || 0) + 1
  const uniqueBrands = Object.keys(freq).length
  const repeatBrands = Object.values(freq).filter(n => n >= 2).length
  const brand_retention = clamp(uniqueBrands ? (repeatBrands / uniqueBrands) * 10 : 0, 10)

  // Completion: share of records not stuck in 'active' forever (completed/archived).
  const done = records.filter(r => r.campaign_status !== 'active').length
  const completion = clamp((done / records.length) * 5, 5)

  const total = Math.round(consistency + revenue + views + engagement + brand_retention + completion)
  return {
    consistency: Math.round(consistency),
    revenue: Math.round(revenue),
    views: Math.round(views),
    engagement: Math.round(engagement),
    brand_retention: Math.round(brand_retention),
    completion: Math.round(completion),
    total,
  }
}

/** Aggregate lifetime stats used across profile cards, comparison, and proven-results. */
export function aggregateCreatorStats(records: PerfRecord[]) {
  const n = records.length
  const totalViews = records.reduce((s, r) => s + (r.metrics.views || 0), 0)
  const totalRevenue = records.reduce((s, r) => s + (r.metrics.revenue_generated || 0), 0)
  const avgEng = n ? records.reduce((s, r) => s + (r.metrics.engagement_rate || 0), 0) / n : 0

  const freq: Record<string, number> = {}
  for (const r of records) freq[r.brand_name] = (freq[r.brand_name] || 0) + 1
  const uniqueBrands = Object.keys(freq).length
  const repeatRate = uniqueBrands ? (Object.values(freq).filter(c => c >= 2).length / uniqueBrands) * 100 : 0

  const best = records.reduce<PerfRecord | null>((top, r) =>
    !top || (r.metrics.revenue_generated || 0) > (top.metrics.revenue_generated || 0) ? r : top, null)

  const avgCpm = totalViews > 0 ? (totalRevenue / totalViews) * 1000 : 0
  // ROI proxy: revenue vs. estimated content cost (30% of deal value) — refine when cost tracking lands.
  const roi = totalRevenue > 0 ? totalRevenue / Math.max(1, totalRevenue * 0.3) : 0

  const score = computePerformanceScore(records)

  return {
    total_campaigns: n,
    total_views: totalViews,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    avg_views_per_campaign: n ? Math.round(totalViews / n) : 0,
    avg_revenue_per_campaign: n ? Math.round((totalRevenue / n) * 100) / 100 : 0,
    avg_engagement_rate: Math.round(avgEng * 100) / 100,
    avg_cpm: Math.round(avgCpm * 100) / 100,
    unique_brands: uniqueBrands,
    repeat_brand_rate: Math.round(repeatRate),
    highest_campaign: best ? { brand: best.brand_name, revenue: best.metrics.revenue_generated || 0 } : null,
    estimated_roi: Math.round(roi * 10) / 10,
    performance_score: score.total,
    score_breakdown: score,
  }
}
