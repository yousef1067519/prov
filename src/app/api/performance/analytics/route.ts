import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { aggregateCreatorStats, type PerfRecord } from '@/lib/performanceScore'

// GET /api/performance/analytics — everything the charts need, in one round trip.
// Aggregates in Node: an agency has hundreds of records at most.
export async function GET(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await ctx.sb
    .from('performance_campaigns')
    .select('*')
    .eq('agency_id', ctx.userId)
    .limit(2000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const monthKey = (d: string | null) => {
    const date = d ? new Date(d) : new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  // ── Time series (by month) ──
  const byMonth: Record<string, { views: number; revenue: number; count: number; engSum: number }> = {}
  for (const r of rows) {
    const k = monthKey(r.campaign_date_posted)
    byMonth[k] ??= { views: 0, revenue: 0, count: 0, engSum: 0 }
    byMonth[k].views += Number(r.metrics?.views) || 0
    byMonth[k].revenue += Number(r.metrics?.revenue_generated) || 0
    byMonth[k].engSum += Number(r.metrics?.engagement_rate) || 0
    byMonth[k].count++
  }
  const months = Object.keys(byMonth).sort()
  const timeline = months.map(m => ({
    month: m,
    views: byMonth[m].views,
    revenue: Math.round(byMonth[m].revenue),
    campaigns: byMonth[m].count,
    engagement: Math.round((byMonth[m].engSum / byMonth[m].count) * 100) / 100,
  }))

  // ── Platform breakdown ──
  const platMap: Record<string, { campaigns: number; views: number }> = {}
  for (const r of rows) {
    const platforms = Object.keys(r.platforms ?? {})
    for (const p of platforms.length ? platforms : ['unspecified']) {
      platMap[p] ??= { campaigns: 0, views: 0 }
      platMap[p].campaigns++
      platMap[p].views += (Number(r.metrics?.views) || 0) / (platforms.length || 1)
    }
  }
  const byPlatform = Object.entries(platMap).map(([platform, v]) => ({
    platform, campaigns: v.campaigns, views: Math.round(v.views),
  })).sort((a, b) => b.campaigns - a.campaigns)

  // ── Brand frequency (top 10) ──
  const brandMap: Record<string, { campaigns: number; revenue: number }> = {}
  for (const r of rows) {
    brandMap[r.brand_name] ??= { campaigns: 0, revenue: 0 }
    brandMap[r.brand_name].campaigns++
    brandMap[r.brand_name].revenue += Number(r.metrics?.revenue_generated) || 0
  }
  const topBrands = Object.entries(brandMap)
    .map(([brand, v]) => ({ brand, campaigns: v.campaigns, revenue: Math.round(v.revenue) }))
    .sort((a, b) => b.revenue - a.revenue).slice(0, 10)

  // ── Creator leaderboard ──
  const creatorMap: Record<string, { handle: string; records: PerfRecord[] }> = {}
  for (const r of rows) {
    creatorMap[r.creator_id] ??= { handle: r.creator_handle, records: [] }
    creatorMap[r.creator_id].records.push(r as PerfRecord)
  }
  const creatorLeaderboard = Object.entries(creatorMap).map(([creator_id, v]) => {
    const s = aggregateCreatorStats(v.records)
    return {
      creator_id,
      creator_handle: v.handle,
      campaigns: s.total_campaigns,
      views: s.total_views,
      revenue: s.total_revenue,
      engagement: s.avg_engagement_rate,
      score: s.performance_score,
    }
  }).sort((a, b) => b.score - a.score)

  return NextResponse.json({
    total_records: rows.length,
    total_views: rows.reduce((s, r) => s + (Number(r.metrics?.views) || 0), 0),
    total_revenue: Math.round(rows.reduce((s, r) => s + (Number(r.metrics?.revenue_generated) || 0), 0)),
    timeline,
    byPlatform,
    topBrands,
    creatorLeaderboard,
  })
}
