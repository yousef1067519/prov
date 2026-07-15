import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { aiChat, aiEnabled } from '@/lib/claude'
import { TEMPLATE_VARIABLES } from '@/lib/emailStrategies'

// POST { subject, body } — AI-personalize a user-written outreach template.
// Keeps the sender's voice and all [Bracket] variables intact (those are filled
// per-recipient at send time), tightens the writing, and strengthens the hook/CTA.
// The result replaces the editor contents client-side; nothing is saved until the
// user hits Save, so they always review what the AI did.
export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!aiEnabled()) {
    return NextResponse.json({ error: 'AI is not configured on this server.' }, { status: 400 })
  }

  const b = await req.json().catch(() => ({}))
  const subject = String(b.subject ?? '').slice(0, 300)
  const body = String(b.body ?? '').slice(0, 6000)
  if (!body.trim()) return NextResponse.json({ error: 'Write a draft first — the AI improves your template, it doesn’t start from nothing.' }, { status: 400 })

  try {
    const raw = await aiChat({
      maxTokens: 900,
      jsonMode: true,
      system:
        'You improve influencer-outreach email templates written by marketing agency staff. ' +
        'Rules: keep the writer\'s voice and intent — you are editing, not replacing. Keep it the same length or shorter. ' +
        `Placeholders in [Brackets] are merge variables filled per recipient (${TEMPLATE_VARIABLES.join(', ')}); keep every variable the writer used, exactly as written, and you may add one only where it clearly increases personalization. ` +
        'Sharpen the subject line, the first sentence (the hook), and the call to action. Remove filler and generic flattery. No fake statistics. Return ONLY JSON.',
      messages: [{
        role: 'user',
        content: `Improve this outreach template. Return JSON exactly as {"subject": "...", "body": "..."}.\n\nSubject: ${subject}\n\nBody:\n${body}`,
      }],
    })
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
    const outSubject = String(parsed.subject ?? subject).slice(0, 300)
    const outBody = String(parsed.body ?? '').trim()
    if (!outBody) throw new Error('empty result')
    return NextResponse.json({ subject: outSubject, body: outBody })
  } catch (e) {
    console.error('emails/polish failed:', (e as Error).message)
    return NextResponse.json({ error: 'The AI couldn’t improve this draft right now — try again.' }, { status: 500 })
  }
}
