import { NextRequest, NextResponse } from 'next/server'

// Sends a test payload to a user-provided incoming-webhook URL, server-side
// (Slack/Zapier webhooks block browser CORS). Host-allowlisted to prevent SSRF.
const ALLOWED_HOSTS = ['hooks.slack.com', 'hooks.zapier.com', 'hook.us1.make.com', 'hook.eu1.make.com']

export async function POST(req: NextRequest) {
  const { url, service } = await req.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Paste your webhook URL first.' }, { status: 400 })
  }
  let host: string
  try { host = new URL(url).host } catch { return NextResponse.json({ error: 'That does not look like a valid URL.' }, { status: 400 }) }
  if (!ALLOWED_HOSTS.includes(host)) {
    return NextResponse.json({ error: `Only Slack and Zapier webhook URLs are allowed (got ${host}).` }, { status: 400 })
  }

  // Slack wants { text }; Zapier/Make accept any JSON.
  const payload = service === 'Slack'
    ? { text: '✅ Prov is connected. You will get campaign, reply, and deal alerts here.' }
    : { event: 'prov.test', message: 'Prov is connected.', timestamp: new Date().toISOString() }

  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!r.ok) return NextResponse.json({ error: `Webhook responded ${r.status}. Check the URL.` }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Could not reach that webhook URL.' }, { status: 502 })
  }
}
