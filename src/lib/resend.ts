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
    from: opts.from ?? 'Prov <outreach@prov.com>',
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
  })
  if (error) throw new Error(error.message)
  return data
}
