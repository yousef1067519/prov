import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Aggregates everything needed for a campaign PDF report into one JSON payload.
// The client (pdf-generator.ts) turns this into a downloadable PDF.
export async function POST(req: NextRequest) {
  const { campaignId } = await req.json().catch(() => ({ campaignId: null }))
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  // Auth (skipped in dev-bypass).
  if (process.env.DEV_BYPASS_AUTH !== 'true') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Pull the campaign + everything linked to it.
  const [{ data: campaign }, { data: emails }, { data: responses }, { data: contracts }, { data: invoices }] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', campaignId).maybeSingle(),
    supabase.from('emails_sent').select('recipient_type, recipient_name, status, opened_at, clicked_at, replied_at, sent_at').eq('campaign_id', campaignId),
    supabase.from('responses').select('from_name, from_email, deal_status, recipient_type, created_at').eq('campaign_id', campaignId),
    supabase.from('contracts').select('status, influencer_name, sponsor_name, amount').eq('campaign_id', campaignId),
    supabase.from('invoices').select('brand_name, amount, status').eq('campaign_id', campaignId),
  ])

  const emailRows = emails ?? []
  const respRows = responses ?? []
  const contractRows = (contracts as { status?: string; influencer_name?: string; sponsor_name?: string; amount?: number }[]) ?? []
  const invoiceRows = (invoices as { brand_name?: string; amount?: number; status?: string }[]) ?? []

  // ── Headline counts ──
  const creatorEmails = emailRows.filter(e => e.recipient_type === 'creator')
  const sponsorEmails = emailRows.filter(e => e.recipient_type === 'sponsor')
  const creatorsContacted = creatorEmails.length || (campaign?.creator_ids?.length ?? 0)
  const sponsorsMatched = sponsorEmails.length || (campaign?.sponsor_ids?.length ?? 0)

  const sent = emailRows.length
  const opened = emailRows.filter(e => e.opened_at || ['opened', 'clicked', 'replied'].includes(e.status)).length
  const clicked = emailRows.filter(e => e.clicked_at || e.status === 'clicked').length
  const repliesCount = respRows.length || emailRows.filter(e => e.replied_at || e.status === 'replied').length

  const signedContracts = contractRows.filter(c => c.status === 'signed')
  const influencersConfirmed = signedContracts.length || respRows.filter(r => ['confirmed', 'won', 'agreed'].includes(String(r.deal_status))).length

  // Revenue from paid invoices (fallback to signed-contract amounts).
  const paidInvoices = invoiceRows.filter(i => i.status === 'paid')
  const revenue = paidInvoices.reduce((a, i) => a + Number(i.amount || 0), 0)
    || signedContracts.reduce((a, c) => a + Number(c.amount || 0), 0)
  const dealsClosed = paidInvoices.length || signedContracts.length

  // ── Rates ──
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0)
  const openRate = pct(opened, sent)
  const clickRate = pct(clicked, sent)
  const conversion = pct(dealsClosed, repliesCount)

  // Estimated ROI: revenue vs. estimated outreach cost (~$3/email of tooling+time).
  const estCost = Math.max(sent * 3, 1)
  const roi = revenue > 0 ? Math.round(((revenue - estCost) / estCost) * 100) : 0

  // ── Chart series ──
  // Open rates by audience
  const openByType = [
    { label: 'Creators', sent: creatorEmails.length, opened: creatorEmails.filter(e => e.opened_at || ['opened', 'clicked', 'replied'].includes(e.status)).length },
    { label: 'Sponsors', sent: sponsorEmails.length, opened: sponsorEmails.filter(e => e.opened_at || ['opened', 'clicked', 'replied'].includes(e.status)).length },
  ]

  // Replies over time (by week since campaign start)
  const start = campaign?.created_at ? new Date(campaign.created_at) : new Date()
  const replyOverTime: { label: string; value: number }[] = []
  for (let w = 0; w < 4; w++) {
    const from = new Date(start.getTime() + w * 7 * 864e5)
    const to = new Date(start.getTime() + (w + 1) * 7 * 864e5)
    const value = respRows.filter(r => { const d = new Date(r.created_at); return d >= from && d < to }).length
    replyOverTime.push({ label: `Wk ${w + 1}`, value })
  }

  // Revenue by sponsor
  const bySponsor = new Map<string, number>()
  for (const i of paidInvoices) bySponsor.set(i.brand_name || 'Unknown', (bySponsor.get(i.brand_name || 'Unknown') || 0) + Number(i.amount || 0))
  const revenueBySponsor = [...bySponsor.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6)

  // Funnel
  const funnel = [
    { label: 'Contacted', value: sent || creatorsContacted + sponsorsMatched },
    { label: 'Opened', value: opened },
    { label: 'Replied', value: repliesCount },
    { label: 'Deals', value: dealsClosed },
  ]

  // Top performers
  const topInfluencers = signedContracts.slice(0, 5).map(c => ({ name: c.influencer_name || 'Creator', metric: c.amount ? `$${Number(c.amount).toLocaleString()}` : 'Confirmed' }))
  const sponsorDeals = new Map<string, number>()
  for (const i of paidInvoices) sponsorDeals.set(i.brand_name || 'Unknown', (sponsorDeals.get(i.brand_name || 'Unknown') || 0) + 1)
  const topSponsors = [...sponsorDeals.entries()].map(([name, deals]) => ({ name, deals })).sort((a, b) => b.deals - a.deals).slice(0, 5)

  return NextResponse.json({
    report: {
      campaign: campaign
        ? { id: campaign.id, name: campaign.name, niche: campaign.niche, status: campaign.status, created_at: campaign.created_at }
        : { id: campaignId, name: 'Campaign', niche: '', status: 'active', created_at: new Date().toISOString() },
      creatorsContacted, influencersConfirmed, sponsorsMatched,
      emails: { sent, opened, clicked, openRate, clickRate },
      replies: { count: repliesCount, conversion },
      deals: { count: dealsClosed, revenue },
      roi,
      charts: { openByType, replyOverTime, revenueBySponsor, funnel },
      topInfluencers, topSponsors,
    },
  })
}
