import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'

// Agency branding fields. These are WORKSPACE assets, not personal settings:
// apiCtx resolves team members to the workspace owner's key, so everyone on the
// team reads (and working roles write) the same branding — an employee added
// later inherits the agency name, logo, and signature details automatically.
const FIELDS = ['agency_name', 'agency_title', 'company_name', 'company_email', 'company_website', 'company_phone', 'company_logo_url'] as const

export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ profile: null })
  const { data } = await ctx.sb.from('profiles').select(FIELDS.join(',')).eq('id', ctx.userId).single()
  return NextResponse.json({ profile: data ?? null })
}

export async function PATCH(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Client viewers are read-only guests — they never edit the agency's branding.
  if (ctx.wsRole === 'client_viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, string> = {}
  for (const f of FIELDS) if (typeof body[f] === 'string') patch[f] = body[f]
  if (!Object.keys(patch).length) return NextResponse.json({ ok: true })

  const { error } = await ctx.sb.from('profiles').update(patch).eq('id', ctx.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
