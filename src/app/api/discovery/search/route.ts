import { NextRequest, NextResponse } from 'next/server'
import { creatorsReadClient } from '@/lib/supabase/readClient'
import { parseQueryLocal, rankCreators, type DiscoveryFilters } from '@/lib/discovery'
import { applyCreatorFilters } from '@/lib/creatorFilters'
import { parseDiscoveryQuery, aiEnabled } from '@/lib/claude'
import { apiCtx } from '@/lib/apiUser'
import { collisionFlags } from '@/lib/antiCollision'
import type { Influencer } from '@/lib/types'

// GET — the current user's saved discovery searches (most recent first).
export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ searches: [] })
  const { data } = await ctx.sb
    .from('ai_discoveries')
    .select('id, query, filters, result_count, results, created_at')
    .order('created_at', { ascending: false })
    .limit(20)
  return NextResponse.json({ searches: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { query } = await req.json().catch(() => ({ query: '' }))
  if (!query || typeof query !== 'string') return NextResponse.json({ error: 'query required' }, { status: 400 })

  // Parse: use the model when an API key is configured, otherwise the local heuristic.
  let filters: DiscoveryFilters
  let parsedBy: 'ai' | 'local' = 'local'
  if (aiEnabled()) {
    try { filters = await parseDiscoveryQuery(query); parsedBy = 'ai' }
    catch { filters = parseQueryLocal(query) }
  } else {
    filters = parseQueryLocal(query)
  }

  // Filter in the DB (scales to millions), then score the returned page in JS.
  // We over-fetch a bounded candidate set so ranking has room to reorder.
  let creators: Influencer[] = []
  try {
    const supabase = await creatorsReadClient()
    let q = supabase.from('creators').select('*')
    q = applyCreatorFilters(q, filters)
    const { data } = await q.order('subscribers', { ascending: false }).range(0, 199)
    if (data?.length) creators = data as Influencer[]
  } catch { /* no creators available */ }

  const results = rankCreators(creators, filters).slice(0, 40)

  // Persist the search to history (best effort — never block or fail the
  // response). Stored WITHOUT collision flags: those are point-in-time
  // workspace signals, recomputed on every fresh search.
  const ctx = await apiCtx()
  try {
    if (ctx) {
      await ctx.sb.from('ai_discoveries').insert({
        user_id: ctx.userId, query, filters, result_count: results.length, results,
      })
    }
  } catch { /* history is non-critical */ }

  // Anti-collision flags for the discovery cards (§8.3) — best effort.
  let flagged = results
  if (ctx?.workspaceId && results.length) {
    try {
      const flags = await collisionFlags(ctx.sb, ctx.workspaceId, results.map(r => r.id))
      flagged = results.map(r => ({ ...r, collision: flags[r.id] }))
    } catch { /* 0020/0022 not applied yet */ }
  }

  return NextResponse.json({ filters, parsedBy, count: flagged.length, results: flagged })
}
