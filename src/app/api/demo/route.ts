import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/apiUser'
import { sendEmail } from '@/lib/resend'

// Sales-led inbound (§8.1): stores the application and notifies the team.
// No account is created here — enterprise accounts are provisioned by ops.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const agency_name = String(b.agency_name ?? '').trim().slice(0, 160)
  const contact_name = String(b.contact_name ?? '').trim().slice(0, 120)
  const email = String(b.email ?? '').trim().toLowerCase().slice(0, 200)
  if (!agency_name || !contact_name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'agency_name, contact_name and a valid email are required' }, { status: 400 })
  }

  const { error } = await serviceClient().from('demo_requests').insert({
    agency_name, contact_name, email,
    team_size: b.team_size ? String(b.team_size).slice(0, 40) : null,
    clients_count: b.clients_count ? String(b.clients_count).slice(0, 40) : null,
    monthly_deals: b.monthly_deals ? String(b.monthly_deals).slice(0, 40) : null,
    message: b.message ? String(b.message).slice(0, 2000) : null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the team — non-fatal if email transport isn't configured, but the
  // request always lands in demo_requests regardless. Logged so a delivery
  // failure (e.g. sender domain not verified in Resend) is visible in server
  // logs instead of silently vanishing.
  try {
    await sendEmail({
      to: process.env.SUPPORT_INBOX ?? 'providemediabrands@gmail.com',
      subject: `Demo request: ${agency_name}`,
      body: `${contact_name} <${email}>\nTeam size: ${b.team_size ?? '—'}\nClients: ${b.clients_count ?? '—'}\nDeals/mo: ${b.monthly_deals ?? '—'}\n\n${b.message ?? ''}`,
    })
  } catch (e) {
    console.error('demo request notification email failed:', e instanceof Error ? e.message : e)
  }

  return NextResponse.json({ ok: true })
}
