import { NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { creditStatus } from '@/lib/credits'

// Current plan + credit usage for the dashboard banner / send UI.
export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await ctx.sb.from('profiles')
    .select('access_type').eq('id', ctx.userId).maybeSingle()
  const s = await creditStatus(ctx.sb, ctx.userId, profile?.access_type)
  return NextResponse.json({
    plan: s.planLabel,
    accessType: profile?.access_type ?? 'none',
    unlimited: s.cap === null,
    cap: s.cap,
    used: s.used,
    left: s.cap === null ? null : s.left,
    window: s.window,
  })
}
