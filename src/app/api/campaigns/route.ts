import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await ctx.sb.from('campaigns').select('*').eq('user_id', ctx.userId).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaigns: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, niche, creator_ids, sponsor_ids } = body

  const { data, error } = await ctx.sb.from('campaigns').insert({
    user_id: ctx.userId, name, niche,
    // Locally-added creators/sponsors have non-UUID ids ("custom-…") that the
    // uuid[] columns reject — keep only real DB ids.
    creator_ids: (creator_ids ?? []).filter((x: string) => UUID_RE.test(x)),
    sponsor_ids: (sponsor_ids ?? []).filter((x: string) => UUID_RE.test(x)),
    status: 'draft',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaign: data })
}
