// ICP expansion: vertical presets. ONE shared core (deals, contacts, contracts,
// invoices, bot, intelligence) — what changes per agency type is terminology,
// default pipeline stages, and marketing copy. Sold separately, built once.
// See .agents/go-to-market-plan.md §PHASE 3: never fork the core; vertical
// modules are additive. This file is the single source of truth for presets.

export type AgencyType = 'ima' | 'ugc' | 'social' | 'talent'

export const AGENCY_TYPES: AgencyType[] = ['ima', 'ugc', 'social', 'talent']

export interface VerticalPreset {
  id: AgencyType
  /** Short label used in pickers and settings. */
  label: string
  /** One-line description shown under the picker option. */
  blurb: string
  /** What a "deal" is called in this vertical. */
  dealNoun: string
  /** What the talent side is called. */
  creatorNoun: string
  /** Default pipeline stage names (core stages are the same objects underneath). */
  pipelineStages: string[]
  /** Marketing: /for/<slug> landing page. */
  slug: string
  headline: string
  subheadline: string
  pains: { title: string; detail: string }[]
  features: { title: string; detail: string }[]
}

export const VERTICALS: Record<AgencyType, VerticalPreset> = {
  ima: {
    id: 'ima',
    label: 'Influencer marketing agency',
    blurb: 'You run creator campaigns for brand clients.',
    dealNoun: 'deal',
    creatorNoun: 'creator',
    pipelineStages: ['Sourced', 'Outreach', 'Negotiating', 'Contracted', 'Live', 'Completed'],
    slug: 'influencer-agencies',
    headline: 'The operating system for influencer marketing agencies.',
    subheadline:
      'Every creator deal — outreach, negotiation, contract, invoice — in one place your agency owns. Run 2–3× more deals per account manager.',
    pains: [
      { title: 'Deals live in inboxes', detail: 'Sponsorships scattered across Gmail threads, DMs, and three different spreadsheets.' },
      { title: 'Deal history walks out the door', detail: 'When an account manager leaves, their relationships and deal knowledge leave with them.' },
      { title: 'Follow-ups fall through', detail: 'Deals go cold because nobody remembered to chase the third follow-up.' },
    ],
    features: [
      { title: 'Pipeline CRM built for creator deals', detail: 'Sourced → outreach → negotiating → live. Nothing goes cold silently.' },
      { title: 'Outreach with automatic follow-ups', detail: 'Personalized sequences from your own Gmail, replies auto-detected.' },
      { title: 'Institutional memory', detail: 'Every completed deal becomes searchable intelligence your agency owns forever.' },
    ],
  },
  ugc: {
    id: 'ugc',
    label: 'UGC / content agency',
    blurb: 'You produce creator content and license it to brands.',
    dealNoun: 'project',
    creatorNoun: 'creator',
    pipelineStages: ['Brief', 'Creator matched', 'In production', 'Revisions', 'Delivered', 'Licensed'],
    slug: 'ugc-agencies',
    headline: 'The operating system for UGC agencies.',
    subheadline:
      'Briefs, creators, revisions, deliverables, and usage rights — tracked in one system instead of a folder full of spreadsheets.',
    pains: [
      { title: 'Revision chaos', detail: 'Round 3 feedback buried in an email thread from two weeks ago.' },
      { title: 'Usage rights expire silently', detail: 'A brand keeps running an ad after the license window ended — and nobody caught it.' },
      { title: 'Deliverables scattered everywhere', detail: 'Raw files in Drive, briefs in Notion, invoices in a spreadsheet.' },
    ],
    features: [
      { title: 'Project pipeline built for content', detail: 'Brief → production → revisions → delivered → licensed. Every asset accounted for.' },
      { title: 'Contracts & invoices per project', detail: 'Clause-based agreements and finance-grade invoicing, built in.' },
      { title: 'Your agency’s memory', detail: 'Which creators deliver on time, which brands pay on time — queryable forever.' },
    ],
  },
  social: {
    id: 'social',
    label: 'Social media agency (influencer arm)',
    blurb: 'You manage social for brands and run creator collabs on top.',
    dealNoun: 'deal',
    creatorNoun: 'creator',
    pipelineStages: ['Sourced', 'Outreach', 'Negotiating', 'Contracted', 'Live', 'Completed'],
    slug: 'social-agencies',
    headline: 'Run your influencer arm like a product, not a side hustle.',
    subheadline:
      'Your social retainers live in one system — but creator collabs live in inboxes. Prov gives the influencer side of your agency its own operating system.',
    pains: [
      { title: 'The influencer arm runs on vibes', detail: 'Retainer work is systemized; creator deals are tracked in someone’s head.' },
      { title: 'No paper trail for collabs', detail: 'Contracts and usage terms for creator posts scattered or missing.' },
      { title: 'Can’t prove influencer ROI', detail: 'Clients ask what the creator budget returned. The answer lives in six tabs.' },
    ],
    features: [
      { title: 'A dedicated pipeline for creator deals', detail: 'Separate from your retainer work — every collab tracked end to end.' },
      { title: 'Contracts, invoices & FTC compliance', detail: 'Real paperwork for every post, disclosure proof stored per deliverable.' },
      { title: 'Client-ready reporting', detail: 'White-label reports that show exactly what the creator budget produced.' },
    ],
  },
  talent: {
    id: 'talent',
    label: 'Talent management',
    blurb: 'You represent creators and manage their brand deals.',
    dealNoun: 'deal',
    creatorNoun: 'talent',
    pipelineStages: ['Inbound', 'Qualifying', 'Negotiating', 'Contracted', 'Deliverables', 'Paid'],
    slug: 'talent-managers',
    headline: 'The operating system for talent managers.',
    subheadline:
      'Every inbound brand deal, every commission split, every deliverable across your whole roster — one system instead of a wall of spreadsheets.',
    pains: [
      { title: 'Roster-wide chaos', detail: 'Ten creators × five active deals each = fifty threads only you can untangle.' },
      { title: 'Commission math by hand', detail: 'Splits calculated in spreadsheets, statements assembled at month-end.' },
      { title: 'Double-booked exclusivity', detail: 'A talent signs a competing-brand deal because the exclusivity window wasn’t visible.' },
    ],
    features: [
      { title: 'Per-talent deal pipelines', detail: 'Every creator’s inbound deals tracked from first email to final payment.' },
      { title: 'Contracts & invoices built in', detail: 'Deal paperwork and finance-grade invoicing without leaving the system.' },
      { title: 'Roster intelligence', detail: 'Which brands come back, which pay late, what each talent actually earns — queryable.' },
    ],
  },
}

export function verticalBySlug(slug: string): VerticalPreset | null {
  return Object.values(VERTICALS).find(v => v.slug === slug) ?? null
}

export function isAgencyType(v: unknown): v is AgencyType {
  return typeof v === 'string' && (AGENCY_TYPES as string[]).includes(v)
}
