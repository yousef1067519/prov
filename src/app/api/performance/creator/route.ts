import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { aggregateCreatorStats, type PerfRecord } from '@/lib/performanceScore'

// GET /api/performance/creator?creator_id=UUID — lifetime stats + full history
export async function GET(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creator_id = req.nextUrl.searchParams.get('creator_id')
  if (!creator_id) return NextResponse.json({ error: 'Missing creator_id' }, { status: 400 })

  const { data: campaigns, error } = await ctx.sb
    .from('performance_campaigns')
    .select('*')
    .eq('agency_id', ctx.userId)
    .eq('creator_id', creator_id)
    .order('campaign_date_posted', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const stats = aggregateCreatorStats((campaigns ?? []) as PerfRecord[])
  return NextResponse.json({ creator_id, ...stats, campaigns: campaigns ?? [] })
}
