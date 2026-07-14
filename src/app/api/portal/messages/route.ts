import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Post a message to the campaign thread (client → agency, or agency → client).
export async function POST(req: NextRequest) {
  const { token, message, sender = 'client', campaignId } = await req.json().catch(() => ({}))
  if (!token || !message?.trim()) return NextResponse.json({ error: 'token and message required' }, { status: 400 })
  if (token === 'demo') return NextResponse.json({ ok: true, demo: true })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
      { cookies: { getAll: async () => (await cookies()).getAll(), setAll: () => {} } }
    )
    const { error } = await supabase.from('portal_messages').insert({
      access_token: token, campaign_id: campaignId ?? null, sender: sender === 'agency' ? 'agency' : 'client', message: message.trim(),
    })
    if (error) return NextResponse.json({ ok: true, persisted: false })
    return NextResponse.json({ ok: true, persisted: true })
  } catch {
    return NextResponse.json({ ok: true, persisted: false })
  }
}
