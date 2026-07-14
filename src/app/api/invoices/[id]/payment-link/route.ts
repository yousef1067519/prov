import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { stripe } from '@/lib/stripe'

// §8.6: optional Stripe payment link for an invoice. Guarded — only works
// when STRIPE_SECRET_KEY is configured; amount comes from total_cents (exact).
type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (ctx.wsRole && !['owner', 'admin', 'account_manager'].includes(ctx.wsRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured for this deployment' }, { status: 501 })
  }
  const { id } = await params
  let q = ctx.sb.from('invoices').select('*').eq('id', id)
  q = ctx.workspaceId ? q.eq('workspace_id', ctx.workspaceId) : q.eq('user_id', ctx.userId)
  const { data: inv } = await q.maybeSingle()
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (inv.stripe_payment_link) return NextResponse.json({ url: inv.stripe_payment_link })

  const total = Number(inv.total_cents ?? Math.round(Number(inv.amount ?? 0) * 100))
  if (!Number.isInteger(total) || total <= 0) {
    return NextResponse.json({ error: 'Invoice total must be positive' }, { status: 400 })
  }

  try {
    const price = await stripe.prices.create({
      currency: (inv.currency ?? 'USD').toLowerCase(),
      unit_amount: total,
      product_data: { name: `Invoice INV-${String(inv.invoice_number ?? 0).padStart(5, '0')}${inv.brand_name ? ` — ${inv.brand_name}` : ''}` },
    })
    const link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { invoice_id: inv.id, workspace_id: ctx.workspaceId ?? '' },
    })
    await ctx.sb.from('invoices').update({ stripe_payment_link: link.url }).eq('id', inv.id)
    return NextResponse.json({ url: link.url })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Stripe error' }, { status: 502 })
  }
}
