import { NextRequest, NextResponse } from 'next/server'
import { creatorsReadClient } from '@/lib/supabase/readClient'
import { applyCreatorFilters, type CreatorFilters } from '@/lib/creatorFilters'
import { apiCtx } from '@/lib/apiUser'
import { collisionFlags, type CollisionFlags } from '@/lib/antiCollision'
import type { Influencer } from '@/lib/types'

const MAX_PAGE = 100

// Server-side, filtered, paginated creator search. Scales to millions of rows
// because filtering + pagination happen in Postgres, not in the browser.
//
// Anti-collision (§8.3): each returned creator carries a `collision` object —
// active deal in this workspace, pitched for a competing sponsor/client, and
// >40% audience overlap with already-shortlisted creators. Pass `client_id`
// or `sponsor_id` in the body to flag collisions against that context.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const filters: CreatorFilters = body.filters ?? {}
  const limit = Math.min(MAX_PAGE, Math.max(1, Number(body.limit) || 20))
  const offset = Math.max(0, Number(body.offset) || 0)

  // The creators table is shared across every Prov workspace — lock out
  // creators someone else recently cold-emailed so two customers don't pitch
  // the same person. A workspace can still see (and re-message) its own contacts.
  const ctx = await apiCtx()
  if (ctx) filters.exclude_locked_for = ctx.userId

  try {
    const supabase = await creatorsReadClient()

    let q = supabase.from('creators').select('*', { count: 'exact' })
    q = applyCreatorFilters(q, filters)
    const { data, count, error } = await q.order('subscribers', { ascending: false }).range(offset, offset + limit - 1)

    if (error) return NextResponse.json({ creators: [], total: 0, error: error.message })

    let creators = (data ?? []) as (Influencer & { collision?: CollisionFlags })[]

    // Workspace-scoped anti-collision flags (best effort — never block search).
    if (ctx?.workspaceId && creators.length) {
      try {
        const flags = await collisionFlags(ctx.sb, ctx.workspaceId, creators.map(c => c.id), {
          clientId: typeof body.client_id === 'string' ? body.client_id : null,
          sponsorId: typeof body.sponsor_id === 'string' ? body.sponsor_id : null,
        })
        creators = creators.map(c => ({ ...c, collision: flags[c.id] }))
      } catch { /* 0020/0022 not applied yet */ }
    }

    return NextResponse.json({ creators, total: count ?? 0, source: 'db' })
  } catch {
    return NextResponse.json({ creators: [], total: 0 })
  }
}
