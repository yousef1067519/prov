// AI helper — backed by DeepSeek (OpenAI-compatible API). The filename is kept as
// claude.ts only so existing '@/lib/claude' imports don't churn; there is no Anthropic
// dependency anymore. Uses deepseek-chat, DeepSeek's cheapest model.
//
// Requires DEEPSEEK_API_KEY (get one at https://platform.deepseek.com/api_keys).

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'
const MODEL = 'deepseek-chat' // cheapest DeepSeek model (V3, non-reasoning)

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

/** True when an AI key is configured. Call sites use this to decide fallback vs. live. */
export function aiEnabled(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY)
}

/**
 * Single entry point for all model calls. Returns the assistant's text.
 * `jsonMode` turns on DeepSeek's JSON output mode (the prompt must mention JSON).
 */
export async function aiChat(opts: {
  messages: ChatMessage[]
  system?: string
  maxTokens?: number
  jsonMode?: boolean
}): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set')

  const messages = opts.system
    ? [{ role: 'system' as const, content: opts.system }, ...opts.messages]
    : opts.messages

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: opts.maxTokens ?? 800,
      ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`DeepSeek API ${res.status}: ${detail.slice(0, 300)}`)
  }
  const data = await res.json()
  return String(data?.choices?.[0]?.message?.content ?? '')
}

export async function suggestEmailResponse(replyMessage: string, context: {
  recipientName: string
  recipientType: 'creator' | 'sponsor'
  originalSubject: string
}) {
  return aiChat({
    maxTokens: 500,
    messages: [{
      role: 'user',
      content: `You are an expert influencer marketing agency deal closer.

A ${context.recipientType} named "${context.recipientName}" replied to our outreach email with subject "${context.originalSubject}".

Their reply: "${replyMessage}"

Write a short, professional response that moves this deal forward. Be direct, confident, and focused on closing. No fluff. Max 150 words. Output ONLY the email body, no subject line.`,
    }],
  })
}

/** Parse a natural-language creator search into structured filters. */
export async function parseDiscoveryQuery(query: string) {
  const text = await aiChat({
    maxTokens: 300,
    jsonMode: true,
    messages: [{
      role: 'user',
      content: `Extract creator-search filters from this request and return ONLY JSON (no prose):

"${query}"

Schema (omit any field not mentioned):
{
  "niche": "Tech|Beauty|Fitness|Gaming|Food|Travel|Finance|Fashion|Lifestyle|Business|Education",
  "min_followers": number,
  "max_followers": number,
  "min_engagement": number,
  "min_avg_views": number,
  "country": ["United States", ...],
  "platform": "YouTube|Instagram|TikTok|Twitch|LinkedIn|Twitter/X",
  "language": "English|Spanish|..."
}
Convert 50k→50000, 1.2m→1200000. Return only the JSON object.`,
    }],
  })
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in response')
  return JSON.parse(match[0])
}

export interface ContractInput {
  type: 'influencer' | 'sponsor'
  agencyName: string
  creatorName: string
  sponsorName: string
  niche: string
  campaignName: string
  deliverables: string
  amount: string
  timeline: string
}

/** Generate one contract body (influencer or sponsor) with the standard clauses. */
export async function generateContract(data: ContractInput): Promise<string> {
  const who = data.type === 'influencer'
    ? `the creator (${data.creatorName})`
    : `the brand/sponsor (${data.sponsorName})`
  const clauses = data.type === 'influencer'
    ? 'deliverables, timeline and deadlines, payment amount and schedule, content usage rights and duration, exclusivity (no competitor promotion), FTC disclosure requirements, revisions allowed, and termination.'
    : 'campaign scope, budget and payment schedule (e.g. 50/50), deliverables expected, timeline, the creator being promoted, brand usage rights, performance expectations, confidentiality, and termination.'

  return aiChat({
    maxTokens: 1400,
    messages: [{
      role: 'user',
      content: `Draft a clear, professional influencer-marketing agreement between ${data.agencyName} (the agency) and ${who} for the campaign "${data.campaignName}" in the ${data.niche} niche.

Deal terms: deliverables = ${data.deliverables}; fee = ${data.amount}; timeline = ${data.timeline}.

Near the top, immediately after the parties and campaign line, include a short "HOW TO SIGN" section stating that the recipient can accept electronically by replying to the delivery email with the words "I AGREE" (or signing the block at the end), that under the U.S. ESIGN Act and UETA this electronic reply is a legally binding signature equal to a handwritten one, and that the reply date is the execution date.

Include numbered sections covering: ${clauses}

End with a signatures block that says acceptance can be electronic ("reply I AGREE") or by signing the lines.

Plain English, no legalese padding. Use [BRACKETED] placeholders for anything not provided. Output only the contract text.`,
    }],
  })
}

export async function generateEmailTemplates(data: {
  influencerName: string
  influencerNiche: string
  influencerPlatform: string
  influencerSubscribers: number
  influencerEngagement: number
  sponsorName: string
  sponsorIndustry: string
  sponsorBudget: string
  agencyName?: string
}) {
  const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : `${(n/1_000).toFixed(0)}K`

  const text = await aiChat({
    maxTokens: 1500,
    jsonMode: true,
    messages: [{
      role: 'user',
      content: `Generate 3 email templates for an influencer marketing deal. Return ONLY valid JSON.

Creator: ${data.influencerName} | ${data.influencerNiche} | ${data.influencerPlatform} | ${fmt(data.influencerSubscribers)} subscribers | ${data.influencerEngagement}% engagement
Sponsor: ${data.sponsorName} | ${data.sponsorIndustry} | Budget: ${data.sponsorBudget}
Agency: ${data.agencyName ?? 'our agency'}

Return this exact JSON structure:
{
  "influencerEmail": { "subject": "...", "body": "..." },
  "sponsorEmail": { "subject": "...", "body": "..." },
  "followUpEmail": { "subject": "...", "body": "..." }
}

Rules:
- influencerEmail: pitch the sponsorship deal to the creator (150 words max)
- sponsorEmail: pitch this creator to the brand (150 words max)
- followUpEmail: 5-day follow-up if no response (80 words max)
- Professional, direct, deal-focused. No fluff.`,
    }],
  })

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Invalid AI response format')
  return JSON.parse(match[0]) as {
    influencerEmail: { subject: string; body: string }
    sponsorEmail: { subject: string; body: string }
    followUpEmail: { subject: string; body: string }
  }
}
