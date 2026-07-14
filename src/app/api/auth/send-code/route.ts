import { NextRequest, NextResponse } from 'next/server'
import { sendLoginCode } from '@/lib/authCode'

// POST { email } — send a 6-digit sign-in code via Resend (no Supabase email, no loop).
export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}))
  const r = await sendLoginCode(String(email ?? ''))
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json({ ok: true, type: r.type, devCode: r.devCode })
}
