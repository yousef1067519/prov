import type { Influencer } from './types'

// A creator someone has cold-emailed drops out of everyone else's search
// results for this long, so two Prov customers never pitch the same person
// on the same week. Same-workspace reuse (contacted_by = you) is unaffected.
export const CONTACT_COOLDOWN_DAYS = 60

// Shared creator filter shape used by both the campaign search and AI discovery.
export interface CreatorFilters {
  query?: string
  niche?: string
  platform?: string            // 'All' or '' means no platform filter
  min_followers?: number
  max_followers?: number
  min_engagement?: number
  min_avg_views?: number
  max_avg_views?: number
  country?: string | string[]
  language?: string            // lenient: rows with no language still match
  has_email?: boolean          // filter to only creators with email
  exclude_locked_for?: string  // workspace id — hide creators on cooldown for anyone else
}

// Minimal shape of a Supabase query builder we use (avoids importing types).
interface QB {
  ilike(col: string, pattern: string): QB
  eq(col: string, val: unknown): QB
  in(col: string, vals: unknown[]): QB
  gte(col: string, val: number): QB
  lte(col: string, val: number): QB
  or(filter: string): QB
}

/** Push filters into a Supabase `from('creators').select(...)` query — scales to millions of rows. */
export function applyCreatorFilters<T extends QB>(q: T, f: CreatorFilters): T {
  let out = q
  if (f.query) out = out.ilike('name', `%${f.query}%`) as T
  if (f.niche) out = out.eq('niche', f.niche) as T
  if (f.platform && f.platform !== 'All') out = out.eq('platform', f.platform) as T
  if (f.min_followers != null) out = out.gte('subscribers', f.min_followers) as T
  if (f.max_followers != null) out = out.lte('subscribers', f.max_followers) as T
  if (f.min_avg_views != null) out = out.gte('avg_views', f.min_avg_views) as T
  if (f.max_avg_views != null) out = out.lte('avg_views', f.max_avg_views) as T
  if (f.min_engagement != null) out = out.gte('engagement_rate', f.min_engagement) as T
  if (f.country) {
    const arr = Array.isArray(f.country) ? f.country : [f.country]
    if (arr.length) out = out.in('country', arr) as T
  }
  if (f.language) out = out.eq('language', f.language) as T
  if (f.has_email) out = out.ilike('email', '%@%') as T
  if (f.exclude_locked_for) {
    const cutoff = new Date(Date.now() - CONTACT_COOLDOWN_DAYS * 864e5).toISOString()
    // Visible if: never contacted, contacted long enough ago, or contacted by THIS workspace.
    out = out.or(`last_contacted_at.is.null,last_contacted_at.lt.${cutoff},contacted_by.eq.${f.exclude_locked_for}`) as T
  }
  return out
}

/** Same filtering, in memory — for the bundled sample fallback when the DB is empty. */
export function filterCreatorsInMemory(list: Influencer[], f: CreatorFilters): Influencer[] {
  let out = list
  if (f.query) { const ql = f.query.toLowerCase(); out = out.filter(c => c.name.toLowerCase().includes(ql)) }
  if (f.niche) out = out.filter(c => c.niche === f.niche)
  if (f.platform && f.platform !== 'All') out = out.filter(c => c.platform === f.platform)
  if (f.min_followers != null) out = out.filter(c => c.subscribers >= f.min_followers!)
  if (f.max_followers != null) out = out.filter(c => c.subscribers <= f.max_followers!)
  if (f.min_avg_views != null) out = out.filter(c => c.avg_views >= f.min_avg_views!)
  if (f.max_avg_views != null) out = out.filter(c => c.avg_views <= f.max_avg_views!)
  if (f.min_engagement != null) out = out.filter(c => c.engagement_rate >= f.min_engagement!)
  if (f.country) { const arr = Array.isArray(f.country) ? f.country : [f.country]; if (arr.length) out = out.filter(c => arr.includes(c.country)) }
  if (f.language) out = out.filter(c => c.language === f.language)
  if (f.has_email) out = out.filter(c => c.email && c.email.includes('@'))
  if (f.exclude_locked_for) {
    const cutoff = Date.now() - CONTACT_COOLDOWN_DAYS * 864e5
    out = out.filter(c => !c.last_contacted_at || new Date(c.last_contacted_at).getTime() < cutoff || c.contacted_by === f.exclude_locked_for)
  }
  return out
}
