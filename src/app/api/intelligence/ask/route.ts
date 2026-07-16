import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { aiChat, aiEnabled } from '@/lib/claude'

// POST { question } — answer natural-language questions from the workspace's OWN
// deal history: tracked campaign performance, pipeline deals, and send/reply stats.
// This is "institutional memory" made queryable: the model only sees this
// workspace's data and is instructed to answer strictly from it.
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!aiEnabled()) return NextResponse.json({ error: 'AI is not configured on this server.' }, { status: 400 })

  const b = await req.json().catch(() => ({}))
  const question = String(b.question ?? '').trim().slice(0, 500)
  if (!question) return NextResponse.json({ error: 'Ask a question first.' }, { status: 400 })

  // ── Gather a compact snapshot of this workspace's history ────────────────
  const { data: perf } = await ctx.sb
    .from('performance_campaigns')
    .select('brand_name, creator_handle, product_promoted, campaign_date_posted, campaign_status, metrics, performance_score, roi_generated')
    .eq('agency_id', ctx.userId)
    .order('campaign_date_posted', { ascending: false })
    .limit(80)

  let deals: Record<string, unknown>[] = []
  if (ctx.workspaceId) {
    const { data } = await ctx.sb
      .from('deals')
      .select('name, stage, value_cents, created_at, stage_changed_at, won_strategy, clients(name), creators(name, niche, platform)')
      .eq('workspace_id', ctx.workspaceId)
      .order('created_at', { ascending: false })
      .limit(100)
    deals = (data as Record<string, unknown>[]) ?? []
  }

  const [{ count: sent }, { count: replied }] = await Promise.all([
    ctx.sb.from('emails_sent').select('*', { count: 'exact', head: true }).eq('user_id', ctx.userId),
    ctx.sb.from('emails_sent').select('*', { count: 'exact', head: true }).eq('user_id', ctx.userId).eq('status', 'replied'),
  ])

  const perfRows = (perf ?? []).map(r => ({
    brand: r.brand_name,
    creator: r.creator_handle,
    product: r.product_promoted,
    date: typeof r.campaign_date_posted === 'string' ? r.campaign_date_posted.slice(0, 10) : null,
    status: r.campaign_status,
    views: r.metrics?.views ?? 0,
    revenue: r.metrics?.revenue_generated ?? 0,
    engagement: r.metrics?.engagement_rate ?? 0,
    score: r.performance_score,
    roi: r.roi_generated,
  }))
  const dealRows = deals.map(d => ({
    name: d.name,
    stage: d.stage,
    value_usd: Math.round(Number(d.value_cents ?? 0) / 100),
    client: (d.clients as { name?: string } | null)?.name ?? null,
    creator: (d.creators as { name?: string; niche?: string } | null)?.name ?? null,
    niche: (d.creators as { niche?: string } | null)?.niche ?? null,
    created: typeof d.created_at === 'string' ? d.created_at.slice(0, 10) : null,
    won_strategy: d.won_strategy ?? null,
  }))

  if (!perfRows.length && !dealRows.length && !(sent ?? 0)) {
    return NextResponse.json({
      answer: "There's no deal history to query yet. Once you track campaigns in Intelligence and run deals through the Pipeline, you can ask things like “which sponsors respond best to fitness creators?” and get answers from your own data.",
    })
  }

  try {
    const answer = await aiChat({
      maxTokens: 700,
      system:
        'You are the intelligence engine of Prov, answering an agency\'s questions about THEIR OWN deal history. ' +
        'Answer ONLY from the data provided — never invent campaigns, brands, numbers, or trends that are not in it. ' +
        'Quote the actual numbers. If the data is too thin to answer, say so plainly and say what data would answer it. ' +
        'Be concise: a direct answer first, then 1-3 supporting bullets max. Plain text, no markdown headers.',
      messages: [{
        role: 'user',
        content:
          `WORKSPACE DATA\n\nTracked campaign performance (${perfRows.length}):\n${JSON.stringify(perfRows)}\n\n` +
          `Pipeline deals (${dealRows.length}):\n${JSON.stringify(dealRows)}\n\n` +
          `Outreach: ${sent ?? 0} emails sent, ${replied ?? 0} replies.\n\n` +
          `QUESTION: ${question}`,
      }],
    })
    return NextResponse.json({ answer: answer.trim() })
  } catch (e) {
    console.error('intelligence/ask failed:', (e as Error).message)
    return NextResponse.json({ error: 'Could not answer right now — try again.' }, { status: 500 })
  }
}
