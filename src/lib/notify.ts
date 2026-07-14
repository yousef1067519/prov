import type { SupabaseClient } from '@supabase/supabase-js'

export async function getWebhooks(sb: SupabaseClient, ownerId: string): Promise<{ slack: string | null; zapier: string | null }> {
  const { data } = await sb.from('integration_settings')
    .select('slack_webhook_url, zapier_webhook_url').eq('owner_id', ownerId).maybeSingle()
  return { slack: data?.slack_webhook_url ?? null, zapier: data?.zapier_webhook_url ?? null }
}

/**
 * Fire an event to the owner's configured Slack + Zapier webhooks. Best-effort:
 * never throws, never blocks the caller's main work.
 */
export async function dispatchEvent(
  sb: SupabaseClient,
  ownerId: string,
  opts: { event: string; text: string; data?: Record<string, unknown> },
): Promise<void> {
  try {
    const { slack, zapier } = await getWebhooks(sb, ownerId)
    const jobs: Promise<unknown>[] = []
    if (slack) jobs.push(fetch(slack, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: `:zap: *Prov* — ${opts.text}` }),
    }).catch(() => {}))
    if (zapier) jobs.push(fetch(zapier, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: opts.event, text: opts.text, ...(opts.data ?? {}) }),
    }).catch(() => {}))
    await Promise.allSettled(jobs)
  } catch { /* notifications are non-critical */ }
}
