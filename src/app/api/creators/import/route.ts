import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { NICHES, PLATFORMS } from '@/lib/types'
import { normalizeCountry, languageFromCountry } from '@/lib/geoNormalize'

// Bulk-import creators from your scraper. POST batches here:
//   POST /api/creators/import
//   Header: x-import-key: <IMPORT_API_KEY>
//   Body:   { creators: [{ name, handle, niche, platform, subscribers, avg_views, engagement_rate, email, country, language, source }, ...] }
// Rows are upserted on (platform, handle) so re-scraping refreshes stats instead of duplicating.

const NICHE_SET = new Set(NICHES.map(n => n.toLowerCase()))
const PLATFORM_SET = new Set(PLATFORMS.map(p => p.toLowerCase()))

function normNiche(v: unknown): string {
  const s = String(v ?? '').trim()
  return NICHE_SET.has(s.toLowerCase()) ? NICHES.find(n => n.toLowerCase() === s.toLowerCase())! : 'Lifestyle'
}
function normPlatform(v: unknown): string {
  const s = String(v ?? '').trim()
  return PLATFORM_SET.has(s.toLowerCase()) ? PLATFORMS.find(p => p.toLowerCase() === s.toLowerCase())! : 'YouTube'
}
function num(v: unknown, d = 0): number { const n = Number(v); return Number.isFinite(n) ? n : d }

export async function POST(req: NextRequest) {
  // Auth: require the shared import key (so only your scraper can write).
  const key = req.headers.get('x-import-key')
  if (!process.env.IMPORT_API_KEY || key !== process.env.IMPORT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server not configured for imports' }, { status: 500 })

  const body = await req.json().catch(() => null)
  const rows: unknown[] = Array.isArray(body?.creators) ? body.creators : []
  if (!rows.length) return NextResponse.json({ error: 'Provide a non-empty creators array' }, { status: 400 })
  if (rows.length > 5000) return NextResponse.json({ error: 'Max 5000 creators per batch' }, { status: 400 })

  const clean = rows.map(r => {
    const c = r as Record<string, unknown>
    // Normalize country to the canonical name the filters use, then infer a
    // language from it when the scraper didn't provide one — otherwise the
    // language/country search filters can never match.
    const country = normalizeCountry(c.country)
    const language = c.language ? String(c.language).slice(0, 60) : languageFromCountry(country)
    return {
      name: String(c.name ?? c.handle ?? 'Unknown').slice(0, 200),
      handle: c.handle ? String(c.handle).slice(0, 200) : null,
      niche: normNiche(c.niche),
      platform: normPlatform(c.platform),
      subscribers: Math.round(num(c.subscribers ?? c.followers)),
      avg_views: Math.round(num(c.avg_views ?? c.avgViews)),
      engagement_rate: num(c.engagement_rate ?? c.engagement, 0),
      email: c.email ? String(c.email).slice(0, 200) : null,
      country,
      language,
      source: c.source ? String(c.source).slice(0, 60) : 'scraper',
    }
  }).filter(c => c.handle) // need a handle to dedupe on

  if (!clean.length) return NextResponse.json({ error: 'Every row needs a "handle" for dedupe' }, { status: 400 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } })
  const { data, error } = await supabase.from('creators').upsert(clean, { onConflict: 'platform,handle', ignoreDuplicates: false }).select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, received: rows.length, imported: data?.length ?? clean.length })
}
