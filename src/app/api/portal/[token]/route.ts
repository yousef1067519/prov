import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { demoPayload, type PortalPayload, type Approval, type PortalMessage } from '@/lib/portalData'

function sb() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    { cookies: { getAll: async () => (await cookies()).getAll(), setAll: () => {} } }
  )
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  if (token === 'demo') return NextResponse.json({ portal: demoPayload(token) })

  try {
    const supabase = sb()
    const { data: campaign } = await supabase.from('campaigns').select('*').eq('client_access_token', token).maybeSingle()
    if (!campaign) {
      if (process.env.DEV_BYPASS_AUTH === 'true') return NextResponse.json({ portal: demoPayload(token) })
      return NextResponse.json({ error: 'Invalid or expired portal link.' }, { status: 404 })
    }

    const [{ data: emails }, { data: responses }, { data: invoices }, { data: approvals }, { data: messages }] = await Promise.all([
      supabase.from('emails_sent').select('status, opened_at, recipient_type').eq('campaign_id', campaign.id),
      supabase.from('responses').select('id').eq('campaign_id', campaign.id),
      supabase.from('invoices').select('amount, status').eq('campaign_id', campaign.id),
      supabase.from('content_approvals').select('*').eq('access_token', token).order('created_at'),
      supabase.from('portal_messages').select('*').eq('access_token', token).order('created_at'),
    ])

    const em = emails ?? []
    const sent = em.length
    const opened = em.filter(e => e.opened_at || ['opened', 'clicked', 'replied'].includes(e.status)).length
    const paid = (invoices ?? []).filter(i => i.status === 'paid')
    const revenue = paid.reduce((a, i) => a + Number(i.amount || 0), 0)

    const payload: PortalPayload = {
      campaign: { id: campaign.id, name: campaign.name, niche: campaign.niche ?? 'General', status: campaign.status, created_at: campaign.created_at },
      client: { name: campaign.client_name ?? 'Client', email: campaign.client_email ?? '' },
      agency: { name: 'Your Agency', brand: 'Prov' },
      progress: {
        creatorsSelected: campaign.creator_ids?.length ?? 0,
        influencersConfirmed: 0,
        sponsorsContacted: campaign.sponsor_ids?.length ?? 0,
        stepLabel: campaign.status === 'won' ? 'Completed' : 'In progress',
        stepIndex: campaign.status === 'won' ? 4 : 2, totalSteps: 4,
      },
      metrics: { emailsSent: sent, openRate: sent ? Math.round((opened / sent) * 1000) / 10 : 0, replies: (responses ?? []).length, dealsClosed: paid.length, revenue },
      timeline: [],
      approvals: (approvals as Approval[]) ?? [],
      messages: (messages as PortalMessage[]) ?? [],
      demo: false,
    }
    return NextResponse.json({ portal: payload })
  } catch {
    return NextResponse.json({ portal: demoPayload(token) })
  }
}
