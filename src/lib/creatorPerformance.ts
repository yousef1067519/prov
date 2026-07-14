import type { Influencer } from './types'

export interface PerfPoint { date: string; followers: number; engagement: number; avg_views: number }
export interface PastCampaign { campaign: string; sponsor: string; revenue: number; roi: number; result: 'successful' | 'pending' | 'declined' }

// Niche-based CPM (what a sponsor typically pays per 1,000 views).
const NICHE_CPM: Record<string, number> = {
  Finance: 35, Business: 30, Tech: 25, Education: 18, Travel: 16,
  Fitness: 14, Food: 12, Beauty: 15, Fashion: 14, Gaming: 10, Lifestyle: 11,
}

export function cpmEstimate(c: Pick<Influencer, 'niche'>): number {
  return NICHE_CPM[c.niche] ?? 14
}

/** Estimated value of one sponsored post: avg_views / 1000 * CPM. */
export function estDealValue(c: Pick<Influencer, 'niche' | 'avg_views'>): number {
  return Math.round((c.avg_views / 1000) * cpmEstimate(c))
}

// Deterministic pseudo-random in [0,1) from a seed — keeps charts stable across renders.
function rng(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

function seedFrom(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h) || 1
}

/**
 * Back-casts `months` of history from a creator's CURRENT stats, applying a
 * gentle upward growth trend plus deterministic noise. Real logged rows
 * (from creator_performance) should be layered on top of this by the caller.
 */
export function buildHistory(c: Influencer, months = 12): PerfPoint[] {
  const rand = rng(seedFrom(c.id))
  const monthlyGrowth = 0.02 + rand() * 0.04 // 2–6% / month
  const out: PerfPoint[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const factor = Math.pow(1 + monthlyGrowth, -i)              // older = smaller
    const noise = 0.94 + rand() * 0.12
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({
      date: d.toISOString().slice(0, 10),
      followers: Math.max(1, Math.round(c.subscribers * factor * noise)),
      avg_views: Math.max(1, Math.round(c.avg_views * factor * noise)),
      engagement: Number((c.engagement_rate * (0.9 + rand() * 0.2)).toFixed(1)),
    })
  }
  // Pin the most recent point to the creator's actual current numbers.
  out[out.length - 1] = { date: out[out.length - 1].date, followers: c.subscribers, avg_views: c.avg_views, engagement: c.engagement_rate }
  return out
}

const SPONSORS = ['NordVPN', 'HelloFresh', 'Squarespace', 'Notion', 'Athletic Greens', 'Skillshare', 'Audible', 'Manscaped', 'Ridge Wallet', 'Surfshark']

/** Deterministic sample of prior campaigns for a creator (used when no real data). */
export function buildPastCampaigns(c: Influencer): PastCampaign[] {
  const rand = rng(seedFrom(c.id) + 7)
  const count = Math.floor(rand() * 4) // 0–3
  const base = estDealValue(c)
  const out: PastCampaign[] = []
  for (let i = 0; i < count; i++) {
    const r = rand()
    const result: PastCampaign['result'] = r > 0.6 ? 'successful' : r > 0.3 ? 'pending' : 'declined'
    const revenue = result === 'successful' ? Math.round(base * (0.8 + rand())) : 0
    const cost = Math.round(base * 0.4)
    out.push({
      campaign: ['Q1 Push', 'Brand Launch', 'Holiday Drive', 'Summer Promo'][i % 4],
      sponsor: SPONSORS[(seedFrom(c.id) + i) % SPONSORS.length],
      revenue,
      roi: revenue ? Math.round(((revenue - cost) / cost) * 100) : 0,
      result,
    })
  }
  return out
}

export function totalRevenue(past: PastCampaign[]): number {
  return past.reduce((a, p) => a + p.revenue, 0)
}
