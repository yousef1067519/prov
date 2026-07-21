import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { VERTICALS, isAgencyType } from '@/lib/verticals'

// Which vertical preset this account runs (ICP expansion foundation).
// GET  -> { agencyType, options }   POST { agencyType } -> save

export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await ctx.sb.from('profiles').select('agency_type').eq('id', ctx.userId).maybeSingle()
  return NextResponse.json({
    agencyType: data?.agency_type ?? 'ima',
    options: Object.values(VERTICALS).map(v => ({ id: v.id, label: v.label, blurb: v.blurb })),
  })
}

export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  if (!isAgencyType(body.agencyType)) {
    return NextResponse.json({ error: 'Invalid agency type' }, { status: 400 })
  }
  const { error } = await ctx.sb.from('profiles')
    .update({ agency_type: body.agencyType, agency_type_set: true }).eq('id', ctx.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, agencyType: body.agencyType })
}
