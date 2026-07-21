import type { SupabaseClient } from '@supabase/supabase-js'

// Plan credit system. A credit = one outreach email sent. Usage is computed live
// from emails_sent — rolling windows, no counter tables to drift. Paid tiers use
// a CLAUDE-STYLE DAILY RESET: the cap is a per-24h allowance that refills every
// day (use it or lose it), NOT a monthly bucket you deplete. The free trial stays
// a one-time lifetime taste so it can't be farmed forever. Growth/Enterprise/legacy
// tiers are uncapped here; the flat 500-per-4h deliverability throttle in the send
// route still applies to everyone (that one protects domain reputation, not revenue).

export interface CreditPolicy {
  /** null = unlimited (no plan cap). */
  cap: number | null
  /** 'daily' = rolling 24h (resets every day); 'monthly' = rolling 30d; 'lifetime' = all-time. */
  window: 'daily' | 'monthly' | 'lifetime'
  planLabel: string
}

export function creditPolicy(accessType: string | null | undefined): CreditPolicy {
  switch (accessType ?? 'none') {
    case 'trial':   return { cap: 25,   window: 'lifetime', planLabel: 'Free trial' }
    case 'starter': return { cap: 300,  window: 'daily',    planLabel: 'Starter' }
    case 'solo':    return { cap: 1500, window: 'daily',    planLabel: 'Premium' }
    // Growth/Enterprise ('vip'), legacy standard/lifetime: no plan cap.
    default:        return { cap: null, window: 'monthly',  planLabel: 'Growth Agency' }
  }
}

export interface CreditStatus extends CreditPolicy {
  used: number
  /** Infinity when the plan is uncapped. */
  left: number
}

export async function creditStatus(
  sb: SupabaseClient, userId: string, accessType: string | null | undefined,
): Promise<CreditStatus> {
  const policy = creditPolicy(accessType)
  if (policy.cap === null) return { ...policy, used: 0, left: Infinity }

  let q = sb.from('emails_sent').select('*', { count: 'exact', head: true }).eq('user_id', userId)
  if (policy.window === 'daily') {
    q = q.gte('created_at', new Date(Date.now() - 864e5).toISOString())      // rolling 24h
  } else if (policy.window === 'monthly') {
    q = q.gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString())
  }
  const { count } = await q
  const used = count ?? 0
  return { ...policy, used, left: Math.max(0, policy.cap - used) }
}
