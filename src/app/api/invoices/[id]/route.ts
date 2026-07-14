import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { audit } from '@/lib/tenant'
import { sanitizeLineItems, computeTotals } from '@/lib/invoice-money'

// §8.6 invoice lifecycle: draft-only edits + send / mark_paid / void actions.
const WRITE_ROLES = ['owner', 'admin', 'account_manager']
type Params = { params: Promise<{ id: string }> }

async function loadScoped(ctx: NonNullable<Awaited<ReturnType<typeof apiCtx>>>, id: string) {
  let q = ctx.sb.from('invoices').select('*').eq('id', id)
  q = ctx.workspaceId ? q.eq('workspace_id', ctx.workspaceId) : q.eq('user_id', ctx.userId)
  const { data } = await q.maybeSingle()
  return data
}

export async function GET(_req: NextRequest, { params }: Params) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const invoice = await loadScoped(ctx, id)
  return invoice ? NextResponse.json(invoice) : NextResponse.json({ error: 'Not found' }, { status: 404 })
}

// PUT — draft-only edits; totals recomputed server-side, never trusted from the client.
export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (ctx.wsRole && !WRITE_ROLES.includes(ctx.wsRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const current = await loadScoped(ctx, id)
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (current.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft invoices can be edited' }, { status: 409 })
  }
  const b = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}
  if (b.line_items !== undefined || b.tax_bps !== undefined) {
    const items = b.line_items !== undefined ? sanitizeLineItems(b.line_items) : sanitizeLineItems(current.line_items)
    const taxBps = Math.max(0, Math.trunc(Number(b.tax_bps ?? current.tax_bps ?? 0)))
    const totals = computeTotals(items, taxBps)
    Object.assign(patch, {
      line_items: items, tax_bps: taxBps,
      subtotal_cents: totals.subtotal_cents, tax_cents: totals.tax_cents, total_cents: totals.total_cents,
      amount: totals.total_cents / 100,
    })
  }
  for (const k of ['brand_name', 'due_date', 'terms', 'late_fee_note', 'remittance', 'client_id', 'deal_id'] as const) {
    if (b[k] !== undefined) patch[k] = b[k]
  }
  const { data, error } = await ctx.sb.from('invoices').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST { action: 'send' | 'mark_paid' | 'void' }
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (ctx.wsRole && !WRITE_ROLES.includes(ctx.wsRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const current = await loadScoped(ctx, id)
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { action } = await req.json().catch(() => ({}))

  const transitions: Record<string, { from: string[]; patch: Record<string, unknown> }> = {
    send: { from: ['draft'], patch: { status: 'sent', sent_at: new Date().toISOString() } },
    mark_paid: { from: ['sent', 'viewed', 'overdue'], patch: { status: 'paid', paid_at: new Date().toISOString() } },
    void: { from: ['draft', 'sent', 'viewed', 'overdue'], patch: { status: 'void' } },
  }
  const t = transitions[action as string]
  if (!t) return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  if (!t.from.includes(current.status)) {
    return NextResponse.json({ error: `Cannot ${action} a ${current.status} invoice` }, { status: 409 })
  }
  const { data, error } = await ctx.sb.from('invoices').update(t.patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (ctx.workspaceId) {
    await audit(ctx.sb, { workspaceId: ctx.workspaceId, userId: ctx.userId, email: ctx.email },
      `invoice.${action}`, 'invoice', id, { number: current.invoice_number, total_cents: current.total_cents })
  }
  return NextResponse.json(data)
}
