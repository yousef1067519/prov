import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { randomBytes } from 'crypto'

// POST /api/performance/case-study — convert a tracked campaign into a case
// study (or update one). Auto-populates from the record; caller can override.
// Body: { performance_id, case_study_data?, publish? }
export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { performance_id, case_study_data = {}, publish = true } = await req.json().catch(() => ({}))
  if (!performance_id) return NextResponse.json({ error: 'Missing performance_id' }, { status: 400 })

  const { data: rec, error } = await ctx.sb
    .from('performance_campaigns')
    .select('*')
    .eq('agency_id', ctx.userId)
    .eq('id', performance_id)
    .single()
  if (error || !rec) return NextResponse.json({ error: 'Record not found' }, { status: 404 })

  // Auto-populate from the campaign, then let caller overrides win.
  const auto = {
    campaign_goal: `Drive awareness and sales for ${rec.product_promoted || rec.brand_name}`,
    results_summary: `${rec.creator_handle} generated ${Number(rec.metrics?.views ?? 0).toLocaleString()} views and $${Number(rec.metrics?.revenue_generated ?? 0).toLocaleString()} in attributed revenue for ${rec.brand_name}, with ${rec.metrics?.engagement_rate ?? 0}% engagement.`,
    revenue: rec.metrics?.revenue_generated ?? 0,
    roi: rec.roi_generated ?? 0,
    media_links: rec.platforms ?? {},
    lessons_learned: [],
    hero_image: null,
  }
  const merged = { ...auto, ...case_study_data }

  const slug = rec.case_study_slug ?? `${rec.creator_handle}-${rec.brand_name}`
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    .slice(0, 60) + '-' + randomBytes(3).toString('hex')

  const { data: updated, error: upErr } = await ctx.sb
    .from('performance_campaigns')
    .update({ is_case_study: publish, case_study_data: merged, case_study_slug: slug, updated_at: new Date().toISOString() })
    .eq('id', performance_id)
    .select('id, case_study_slug, case_study_data, is_case_study')
    .single()
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, case_study: updated, public_url: `/case-study/${updated.case_study_slug}` })
}
