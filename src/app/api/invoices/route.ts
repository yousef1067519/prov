import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { audit } from '@/lib/tenant'
import { sanitizeLineItems, computeTotals, dueDateFor, type InvoiceTerms, INVOICE_TERMS } from '@/lib/invoice-money'

// §8.6 invoice engine: sequential per-workspace numbering, integer-cent math,
// lazy overdue flagging, balances for the exec dashboard.
const WRITE_ROLES = ['owner', 'admin', 'account_manager']

export async function GET(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let q = ctx.sb.from('invoices').select('*').order('created_at', { ascending: false })
  q = ctx.workspaceId ? q.eq('workspace_id', ctx.workspaceId) : q.eq('user_id', ctx.userId)
  const status = req.nextUrl.searchParams.get('status')
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Lazy overdue flagging: sent/viewed past due_date become overdue.
  const today = new Date().toISOString().slice(0, 10)
  const rows = data ?? []
  const newlyOverdue = rows.filter(r =>
    ['sent', 'viewed'].includes(r.status) && r.due_date && String(r.due_date) < today)
  if (newlyOverdue.length) {
    await ctx.sb.from('invoices').update({ status: 'overdue' })
      .in('id', newlyOverdue.map(r => r.id))
    for (const r of newlyOverdue) r.status = 'overdue'
  }

  const cents = (r: { total_cents?: number | null; amount?: number | null }) =>
    Number(r.total_cents ?? Math.round(Number(r.amount ?? 0) * 100))
  const balances = {
    outstanding_cents: rows.filter(r => ['sent', 'viewed', 'overdue'].includes(r.status)).reduce((s, r) => s + cents(r), 0),
    overdue_cents: rows.filter(r => r.status === 'overdue').reduce((s, r) => s + cents(r), 0),
    overdue_count: rows.filter(r => r.status === 'overdue').length,
    paid_cents: rows.filter(r => r.status === 'paid').reduce((s, r) => s + cents(r), 0),
  }
  return NextResponse.json({ invoices: rows, balances })
}

// POST { client_id?, deal_id?, brand_name?, line_items, tax_bps?, terms?, currency?, late_fee_note? }
export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (ctx.wsRole && !WRITE_ROLES.includes(ctx.wsRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const b = await req.json().catch(() => ({}))

  let items = sanitizeLineItems(b.line_items)
  // Create-from-deal: default line items from the deal's value + deliverables.
  if (!items.length && b.deal_id && ctx.workspaceId) {
    const { data: deal } = await ctx.sb.from('deals')
      .select('name, value_cents, deliverables').eq('id', b.deal_id).eq('workspace_id', ctx.workspaceId).maybeSingle()
    if (deal) {
      items = [{ description: `Sponsorship engagement — ${deal.name}`, qty: 1, unit_cents: Number(deal.value_cents ?? 0) }]
    }
  }
  if (!items.length) return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 })

  const terms: InvoiceTerms = INVOICE_TERMS.includes(b.terms) ? b.terms : 'net_30'
  const issue = new Date().toISOString().slice(0, 10)
  const totals = computeTotals(items, Number(b.tax_bps ?? 0))

  // Sequential per-workspace numbering with an insert-retry loop: unique
  // (workspace_id, invoice_number) turns a race into a retriable conflict.
  for (let attempt = 0; attempt < 5; attempt++) {
    let next = 1
    if (ctx.workspaceId) {
      const { data: maxRow } = await ctx.sb.from('invoices')
        .select('invoice_number').eq('workspace_id', ctx.workspaceId)
        .not('invoice_number', 'is', null)
        .order('invoice_number', { ascending: false }).limit(1).maybeSingle()
      next = Number(maxRow?.invoice_number ?? 0) + 1
    }
    const { data, error } = await ctx.sb.from('invoices').insert({
      user_id: ctx.userId,
      workspace_id: ctx.workspaceId,
      client_id: b.client_id ?? null,
      deal_id: b.deal_id ?? null,
      brand_name: b.brand_name ?? null,
      invoice_number: ctx.workspaceId ? next : null,
      line_items: items,
      subtotal_cents: totals.subtotal_cents,
      tax_bps: Math.max(0, Math.trunc(Number(b.tax_bps ?? 0))),
      tax_cents: totals.tax_cents,
      total_cents: totals.total_cents,
      amount: totals.total_cents / 100, // legacy display column
      currency: b.currency ?? 'USD',
      issue_date: issue,
      due_date: dueDateFor(issue, terms),
      terms,
      late_fee_note: b.late_fee_note ?? null,
      status: 'draft',
      remittance: b.remittance ?? {},
    }).select().single()

    if (!error) {
      if (ctx.workspaceId) {
        await audit(ctx.sb, { workspaceId: ctx.workspaceId, userId: ctx.userId, email: ctx.email },
          'invoice.created', 'invoice', data.id, { number: data.invoice_number, total_cents: totals.total_cents })
      }
      return NextResponse.json(data)
    }
    if (!String(error.message).includes('duplicate')) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    // number collision — loop and re-read max
  }
  return NextResponse.json({ error: 'Could not allocate an invoice number, try again' }, { status: 409 })
}
