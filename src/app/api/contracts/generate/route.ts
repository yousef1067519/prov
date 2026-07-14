import { NextRequest, NextResponse } from 'next/server'
import { generateContract, type ContractInput } from '@/lib/claude'

function fallbackContract(d: ContractInput): string {
  const today = new Date().toISOString().slice(0, 10)
  if (d.type === 'influencer') {
    return `INFLUENCER PARTNERSHIP AGREEMENT
Date: ${today}

Between: ${d.agencyName} ("Agency") and ${d.creatorName} ("Creator")
Campaign: ${d.campaignName} (${d.niche})

HOW TO SIGN
You can accept this agreement electronically. Reply to the email that delivered it with the words "I AGREE" (or sign the block at the end). Under the U.S. ESIGN Act and the Uniform Electronic Transactions Act (UETA), your electronic reply is a legally binding signature with the same effect as a handwritten one. The date and time of your reply will be recorded as the execution date.

1. DELIVERABLES
   ${d.deliverables}

2. TIMELINE & DEADLINES
   ${d.timeline}. Drafts due 5 business days before each publish date.

3. PAYMENT
   Total fee: ${d.amount}. Paid 50% on signing and 50% within 14 days of final delivery.

4. CONTENT USAGE RIGHTS
   ${d.sponsorName} may use the delivered content on owned channels for 12 months from publish. Paid amplification requires Creator's written consent.

5. EXCLUSIVITY
   Creator will not promote a direct competitor of ${d.sponsorName} for 30 days around each publish date.

6. FTC DISCLOSURE
   Creator will clearly disclose the paid partnership (e.g. "#ad" / "Paid partnership with ${d.sponsorName}") per FTC guidelines.

7. REVISIONS
   Up to two rounds of reasonable revisions per deliverable are included.

8. TERMINATION
   Either party may terminate for material breach with 7 days' written notice. Work completed to date is payable.

9. SIGNATURES
   Accept electronically by replying "I AGREE" to the delivery email, or sign here:
   ${d.agencyName}: __________________   Date: ________
   ${d.creatorName}: _________________   Date: ________`
  }
  return `BRAND CAMPAIGN AGREEMENT
Date: ${today}

Between: ${d.agencyName} ("Agency") and ${d.sponsorName} ("Brand")
Campaign: ${d.campaignName} (${d.niche})
Creator promoted: ${d.creatorName}

HOW TO SIGN
You can accept this agreement electronically. Reply to the email that delivered it with the words "I AGREE" (or sign the block at the end). Under the U.S. ESIGN Act and the Uniform Electronic Transactions Act (UETA), your electronic reply is a legally binding signature with the same effect as a handwritten one. The date and time of your reply will be recorded as the execution date.

1. CAMPAIGN SCOPE
   ${d.deliverables}, delivered by the Agency through ${d.creatorName}.

2. BUDGET & PAYMENT SCHEDULE
   Total budget: ${d.amount}. 50% due on signing, 50% on campaign completion. Net 14 terms.

3. TIMELINE
   ${d.timeline}.

4. BRAND USAGE RIGHTS
   Brand receives usage rights to campaign content on owned channels for 12 months from publish.

5. PERFORMANCE
   Agency will share reach, engagement, and click metrics within 7 days of campaign end. No specific performance is guaranteed unless stated here: [PERFORMANCE TARGETS].

6. CONFIDENTIALITY
   Both parties keep deal terms and shared materials confidential.

7. TERMINATION
   Either party may terminate for material breach with 7 days' written notice. Fees for delivered work remain payable.

8. SIGNATURES
   Accept electronically by replying "I AGREE" to the delivery email, or sign here:
   ${d.agencyName}: __________________   Date: ________
   ${d.sponsorName}: _________________   Date: ________`
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const base = {
    agencyName: body.agencyName || 'Your Agency',
    creatorName: body.creatorName || '[CREATOR]',
    sponsorName: body.sponsorName || '[BRAND]',
    niche: body.niche || 'general',
    campaignName: body.campaignName || 'Campaign',
    deliverables: body.deliverables || '1 dedicated video + 2 social posts',
    amount: body.amount || '[AMOUNT]',
    timeline: body.timeline || '30 days',
  }

  async function build(type: 'influencer' | 'sponsor') {
    const input: ContractInput = { ...base, type }
    if (!process.env.ANTHROPIC_API_KEY) return fallbackContract(input)
    try { return await generateContract(input) } catch { return fallbackContract(input) }
  }

  const [influencer, sponsor] = await Promise.all([build('influencer'), build('sponsor')])
  return NextResponse.json({ influencer, sponsor })
}
