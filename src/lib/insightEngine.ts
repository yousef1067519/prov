import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

// ProvBot insight generation: summarize a creator's tracked campaigns and ask
// Claude for concrete, quotable patterns an agency can use in negotiations.

interface InsightRow {
  insight_type: string
  insight_text: string
  metric_value: number | null
  confidence_score: number
  is_actionable: boolean
  next_action_recommendation: string | null
}

export async function generateCreatorInsights(
  sb: SupabaseClient,
  agencyId: string,
  creatorId: string,
): Promise<InsightRow[]> {
  const { data: records } = await sb
    .from('performance_campaigns')
    .select('brand_name, campaign_name, product_promoted, campaign_date_posted, campaign_status, platforms, metrics, performance_score')
    .eq('agency_id', agencyId)
    .eq('creator_id', creatorId)
    .order('campaign_date_posted', { ascending: true })

  if (!records || records.length < 2) return [] // not enough signal for patterns

  // Compact summary — keep tokens low, numbers exact.
  const summary = records.map(r => ({
    brand: r.brand_name,
    product: r.product_promoted,
    date: r.campaign_date_posted?.slice(0, 10),
    status: r.campaign_status,
    platforms: Object.keys(r.platforms ?? {}),
    views: r.metrics?.views ?? 0,
    revenue: r.metrics?.revenue_generated ?? 0,
    engagement: r.metrics?.engagement_rate ?? 0,
    cpm: r.metrics?.estimated_cpm ?? 0,
    score: r.performance_score,
  }))

  const anthropic = new Anthropic()
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `You are ProvBot, the analytics engine of an influencer-marketing platform. Analyze this creator's sponsored-campaign history and return 3-6 insights an agency could quote to a brand or use to plan the next deal.

Campaign history (JSON):
${JSON.stringify(summary)}

Rules:
- Only state patterns the data actually supports; include the numbers.
- Each insight is one sentence, concrete and quotable.
- Return ONLY a JSON array, no prose. Each element:
  {"insight_type": "performance_pattern" | "platform_preference" | "brand_fit" | "trend" | "recommendation",
   "insight_text": string,
   "metric_value": number | null,
   "confidence_score": number (0-1),
   "is_actionable": boolean,
   "next_action_recommendation": string | null}`,
    }],
  })

  const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '[]'
  const jsonStart = text.indexOf('[')
  const jsonEnd = text.lastIndexOf(']')
  if (jsonStart === -1 || jsonEnd === -1) return []

  let parsed: InsightRow[] = []
  try { parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) } catch { return [] }

  const clean = parsed.filter(i => i && i.insight_text).slice(0, 6).map(i => ({
    insight_type: String(i.insight_type || 'performance_pattern').slice(0, 40),
    insight_text: String(i.insight_text).slice(0, 500),
    metric_value: Number.isFinite(Number(i.metric_value)) ? Number(i.metric_value) : null,
    confidence_score: Math.max(0, Math.min(1, Number(i.confidence_score) || 0.5)),
    is_actionable: Boolean(i.is_actionable),
    next_action_recommendation: i.next_action_recommendation ? String(i.next_action_recommendation).slice(0, 500) : null,
  }))

  if (clean.length) {
    // Replace previous run's insights for this creator.
    await sb.from('creator_ai_insights').delete().eq('agency_id', agencyId).eq('creator_id', creatorId)
    await sb.from('creator_ai_insights').insert(clean.map(i => ({ ...i, agency_id: agencyId, creator_id: creatorId })))
  }
  return clean
}
