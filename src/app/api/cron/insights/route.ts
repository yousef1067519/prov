import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/apiUser'
import { generateCreatorInsights } from '@/lib/insightEngine'

export const maxDuration = 300

// Nightly ProvBot analysis: regenerate insights for every (agency, creator)
// pair that has 2+ tracked campaigns. Wire in vercel.json as a daily cron.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization') ?? ''
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = serviceClient()
  const { data: rows, error } = await sb
    .from('performance_campaigns')
    .select('agency_id, creator_id')
    .limit(5000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Distinct pairs with at least 2 records.
  const counts = new Map<string, number>()
  for (const r of rows ?? []) counts.set(`${r.agency_id}|${r.creator_id}`, (counts.get(`${r.agency_id}|${r.creator_id}`) ?? 0) + 1)
  const pairs = [...counts.entries()].filter(([, n]) => n >= 2).map(([k]) => k.split('|'))

  let generated = 0, failed = 0
  for (const [agencyId, creatorId] of pairs.slice(0, 50)) { // cap per run
    try {
      const insights = await generateCreatorInsights(sb, agencyId, creatorId)
      if (insights.length) generated++
    } catch { failed++ }
  }

  return NextResponse.json({ ok: true, pairs: pairs.length, generated, failed })
}
