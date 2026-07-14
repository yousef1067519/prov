import type { Influencer } from './types'
import { NICHES, PLATFORMS } from './types'

export interface DiscoveryFilters {
  niche?: string
  min_followers?: number
  max_followers?: number
  min_engagement?: number
  min_avg_views?: number
  country?: string[]
  platform?: string
  language?: string
}

const COUNTRY_WORDS: Record<string, string> = {
  'us': 'United States', 'usa': 'United States', 'united states': 'United States', 'america': 'United States', 'american': 'United States',
  'uk': 'United Kingdom', 'britain': 'United Kingdom', 'british': 'United Kingdom', 'england': 'United Kingdom', 'united kingdom': 'United Kingdom',
  'canada': 'Canada', 'canadian': 'Canada', 'australia': 'Australia', 'australian': 'Australia',
  'germany': 'Germany', 'german': 'Germany', 'france': 'France', 'french': 'France',
  'brazil': 'Brazil', 'brazilian': 'Brazil', 'india': 'India', 'indian': 'India',
}
const LANG_WORDS = ['english', 'spanish', 'german', 'french', 'portuguese', 'hindi', 'italian', 'arabic', 'japanese']

// Parse "50k", "1.2m", "100,000" → number
function parseCount(raw: string): number {
  const s = raw.toLowerCase().replace(/,/g, '').trim()
  const m = s.match(/([\d.]+)\s*([km])?/)
  if (!m) return NaN
  let n = parseFloat(m[1])
  if (m[2] === 'k') n *= 1e3
  if (m[2] === 'm') n *= 1e6
  return Math.round(n)
}

/** Heuristic natural-language → filters parser. No API needed. */
export function parseQueryLocal(query: string): DiscoveryFilters {
  const q = query.toLowerCase()
  const f: DiscoveryFilters = {}

  // niche
  const niche = NICHES.find(n => q.includes(n.toLowerCase()))
  if (niche) f.niche = niche
  else if (/\bgaming|gamer\b/.test(q)) f.niche = 'Gaming'
  else if (/\bcrypto|investing|stocks?\b/.test(q)) f.niche = 'Finance'

  // platform
  const plat = PLATFORMS.find(p => q.includes(p.toLowerCase().split('/')[0]))
  if (plat) f.platform = plat
  else if (q.includes('youtube')) f.platform = 'YouTube'
  else if (q.includes('tiktok')) f.platform = 'TikTok'
  else if (q.includes('insta')) f.platform = 'Instagram'

  // follower range: "50k-500k", "between 50k and 500k"
  const range = q.match(/([\d.,]+\s*[km]?)\s*(?:-|to|and|–)\s*([\d.,]+\s*[km]?)\s*(?:followers|subs|subscribers)?/)
  if (range) {
    f.min_followers = parseCount(range[1])
    f.max_followers = parseCount(range[2])
  } else {
    // "100k+", "over 100k", "at least 1m", "100k or more"
    const minM = q.match(/(?:over|above|more than|at least|min(?:imum)?|>)\s*([\d.,]+\s*[km]?)|([\d.,]+\s*[km]?)\s*\+/)
    if (minM) f.min_followers = parseCount(minM[1] || minM[2])
    const maxM = q.match(/(?:under|below|less than|max(?:imum)?|up to|<)\s*([\d.,]+\s*[km]?)/)
    if (maxM) f.max_followers = parseCount(maxM[1])
  }

  // engagement: "5%+", "5% engagement", "high engagement"
  const eng = q.match(/([\d.]+)\s*%/)
  if (eng && /engag/.test(q)) f.min_engagement = parseFloat(eng[1])
  else if (/high engagement/.test(q)) f.min_engagement = 6

  // avg views: "averaging over 100k views", "100k+ views"
  const views = q.match(/([\d.,]+\s*[km]?)\s*(?:\+\s*)?(?:avg\s*)?views/)
  if (views) f.min_avg_views = parseCount(views[1])

  // country
  const countries: string[] = []
  for (const [word, name] of Object.entries(COUNTRY_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(q) && !countries.includes(name)) countries.push(name)
  }
  if (countries.length) f.country = countries

  // language
  const lang = LANG_WORDS.find(l => q.includes(l))
  if (lang) f.language = lang.charAt(0).toUpperCase() + lang.slice(1)

  return f
}

export interface ScoredCreator extends Influencer { matchScore: number; reasons: string[] }

/** Filter + rank creators against parsed filters, returning match scores. */
export function rankCreators(creators: Influencer[], f: DiscoveryFilters): ScoredCreator[] {
  const out: ScoredCreator[] = []
  for (const c of creators) {
    let score = 60
    const reasons: string[] = []
    let hardFail = false

    if (f.niche) {
      if (c.niche === f.niche) { score += 14; reasons.push(`${f.niche} niche`) }
      else hardFail = true
    }
    if (f.platform) {
      if (c.platform === f.platform) { score += 8; reasons.push(c.platform) }
      else hardFail = true
    }
    if (f.country?.length) {
      if (f.country.includes(c.country)) { score += 8; reasons.push(c.country) }
      else hardFail = true
    }
    if (f.language) {
      if ((c.language || '').toLowerCase() === f.language.toLowerCase()) { score += 4; reasons.push(f.language) }
      else hardFail = true
    }
    if (f.min_followers != null) {
      if (c.subscribers >= f.min_followers) { score += 6 } else hardFail = true
    }
    if (f.max_followers != null) {
      if (c.subscribers <= f.max_followers) { score += 4 } else hardFail = true
    }
    if (f.min_followers != null || f.max_followers != null) reasons.push(`${fmt(c.subscribers)} followers`)
    if (f.min_engagement != null) {
      if (c.engagement_rate >= f.min_engagement) { score += 8; reasons.push(`${c.engagement_rate}% engagement`) }
      else hardFail = true
    }
    if (f.min_avg_views != null) {
      if (c.avg_views >= f.min_avg_views) { score += 6; reasons.push(`${fmt(c.avg_views)} avg views`) }
      else hardFail = true
    }

    if (hardFail) continue
    // Quality boost for strong engagement even when not requested.
    if (f.min_engagement == null && c.engagement_rate >= 7) score += 4
    out.push({ ...c, matchScore: Math.min(99, score), reasons })
  }
  // If filters were empty, still return something useful (top by engagement).
  if (!Object.keys(f).length) {
    return [...creators].sort((a, b) => b.engagement_rate - a.engagement_rate).slice(0, 24)
      .map(c => ({ ...c, matchScore: 70 + Math.min(20, Math.round(c.engagement_rate)), reasons: ['Top engagement'] }))
  }
  return out.sort((a, b) => b.matchScore - a.matchScore || b.subscribers - a.subscribers)
}

function fmt(n: number) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n) }
