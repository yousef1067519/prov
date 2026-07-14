import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { buildHistory, buildPastCampaigns, cpmEstimate, estDealValue, totalRevenue } from '@/lib/creatorPerformance'
import type { Influencer } from '@/lib/types'

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
  // Dev-bypass: service role so RLS doesn't hide creators while testing.
  if (process.env.DEV_BYPASS_AUTH === 'true' && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  }
  const cookieStore = cookies()
  return createServerClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    { cookies: { getAll: async () => (await cookieStore).getAll(), setAll: () => {} } }
  )
}

async function loadCreator(id: string): Promise<Influencer | null> {
  try {
    const { data } = await sb().from('creators').select('*').eq('id', id).maybeSingle()
    return (data as Influencer) ?? null
  } catch { return null }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const creator = await loadCreator(id)
  if (!creator) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })

  // Synthetic baseline history, then overlay any real logged rows.
  let history = buildHistory(creator, 12)
  try {
    const { data: rows } = await sb().from('creator_performance').select('date, followers, engagement, avg_views').eq('creator_id', id).order('date')
    if (rows?.length) {
      const map = new Map(history.map(h => [h.date.slice(0, 7), h]))
      for (const r of rows) map.set(String(r.date).slice(0, 7), { date: r.date, followers: r.followers, engagement: r.engagement, avg_views: r.avg_views })
      history = [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
    }
  } catch { /* table may not exist yet */ }

  const past = buildPastCampaigns(creator)
  return NextResponse.json({
    creator,
    history,
    pastCampaigns: past,
    cpm: cpmEstimate(creator),
    estDealValue: estDealValue(creator),
    totalRevenue: totalRevenue(past),
  })
}

// Log a new performance data point (manual or scheduled job).
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const creator = await loadCreator(id)
  const row = {
    creator_id: id,
    date: body.date ?? new Date().toISOString().slice(0, 10),
    followers: body.followers ?? creator?.subscribers ?? 0,
    engagement: body.engagement ?? creator?.engagement_rate ?? 0,
    avg_views: body.avg_views ?? creator?.avg_views ?? 0,
  }
  try {
    const { error } = await sb().from('creator_performance').upsert(row, { onConflict: 'creator_id,date' })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 200 })
    return NextResponse.json({ ok: true, row })
  } catch {
    return NextResponse.json({ ok: false, error: 'creator_performance table not set up' }, { status: 200 })
  }
}
