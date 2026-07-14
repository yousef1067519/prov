import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/resend'

// Internal support inbox. BACKEND-ONLY — this constant must NEVER be returned in an API
// response, rendered in the UI, or logged in a way the client can read. It lives only in
// this server module, imported solely by route handlers.
const SUPPORT_INBOX = process.env.SUPPORT_INBOX || 'providemediabrands@gmail.com'

// The ONLY thing the user is ever told on escalation.
export const ESCALATION_REPLY = 'Your request has been forwarded to our support team.'

export type Priority = 'low' | 'medium' | 'high'

export function inferPriority(message: string): Priority {
  if (/\b(urgent|asap|immediately|broken|can'?t (?:log|access|use|open)|down|critical|charged|refund|locked out)\b/i.test(message)) return 'high'
  if (/\b(bug|error|issue|not working|problem|fail|glitch)\b/i.test(message)) return 'medium'
  return 'low'
}

/**
 * Create a support ticket for the user and fire the internal email notification.
 * Email send failures are swallowed (logged) so they never break ticket creation
 * or surface the inbox address to the caller.
 */
export async function createTicketAndEscalate(
  sb: SupabaseClient,
  userId: string,
  message: string,
  opts: { priority?: Priority; metadata?: Record<string, unknown> } = {},
): Promise<{ id: string }> {
  const priority = opts.priority ?? inferPriority(message)
  const { data, error } = await sb
    .from('support_tickets')
    .insert({ user_id: userId, message, status: 'open', priority, metadata: opts.metadata ?? {} })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  try {
    await sendEmail({
      to: SUPPORT_INBOX,
      from: 'Prov Support <support@prov.com>',
      subject: `[${priority.toUpperCase()}] New support ticket ${data.id}`,
      body:
        `A new support ticket was created.\n\n` +
        `Ticket ID: ${data.id}\nUser ID: ${userId}\nPriority: ${priority}\n\n` +
        `Message:\n${message}`,
    })
  } catch (e) {
    // Do not rethrow — ticket already exists; just record the failure server-side.
    console.error('support notification email failed:', (e as Error).message)
  }

  return { id: data.id }
}
