import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { audit } from '@/lib/tenant'

// §8.5/§8.6/§8.8: workspace branding drives white-label reports, invoices,
// and contract headers. Owner/admin only.
export async function GET() {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ branding: {} })
  const { data } = await ctx.sb.from('workspaces').select('branding').eq('id', ctx.workspaceId).maybeSingle()
  return NextResponse.json({ branding: data?.branding ?? {} })
}

export async function PUT(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (ctx.wsRole && !['owner', 'admin'].includes(ctx.wsRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const b = await req.json().catch(() => ({}))
  const branding: Record<string, string> = {}
  for (const k of ['name', 'logo_url', 'primary_hex', 'email', 'website', 'address', 'remit_bank', 'remit_account', 'remit_routing'] as const) {
    if (b[k] !== undefined) branding[k] = String(b[k]).slice(0, 300)
  }
  const { data: current } = await ctx.sb.from('workspaces').select('branding').eq('id', ctx.workspaceId).maybeSingle()
  const next = { ...(current?.branding ?? {}), ...branding }
  const { error } = await ctx.sb.from('workspaces').update({ branding: next }).eq('id', ctx.workspaceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await audit(ctx.sb, { workspaceId: ctx.workspaceId, userId: ctx.userId, email: ctx.email },
    'workspace.branding_updated', 'workspace', ctx.workspaceId, { keys: Object.keys(branding) })
  return NextResponse.json({ branding: next })
}
