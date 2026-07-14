import type { SupabaseClient } from '@supabase/supabase-js'

// Record a team activity event. Best-effort — never throws into the caller.
export async function logActivity(
  sb: SupabaseClient,
  ownerId: string,
  entry: { actorEmail?: string; action: string; resourceType?: string; resourceId?: string; meta?: Record<string, unknown> },
): Promise<void> {
  try {
    await sb.from('team_activity_log').insert({
      owner_id: ownerId,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      resource_type: entry.resourceType ?? null,
      resource_id: entry.resourceId ?? null,
      meta: entry.meta ?? {},
    })
  } catch { /* activity logging is non-critical */ }
}
