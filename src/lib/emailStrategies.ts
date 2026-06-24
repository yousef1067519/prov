// Step 1 cold-outreach strategies — sent TO CREATORS ONLY.
// Hard rule: never "we represent a brand" / "we work with brands". The agency
// is a facilitator/connector. First person ("I help / I connect / I match").

export interface EmailStrategy {
  id: string
  name: string
  bestFor: string
  tone: string
  conversion: 'Medium' | 'Medium-High' | 'High' | 'Highest'
  subject: string
  body: string
}

export const STEP1_STRATEGIES: EmailStrategy[] = [
  {
    id: 'compliment',
    name: 'Compliment + Rate Inquiry',
    bestFor: 'Building rapport before talking business',
    tone: 'Friendly, casual',
    conversion: 'Medium',
    subject: 'Your [VideoType] caught our attention!',
    body:
`Hey [FirstName],

I was checking your latest [Platform] video on [Topic]. Awesome stuff!

I saw in a previous video that you were doing brand deals. Are you still open to partnerships?

What are your current rates for [Platform] content?`,
  },
  {
    id: 'direct',
    name: 'Direct Value Prop',
    bestFor: 'Creators who want straight to the point',
    tone: 'Professional, direct',
    conversion: 'Medium-High',
    subject: 'Partnership opportunity',
    body:
`Hey [FirstName],

I help creators like you connect with high-paying partnership opportunities.

Based on your content and audience, I think there might be some good fits for you. Would you be open to exploring opportunities?

What are your typical rates and availability?`,
  },
  {
    id: 'social-proof',
    name: 'Social Proof + Scarcity',
    bestFor: 'High-performing creators (100k+)',
    tone: 'Confident, exclusive',
    conversion: 'High',
    subject: 'Partnership opportunity',
    body:
`Hey [FirstName],

I've been helping creators land premium partnerships in the [Niche] space. Just closed a deal for another creator last month.

Your engagement rate and audience are exactly what brands are looking for right now. Interested in a quick conversation about opportunities?`,
  },
  {
    id: 'personalized',
    name: 'Personalized Content Reference',
    bestFor: 'Deep personalization, highest conversion',
    tone: 'Thoughtful, authentic',
    conversion: 'Highest',
    subject: 'Loved your [Topic] video',
    body:
`Hey [FirstName],

Just watched your recent video on [Topic]. The way you explained it was really insightful, and your audience clearly connects with that content style.

I connect creators with partnership opportunities that align with authentic content like yours. Would be worth a quick conversation about some options I'm seeing in your niche.

Available for a 15-min call this week?`,
  },
  {
    id: 'problem-solution',
    name: 'Problem-Solution',
    bestFor: 'Monetization-focused creators',
    tone: 'Helpful, relatable',
    conversion: 'High',
    subject: 'Monetization opportunity',
    body:
`Hey [FirstName],

A lot of creators I work with say the hardest part isn't getting followers. It's converting that audience into revenue.

I specialize in matching creators with partnership opportunities that pay well for authentic content. If that's something you're interested in, let's chat.

What's working best for you right now on [Platform]?`,
  },
]

// Step 2 — sent TO SPONSORS. Mentions the creator + confirmed rate. Still a
// facilitator: "I work with [creator]", never "we represent".
export const STEP2_SPONSOR: EmailStrategy = {
  id: 'sponsor-pitch',
  name: 'Sponsor Pitch (Step 2)',
  bestFor: 'Pitching a confirmed creator to a brand',
  tone: 'Professional, confident',
  conversion: 'High',
  subject: 'Premium [Niche] creator partnership opportunity',
  body:
`Hey [SponsorName],

I work with [CreatorName], a [Platform] creator in [Niche] with [Followers] followers and [Engagement]% engagement.

Recent performance:
- Avg views per video: [AvgViews]
- Engagement rate: [Engagement]%

Their rate for this partnership is [CreatorRate].

I have a short window this week to lock this in. Is this a fit for an upcoming campaign?`,
}

export interface Branding {
  agency_name?: string
  agency_title?: string
  company_name?: string
  company_email?: string
}

/** Build the email signature from agency branding (placeholders if unset). */
export function buildSignature(b: Branding): string {
  return [
    'Best,',
    b.agency_name || '[Your Name]',
    `${b.agency_title || '[Your Title]'} | ${b.company_name || '[Company Name]'}`,
    b.company_email || '[Company Email]',
  ].join('\n')
}

export const TEMPLATE_VARIABLES = [
  '[FirstName]', '[LastName]', '[Platform]', '[Topic]', '[VideoType]',
  '[Niche]', '[Followers]', '[Engagement]', '[AvgViews]',
  '[SponsorName]', '[CreatorName]', '[CreatorRate]',
]
