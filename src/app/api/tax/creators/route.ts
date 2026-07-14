import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'

// §8.6 creator tax profiles (W-9 / 1099 prep). Finance data: owner/admin only.
// tin_last4 ONLY is ever stored — never a full TIN/SSN.
const FINANCE_ROLES = ['owner', 'admin']

function allowed(ctx: NonNullable<Awaited<ReturnType<typeof apiCtx>>>) {
  return !ctx.wsRole || FINANCE_ROLES.includes(ctx.wsRole)
}

export async function GET(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (!allowed(ctx)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const year = Number(req.nextUrl.searchParams.get('year') ?? new Date().getFullYear())
  const { data, error } = await ctx.sb.from('creator_tax_profiles')
    .select('*').eq('workspace_id', ctx.workspaceId).eq('tax_year', year).order('legal_name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (req.nextUrl.searchParams.get('export') === 'csv') {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = [
      ['legal_name', 'tax_classification', 'tin_last4', 'address', 'tax_year', 'total_paid_usd'].join(','),
      ...(data ?? []).map(r => [
        esc(r.legal_name), esc(r.tax_classification), esc(r.tin_last4),
        esc(typeof r.address === 'object' ? Object.values(r.address ?? {}).filter(Boolean).join(', ') : r.address),
        r.tax_year, (Number(r.total_paid_cents ?? 0) / 100).toFixed(2),
      ].join(',')),
    ].join('\n')
    return new NextResponse(rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="1099-prep-${year}.csv"`,
      },
    })
  }
  return NextResponse.json({ profiles: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (!allowed(ctx)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  if (!b.legal_name) return NextResponse.json({ error: 'legal_name required' }, { status: 400 })
  if (b.tin_last4 && !/^\d{4}$/.test(String(b.tin_last4))) {
    return NextResponse.json({ error: 'tin_last4 must be exactly 4 digits — never store the full TIN' }, { status: 400 })
  }
  const { data, error } = await ctx.sb.from('creator_tax_profiles').insert({
    workspace_id: ctx.workspaceId,
    creator_id: b.creator_id ?? null,
    legal_name: String(b.legal_name).slice(0, 200),
    tax_classification: b.tax_classification ?? 'individual',
    tin_last4: b.tin_last4 ?? null,
    address: b.address ?? {},
    tax_year: Number(b.tax_year ?? new Date().getFullYear()),
    total_paid_cents: Math.max(0, Math.trunc(Number(b.total_paid_cents ?? 0))),
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (!allowed(ctx)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ['legal_name', 'tax_classification', 'tin_last4', 'address', 'tax_year', 'total_paid_cents', 'w9_file_path'] as const) {
    if (b[k] !== undefined) patch[k] = b[k]
  }
  const { data, error } = await ctx.sb.from('creator_tax_profiles')
    .update(patch).eq('id', b.id).eq('workspace_id', ctx.workspaceId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
