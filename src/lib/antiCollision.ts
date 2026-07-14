// Anti-collision signals for creator discovery (§8.3).
//
// The creators catalog is shared across every Prov workspace, so before an AM
// pitches a creator we surface three warnings scoped to THEIR workspace:
//   1. active_deal        — the creator is already in an active deal here
//   2. competing_sponsor  — the creator has been pitched for a different
//                           sponsor/client than the one in context (or is in
//                           active deals for 2+ distinct sponsors/clients)
//   3. audience_overlaps  — the creator shares >40% audience with a creator
//                           already on one of this workspace's shortlists
// (Cross-workspace collision — two Prov customers pitching the same person —
// is handled separately by the 0015 contact cooldown in creatorFilters.ts.)
import type { SupabaseClient } from '@supabase/supabase-js'

/** Deal stages that count as "active" for collision purposes. */
export const ACTIVE_DEAL_STAGES = ['sourced', 'outreach', 'negotiating', 'contract', 'live'] as const

/** Shortlisted creators sharing more than this % audience trigger a warning. */
export const OVERLAP_WARN_PCT = 40

export interface OverlapWarning {
  with_creator_id: string
  with_creator_name: string | null
  overlap_pct: number
}

export interface CollisionFlags {
  /** Creator already sits in an active (not completed/lost) deal in this workspace. */
  active_deal: boolean
  active_deal_count: number
  /** Creator was pitched for a competing sponsor/client within this workspace. */
  competing_sponsor: boolean
  /** Shortlisted creators in this workspace sharing >OVERLAP_WARN_PCT% audience. */
  audience_overlaps: OverlapWarning[]
}

interface DealRow { creator_id: string | null; sponsor_id: string | null; client_id: string | null }

const csv = (ids: string[]) => ids.map(id => `"${id}"`).join(',')

/**
 * Compute collision flags for a set of creator ids inside one workspace.
 * `svc` must be a service-role client (deals/shortlists RLS is workspace-
 * membership based; API routes act through the service client + explicit
 * workspace scoping, same as every other route).
 */
export async function collisionFlags(
  svc: SupabaseClient,
  workspaceId: string,
  creatorIds: string[],
  opts: { sponsorId?: string | null; clientId?: string | null } = {},
): Promise<Record<string, CollisionFlags>> {
  const ids = [...new Set(creatorIds)].filter(Boolean)
  const out: Record<string, CollisionFlags> = {}
  if (!ids.length) return out
  for (const id of ids) out[id] = { active_deal: false, active_deal_count: 0, competing_sponsor: false, audience_overlaps: [] }

  // 1 + 2 — active deals in this workspace touching any of these creators.
  const { data: deals } = await svc
    .from('deals')
    .select('creator_id, sponsor_id, client_id')
    .eq('workspace_id', workspaceId)
    .in('creator_id', ids)
    .in('stage', [...ACTIVE_DEAL_STAGES])
  for (const d of (deals ?? []) as DealRow[]) {
    if (!d.creator_id || !out[d.creator_id]) continue
    const f = out[d.creator_id]
    f.active_deal = true
    f.active_deal_count += 1
    if (opts.sponsorId && d.sponsor_id && d.sponsor_id !== opts.sponsorId) f.competing_sponsor = true
    if (opts.clientId && d.client_id && d.client_id !== opts.clientId) f.competing_sponsor = true
  }
  // No sponsor/client context: still flag creators being pitched for 2+
  // distinct sponsors or clients at once (double-pitched inside the workspace).
  if (!opts.sponsorId && !opts.clientId) {
    const byCreator = new Map<string, { sponsors: Set<string>; clients: Set<string> }>()
    for (const d of (deals ?? []) as DealRow[]) {
      if (!d.creator_id) continue
      const e = byCreator.get(d.creator_id) ?? { sponsors: new Set(), clients: new Set() }
      if (d.sponsor_id) e.sponsors.add(d.sponsor_id)
      if (d.client_id) e.clients.add(d.client_id)
      byCreator.set(d.creator_id, e)
    }
    for (const [cid, e] of byCreator) {
      if (out[cid] && (e.sponsors.size >= 2 || e.clients.size >= 2)) out[cid].competing_sponsor = true
    }
  }

  // 3 — audience overlap vs creators already shortlisted in this workspace.
  try {
    const { data: shortlisted } = await svc
      .from('shortlist_creators')
      .select('creator_id, shortlists!inner(workspace_id)')
      .eq('shortlists.workspace_id', workspaceId)
      .limit(500)
    const shortIds = [...new Set((shortlisted ?? []).map(r => r.creator_id as string))]
    if (shortIds.length) {
      const a = csv(ids), b = csv(shortIds)
      const { data: overlaps } = await svc
        .from('creator_audience_overlap')
        .select('creator_a, creator_b, overlap_pct')
        .gt('overlap_pct', OVERLAP_WARN_PCT)
        .or(`and(creator_a.in.(${a}),creator_b.in.(${b})),and(creator_a.in.(${b}),creator_b.in.(${a}))`)
        .limit(400)

      const partnerIds = new Set<string>()
      for (const o of overlaps ?? []) { partnerIds.add(o.creator_a as string); partnerIds.add(o.creator_b as string) }
      const names = new Map<string, string>()
      if (partnerIds.size) {
        const { data: rows } = await svc.from('creators').select('id, name').in('id', [...partnerIds])
        for (const r of rows ?? []) names.set(r.id as string, r.name as string)
      }
      for (const o of overlaps ?? []) {
        // Pairs are direction-agnostic — attach the warning to whichever side is in the result set.
        for (const [self, other] of [[o.creator_a, o.creator_b], [o.creator_b, o.creator_a]] as [string, string][]) {
          if (out[self] && self !== other) {
            out[self].audience_overlaps.push({
              with_creator_id: other,
              with_creator_name: names.get(other) ?? null,
              overlap_pct: Number(o.overlap_pct),
            })
          }
        }
      }
    }
  } catch { /* 0022 not applied yet — overlap warnings are best-effort */ }

  return out
}
