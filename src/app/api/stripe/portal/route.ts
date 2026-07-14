import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { stripe } from '@/lib/stripe'

// Opens the Stripe Customer Billing Portal, where the customer can cancel,
// update their card, and view invoices. Cancellation is handled by Stripe and
// flows back through our webhook (customer.subscription.deleted -> revoke access).
export async function POST(req: NextRequest) {
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    return NextResponse.json({ error: 'Billing management needs a real signed-in account (dev bypass is on).' }, { status: 400 })
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Billing is not configured yet.' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  try {
    const customers = await stripe.customers.list({ email: user.email, limit: 1 })
    const customer = customers.data[0]
    if (!customer) {
      return NextResponse.json({ error: 'No active subscription found for this account.' }, { status: 404 })
    }
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${origin}/dashboard/settings`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not open the billing portal.'
    // Most common cause: the Customer Portal isn't activated in the Stripe dashboard yet.
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
