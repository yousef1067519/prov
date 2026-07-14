import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { dispatchEvent } from '@/lib/notify'

const isHttps = (s: unknown) => typeof s === 'string' && (s === '' || /^https:\/\//.test(s))

// GET — the owner's configured webhook URLs.
export async function GET() {
  const c = await apiCtx()
  if (!c) return NextResponse.json({ slack: '', zapier: '' })
  const { data } = await c.sb.from('integration_settings')
    .select('slack_webhook_url, zapier_webhook_url').eq('owner_id', c.userId).maybeSingle()
  return NextResponse.json({ slack: data?.slack_webhook_url ?? '', zapier: data?.zapier_webhook_url ?? '' })
}

// POST { slack?, zapier? } — save. POST { test: 'slack' | 'zapier' } — send a test event.
export async function POST(req: NextRequest) {
  const c = await apiCtx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))

  if (body.test === 'slack' || body.test === 'zapier') {
    await dispatchEvent(c.sb, c.userId, { event: 'test', text: `Test notification from your Prov workspace ✅`, data: { source: 'settings_test' } })
    return NextResponse.json({ ok: true })
  }

  if (!isHttps(body.slack) || !isHttps(body.zapier)) {
    return NextResponse.json({ error: 'Webhook URLs must start with https://' }, { status: 400 })
  }
  const { error } = await c.sb.from('integration_settings').upsert({
    owner_id: c.userId,
    slack_webhook_url: body.slack ? String(body.slack).slice(0, 500) : null,
    zapier_webhook_url: body.zapier ? String(body.zapier).slice(0, 500) : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'owner_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
