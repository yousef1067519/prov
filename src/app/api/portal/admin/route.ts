import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { newToken } from '@/lib/portalData'

// Agency-side client-portal management, persisted to the DB (was localStorage).
// Portal token lives on campaigns.client_access_token; review items live in
// content_approvals. The public /api/portal/[token] read side already uses these.

export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { sb, userId } = ctx

  const { data: campaigns } = await sb.from('campaigns')
    .select('id, name, niche, client_name, client_email, client_access_token')
    .eq('user_id', userId)

  const enabled = (campaigns ?? []).filter(c => c.client_access_token)
  const tokens = enabled.map(c => c.client_access_token)
  const { data: content } = tokens.length
    ? await sb.from('content_approvals').select('id, access_token, title, preview, status').in('access_token', tokens).order('created_at')
    : { data: [] as { id: string; access_token: string; title: string; preview: string; status: string }[] }

  const configs: Record<string, unknown> = {}
  for (const c of enabled) {
    configs[c.id] = {
      token: c.client_access_token,
      clientName: c.client_name ?? '',
      clientEmail: c.client_email ?? '',
      content: (content ?? []).filter(x => x.access_token === c.client_access_token)
        .map(x => ({ id: x.id, title: x.title ?? '', preview: x.preview ?? '', status: x.status })),
    }
  }
  return NextResponse.json({ campaigns: campaigns ?? [], configs })
}

export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { sb, userId } = ctx
  const body = await req.json().catch(() => ({}))
  const { action, campaignId } = body

  // Confirm the campaign belongs to this workspace.
  const { data: camp } = await sb.from('campaigns').select('id, client_access_token').eq('id', campaignId).eq('user_id', userId).maybeSingle()
  if (!camp) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  const token = camp.client_access_token as string | null

  switch (action) {
    case 'enable': {
      const t = token ?? newToken()
      await sb.from('campaigns').update({ client_access_token: t }).eq('id', campaignId)
      return NextResponse.json({ ok: true, token: t })
    }
    case 'disable': {
      if (token) await sb.from('content_approvals').delete().eq('access_token', token)
      await sb.from('campaigns').update({ client_access_token: null }).eq('id', campaignId)
      return NextResponse.json({ ok: true })
    }
    case 'details': {
      await sb.from('campaigns').update({ client_name: body.clientName ?? null, client_email: body.clientEmail ?? null }).eq('id', campaignId)
      return NextResponse.json({ ok: true })
    }
    case 'content_add': {
      if (!token) return NextResponse.json({ error: 'Enable the portal first' }, { status: 400 })
      const { data } = await sb.from('content_approvals')
        .insert({ campaign_id: campaignId, access_token: token, title: body.title ?? '', preview: body.preview ?? '', status: 'pending' })
        .select('id').single()
      return NextResponse.json({ ok: true, id: data?.id })
    }
    case 'content_update': {
      await sb.from('content_approvals').update({ title: body.title ?? '', preview: body.preview ?? '' }).eq('id', body.contentId).eq('access_token', token)
      return NextResponse.json({ ok: true })
    }
    case 'content_remove': {
      await sb.from('content_approvals').delete().eq('id', body.contentId).eq('access_token', token)
      return NextResponse.json({ ok: true })
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
