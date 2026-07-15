import { serviceClient } from '@/lib/apiUser'
import { sendEmail } from '@/lib/resend'

export type SendCodeResult =
  | { ok: true; type: 'email' | 'signup'; devCode?: string }
  | { ok: false; error: string }

/**
 * Generate an 8-digit sign-in code via Supabase admin (no email is sent by Supabase) and
 * deliver it through Resend. Bypasses Supabase's rate-limited built-in email and the
 * magic-link redirect loop entirely — a pure code flow used by /login and trial signup.
 */
export async function sendLoginCode(email: string): Promise<SendCodeResult> {
  const addr = String(email ?? '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) return { ok: false, error: 'Enter a valid email address' }

  const svc = serviceClient()
  // Existing user → magiclink; new user → signup (creates the account). Both yield email_otp.
  let gen = await svc.auth.admin.generateLink({ type: 'magiclink', email: addr })
  if (gen.error) gen = await svc.auth.admin.generateLink({ type: 'signup', email: addr, password: crypto.randomUUID() })

  const otp = gen.data?.properties?.email_otp
  const type: 'email' | 'signup' = gen.data?.properties?.verification_type === 'signup' ? 'signup' : 'email'
  if (gen.error || !otp) return { ok: false, error: gen.error?.message || 'Could not generate a code' }

  // SHOW_LOGIN_CODE=true (LOCAL DEV ONLY) returns the code in the response so you can test
  // logging in as any email without working email delivery. MUST be removed before going live.
  const reveal = process.env.SHOW_LOGIN_CODE === 'true'

  try {
    await sendEmail({
      to: addr,
      subject: `Your Prov sign-in code: ${otp}`,
      body:
        `Your Prov verification code is:\n\n    ${otp}\n\n` +
        `Enter it on the sign-in page to continue. The code expires in 1 hour.\n\n` +
        `If you didn't request this, you can safely ignore this email.`,
    })
  } catch (e) {
    // In dev-reveal mode a failed send is fine — the code is returned instead.
    if (!reveal) return { ok: false, error: `Could not send the email: ${(e as Error).message}` }
  }
  return { ok: true, type, ...(reveal ? { devCode: otp } : {}) }
}
