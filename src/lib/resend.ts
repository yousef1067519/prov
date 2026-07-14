import { Resend } from 'resend'

let _resend: Resend | null = null

export function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

export async function sendEmail(opts: {
  to: string
  subject: string
  body: string
  from?: string
}) {
  const resend = getResend()
  const { data, error } = await resend.emails.send({
    // EMAIL_FROM lets you use a verified domain in prod. Default is Resend's shared test
    // sender, which works immediately with just an API key (but only delivers to your own
    // Resend account email until you verify a domain).
    from: opts.from ?? process.env.EMAIL_FROM ?? 'Prov <onboarding@resend.dev>',
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
  })
  if (error) throw new Error(error.message)
  return data
}
