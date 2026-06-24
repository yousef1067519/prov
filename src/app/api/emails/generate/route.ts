import { NextRequest, NextResponse } from 'next/server'
import { generateEmailTemplates } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    influencerName, influencerNiche, influencerPlatform,
    influencerSubscribers, influencerEngagement,
    sponsorName, sponsorIndustry, sponsorBudget, agencyName,
  } = body

  if (!influencerName || !sponsorName) {
    return NextResponse.json({ error: 'influencerName and sponsorName are required' }, { status: 400 })
  }

  // Dev/no-key fallback: return realistic mock templates so the flow is testable
  if (!process.env.ANTHROPIC_API_KEY) {
    const first = String(influencerName).split(' ')[0]
    return NextResponse.json({
      templates: {
        influencerEmail: {
          subject: `${sponsorName} x ${first} — paid partnership`,
          body: `Hi ${first},\n\nWe represent ${sponsorName} (${sponsorIndustry}) and love your ${influencerNiche} content on ${influencerPlatform}. With your ${influencerEngagement}% engagement, you're exactly who they want for their next campaign.\n\nBudget is in the ${sponsorBudget} range. Would you be open to a quick call this week to discuss deliverables?\n\nBest,\n${agencyName ?? 'The Prov Team'}`,
        },
        sponsorEmail: {
          subject: `Creator match for ${sponsorName}: ${influencerName}`,
          body: `Hi ${sponsorName} team,\n\nWe found a strong fit for your ${sponsorIndustry} campaign: ${influencerName}, a ${influencerNiche} creator on ${influencerPlatform} with ${influencerSubscribers} subscribers and ${influencerEngagement}% engagement — top-tier for the niche.\n\nThey're interested and available. Shall we set up an intro and share the full media kit?\n\nBest,\n${agencyName ?? 'The Prov Team'}`,
        },
        followUpEmail: {
          subject: `Re: ${sponsorName} x ${first}`,
          body: `Hi ${first},\n\nJust circling back on the ${sponsorName} partnership — still keen to make this work with you. Happy to adjust deliverables to fit your schedule. Worth a quick chat?\n\nBest,\n${agencyName ?? 'The Prov Team'}`,
        },
      },
    })
  }

  try {
    const templates = await generateEmailTemplates({
      influencerName, influencerNiche, influencerPlatform,
      influencerSubscribers, influencerEngagement,
      sponsorName, sponsorIndustry, sponsorBudget, agencyName,
    })
    return NextResponse.json({ templates })
  } catch (err) {
    console.error('Email generation error:', err)
    return NextResponse.json({ error: 'Failed to generate emails' }, { status: 500 })
  }
}
