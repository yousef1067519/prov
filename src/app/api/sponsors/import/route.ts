import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { NICHES } from '@/lib/types'

// Bulk-import sponsors from the company-dataset scraper. POST batches here:
//   POST /api/sponsors/import
//   Header: x-import-key: <IMPORT_API_KEY>
//   Body:   { sponsors: [{ name, website, industry, niche, typical_budget, description, email, country }, ...] }
// Rows are upserted on website so re-scraping refreshes instead of duplicating.

const NICHE_SET = new Set(NICHES.map(n => n.toLowerCase()))

function normNiche(v: unknown): string {
  const s = String(v ?? '').trim()
  return NICHE_SET.has(s.toLowerCase()) ? NICHES.find(n => n.toLowerCase() === s.toLowerCase())! : 'Lifestyle'
}

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-import-key')
  if (!process.env.IMPORT_API_KEY || key !== process.env.IMPORT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server not configured for imports' }, { status: 500 })

  const body = await req.json().catch(() => null)
  const rows: unknown[] = Array.isArray(body?.sponsors) ? body.sponsors : []
  if (!rows.length) return NextResponse.json({ error: 'Provide a non-empty sponsors array' }, { status: 400 })
  if (rows.length > 2000) return NextResponse.json({ error: 'Max 2000 sponsors per batch' }, { status: 400 })

  const clean = rows.map(r => {
    const c = r as Record<string, unknown>
    return {
      name: String(c.name ?? '').slice(0, 200),
      website: c.website ? String(c.website).toLowerCase().slice(0, 200) : null,
      industry: String(c.industry ?? 'consumer goods').slice(0, 120),
      niche: normNiche(c.niche),
      typical_budget: String(c.typical_budget ?? '$2K-$15K').slice(0, 60),
      description: c.description ? String(c.description).slice(0, 500) : null,
      email: c.email ? String(c.email).toLowerCase().slice(0, 200) : null,
      country: c.country ? String(c.country).slice(0, 80) : null,
    }
  }).filter(s => s.name && s.website && s.email) // sponsors without a real contact are useless here

  if (!clean.length) return NextResponse.json({ error: 'Every row needs name, website and email' }, { status: 400 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } })

  // Manual upsert: the website unique index is partial (nulls excluded), which
  // Postgres ON CONFLICT can't target — so dedupe here instead. Batches are
  // ≤2000 rows, so one lookup + one insert + a few updates stays fast.
  const seen = new Set<string>()
  const deduped = clean.filter(s => (seen.has(s.website!) ? false : (seen.add(s.website!), true)))
  const { data: existing } = await supabase.from('sponsors').select('website').in('website', deduped.map(s => s.website))
  const existingSet = new Set((existing ?? []).map((r: { website: string }) => r.website))
  const toInsert = deduped.filter(s => !existingSet.has(s.website!))
  const toUpdate = deduped.filter(s => existingSet.has(s.website!))

  let imported = 0
  if (toInsert.length) {
    const { data, error } = await supabase.from('sponsors').insert(toInsert).select('id')
    if (error) {
      // A row-level conflict (e.g. concurrent batch) fails the whole insert —
      // retry row-by-row so one dup doesn't discard the rest of the batch.
      for (const row of toInsert) {
        const { error: e } = await supabase.from('sponsors').insert(row)
        if (!e) imported++
      }
    } else imported += data?.length ?? toInsert.length
  }
  for (const row of toUpdate) {
    const { error: e } = await supabase.from('sponsors').update(row).eq('website', row.website!)
    if (!e) imported++
  }

  return NextResponse.json({ ok: true, received: rows.length, imported })
}
