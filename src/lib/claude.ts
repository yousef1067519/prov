import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

export function getAnthropicClient() {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

export async function suggestEmailResponse(replyMessage: string, context: {
  recipientName: string
  recipientType: 'creator' | 'sponsor'
  originalSubject: string
}) {
  const client = getAnthropicClient()
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `You are an expert influencer marketing agency deal closer.

A ${context.recipientType} named "${context.recipientName}" replied to our outreach email with subject "${context.originalSubject}".

Their reply: "${replyMessage}"

Write a short, professional response that moves this deal forward. Be direct, confident, and focused on closing. No fluff. Max 150 words. Output ONLY the email body, no subject line.`,
    }],
  })

  return (msg.content[0] as { text: string }).text
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
  const client = getAnthropicClient()
  const who = data.type === 'influencer'
    ? `the creator (${data.creatorName})`
    : `the brand/sponsor (${data.sponsorName})`
  const clauses = data.type === 'influencer'
    ? 'deliverables, timeline and deadlines, payment amount and schedule, content usage rights and duration, exclusivity (no competitor promotion), FTC disclosure requirements, revisions allowed, and termination.'
    : 'campaign scope, budget and payment schedule (e.g. 50/50), deliverables expected, timeline, the creator being promoted, brand usage rights, performance expectations, confidentiality, and termination.'

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1400,
    messages: [{
      role: 'user',
      content: `Draft a clear, professional influencer-marketing agreement between ${data.agencyName} (the agency) and ${who} for the campaign "${data.campaignName}" in the ${data.niche} niche.

Deal terms: deliverables = ${data.deliverables}; fee = ${data.amount}; timeline = ${data.timeline}.

Include numbered sections covering: ${clauses}

Plain English, no legalese padding. Use [BRACKETED] placeholders for anything not provided. Output only the contract text.`,
    }],
  })
  return (msg.content[0] as { text: string }).text
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
  const client = getAnthropicClient()
  const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : `${(n/1_000).toFixed(0)}K`

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
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

  const text = (msg.content[0] as { text: string }).text
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Invalid AI response format')
  return JSON.parse(match[0]) as {
    influencerEmail: { subject: string; body: string }
    sponsorEmail: { subject: string; body: string }
    followUpEmail: { subject: string; body: string }
  }
}
