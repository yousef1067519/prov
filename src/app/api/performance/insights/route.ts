import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { generateCreatorInsights } from '@/lib/insightEngine'

// GET  /api/performance/insights?creator_id= — stored ProvBot insights
// POST /api/performance/insights { creator_id } — (re)generate now
export async function GET(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creator_id = req.nextUrl.searchParams.get('creator_id')
  let q = ctx.sb.from('creator_ai_insights').select('*').eq('agency_id', ctx.userId).order('generated_at', { ascending: false }).limit(50)
  if (creator_id) q = q.eq('creator_id', creator_id)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ insights: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { creator_id } = await req.json().catch(() => ({}))
  if (!creator_id) return NextResponse.json({ error: 'Missing creator_id' }, { status: 400 })

  try {
    const insights = await generateCreatorInsights(ctx.sb, ctx.userId, creator_id)
    if (!insights.length) {
      return NextResponse.json({ insights: [], note: 'Need at least 2 tracked campaigns to find patterns.' })
    }
    return NextResponse.json({ insights })
  } catch (e) {
    return NextResponse.json({ error: `Insight generation failed: ${String(e)}` }, { status: 500 })
  }
}
