import { NextRequest, NextResponse } from 'next/server'
import { suggestEmailResponse } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { replyMessage, recipientName, recipientType, originalSubject } = body

  if (!replyMessage) {
    return NextResponse.json({ error: 'replyMessage is required' }, { status: 400 })
  }

  // Dev/no-key fallback so the AI assistant is demoable without a key
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      suggestion: `Thanks for getting back to me${recipientName ? `, ${recipientName}` : ''}! I completely understand. Here's what I can offer to make this work: we can structure the deal around performance milestones and add flexibility on timeline. Many of our partners have seen great results this way. Could we hop on a 15-minute call this week to lock in the details and get you started?`,
    })
  }

  try {
    const suggestion = await suggestEmailResponse(replyMessage, {
      recipientName: recipientName ?? 'Unknown',
      recipientType: recipientType ?? 'creator',
      originalSubject: originalSubject ?? '',
    })
    return NextResponse.json({ suggestion })
  } catch (err) {
    console.error('AI suggest error:', err)
    return NextResponse.json({ error: 'Failed to generate suggestion' }, { status: 500 })
  }
}
