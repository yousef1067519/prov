// Prebuilt campaign templates that power one-click onboarding. Each defines a
// goal, a target-profile definition, and a message sequence (first touch + two
// follow-ups). Language is facilitator-style — never "we represent brands".

export type CampaignGoal = 'influencer' | 'brand' | 'agency'

export interface CampaignTemplate {
  goal: CampaignGoal
  label: string
  tagline: string
  /** Recommended niche to preselect (user can change). */
  recommendedNiche: string
  /** Plain-English description of who this targets. */
  targetProfile: string
  /** Default audience filters used to auto-pick creators. */
  defaults: { min_followers?: number; min_engagement?: number }
  sequence: { step: string; subject: string; body: string }[]
}

const SIG = '\n\n[YourName]\n[YourTitle] | [CompanyName]\n[CompanyEmail]'

export const CAMPAIGN_TEMPLATES: Record<CampaignGoal, CampaignTemplate> = {
  influencer: {
    goal: 'influencer',
    label: 'Influencer outreach',
    tagline: 'Reach creators and line up paid collaborations.',
    recommendedNiche: 'Tech',
    targetProfile: 'Creators in your niche with engaged audiences (25K–500K followers, 4%+ engagement) who take brand deals.',
    defaults: { min_followers: 25000, min_engagement: 4 },
    sequence: [
      { step: 'First message', subject: 'Loved your recent [Niche] content, [FirstName]',
        body: `Hi [FirstName],\n\nReally enjoyed your recent [Platform] content — your take on [Niche] clearly resonates with your [Followers] audience.\n\nI work with brands looking to partner with creators like you, and I think there could be a strong fit. Would you be open to a quick chat about paid collaboration opportunities?\n\nIf helpful, just reply with your current rates and I'll line up something that fits.${SIG}` },
      { step: 'Follow-up (day 3)', subject: 'Re: collaboration with [CompanyName]',
        body: `Hi [FirstName],\n\nJust floating this back up — I'd love to explore a paid collaboration that fits your content. Happy to work around your schedule and rates.\n\nWorth a quick reply?${SIG}` },
      { step: 'Follow-up (day 7)', subject: 'Last note, [FirstName]',
        body: `Hi [FirstName],\n\nI'll stop here so I'm not crowding your inbox. If partnering with brands is something you're open to now or down the line, just reply "interested" and I'll take it from there.${SIG}` },
    ],
  },
  brand: {
    goal: 'brand',
    label: 'Brand partnership outreach',
    tagline: 'Pitch creators to brands and book sponsorships.',
    recommendedNiche: 'Business',
    targetProfile: 'Brands and marketing teams in your niche that sponsor creators and have active campaign budgets.',
    defaults: { min_followers: 50000 },
    sequence: [
      { step: 'First message', subject: 'Creator partnership idea for [SponsorName]',
        body: `Hi there,\n\nI help brands like [SponsorName] connect with vetted creators in the [Niche] space who consistently drive engagement and conversions.\n\nI have a shortlist of creators whose audiences line up well with your customers. Would you be open to a quick call to see if a partnership makes sense this quarter?${SIG}` },
      { step: 'Follow-up (day 3)', subject: 'Re: creator partnerships for [SponsorName]',
        body: `Hi,\n\nFollowing up — I can send over a couple of creator profiles with audience and engagement stats so you can see the fit before any call.\n\nWant me to send those across?${SIG}` },
      { step: 'Follow-up (day 7)', subject: 'Closing the loop, [SponsorName]',
        body: `Hi,\n\nLast note from me for now. If creator partnerships are on your roadmap, reply "send profiles" and I'll share a tailored shortlist — no obligation.${SIG}` },
    ],
  },
  agency: {
    goal: 'agency',
    label: 'Agency client acquisition',
    tagline: 'Win brands and creators as paying agency clients.',
    recommendedNiche: 'Business',
    targetProfile: 'Growing brands and creators who would pay an agency to run their influencer marketing end to end.',
    defaults: { min_followers: 30000 },
    sequence: [
      { step: 'First message', subject: 'Running [Niche] influencer campaigns for you',
        body: `Hi [FirstName],\n\nI run an agency that handles influencer marketing end to end — finding the right creators, negotiating deals, and managing campaigns so you don't have to.\n\nGiven what you're building in [Niche], I think we could take a lot off your plate and drive real results. Open to a 15-minute intro call?${SIG}` },
      { step: 'Follow-up (day 3)', subject: 'Re: handling your influencer campaigns',
        body: `Hi [FirstName],\n\nQuick nudge — I can share a short overview of how we'd approach campaigns for you, including the kind of creators we'd target.\n\nWant me to send it over?${SIG}` },
      { step: 'Follow-up (day 7)', subject: 'One last note, [FirstName]',
        body: `Hi [FirstName],\n\nI'll leave it here for now. If outsourcing your influencer marketing is something you'd consider, just reply "tell me more" and I'll follow up with specifics.${SIG}` },
    ],
  },
}

export const GOAL_OPTIONS: { goal: CampaignGoal; label: string; desc: string }[] = [
  { goal: 'influencer', label: 'Influencer outreach', desc: 'Reach creators and line up paid collaborations.' },
  { goal: 'brand', label: 'Brand outreach', desc: 'Pitch creators to brands and book sponsorships.' },
  { goal: 'agency', label: 'Agency client acquisition', desc: 'Win brands and creators as paying clients.' },
]

/** Fill [Placeholder] variables in a template string from a creator + branding. */
export function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\[(\w+)\]/g, (m, key) => vars[key] ?? m)
}
