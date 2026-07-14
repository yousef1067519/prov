import { createClient } from '@/lib/supabase/client'

// The "first win" metrics that onboarding and the conversion logic optimize for.
export interface WinMetrics {
  outreachSent: number
  replies: number
  positiveResponses: number
  bookedCalls: number
}

export const EMPTY_WINS: WinMetrics = { outreachSent: 0, replies: 0, positiveResponses: 0, bookedCalls: 0 }

// Deal statuses that count as a positive signal / booked call.
const POSITIVE = ['interested', 'positive', 'agreed', 'won', 'confirmed', 'negotiating']
const BOOKED = ['call_booked', 'meeting', 'booked', 'won', 'confirmed']

export async function fetchWinMetrics(): Promise<WinMetrics> {
  const sb = createClient()
  try {
    const [sent, resp] = await Promise.all([
      sb.from('emails_sent').select('*', { count: 'exact', head: true }),
      sb.from('responses').select('deal_status'),
    ])
    const rows = resp.data ?? []
    return {
      outreachSent: sent.count ?? 0,
      replies: rows.length,
      positiveResponses: rows.filter(r => POSITIVE.includes(String(r.deal_status))).length,
      bookedCalls: rows.filter(r => BOOKED.includes(String(r.deal_status))).length,
    }
  } catch {
    return EMPTY_WINS
  }
}

// The activation milestone: the first measurable win. Drives the conversion modal.
export function hasFirstWin(m: WinMetrics): boolean {
  return m.replies > 0 || m.positiveResponses > 0 || m.bookedCalls > 0 || m.outreachSent >= 50
}

export function winReason(m: WinMetrics): string {
  if (m.bookedCalls > 0) return `You booked ${m.bookedCalls} call${m.bookedCalls > 1 ? 's' : ''}`
  if (m.positiveResponses > 0) return `You got ${m.positiveResponses} positive response${m.positiveResponses > 1 ? 's' : ''}`
  if (m.replies > 0) return `You got your first repl${m.replies > 1 ? 'ies' : 'y'}`
  return `You've sent ${m.outreachSent} outreach emails`
}
