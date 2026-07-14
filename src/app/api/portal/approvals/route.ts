import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Client approves or requests changes on a content item.
export async function POST(req: NextRequest) {
  const { token, approvalId, status, comments } = await req.json().catch(() => ({}))
  if (!token || !approvalId || !['approved', 'changes_requested', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'token, approvalId and valid status required' }, { status: 400 })
  }
  // Demo links are client-side only — acknowledge without writing.
  if (token === 'demo') return NextResponse.json({ ok: true, demo: true })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
      { cookies: { getAll: async () => (await cookies()).getAll(), setAll: () => {} } }
    )
    const { error } = await supabase.from('content_approvals')
      .update({ status, comments: comments ?? null, updated_at: new Date().toISOString() })
      .eq('id', approvalId).eq('access_token', token)
    if (error) return NextResponse.json({ ok: true, persisted: false })
    return NextResponse.json({ ok: true, persisted: true })
  } catch {
    return NextResponse.json({ ok: true, persisted: false })
  }
}
