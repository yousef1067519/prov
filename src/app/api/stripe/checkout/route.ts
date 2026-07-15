import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { stripe, PLAN_PRICES } from '@/lib/stripe'

// Self-serve subscription checkout. Linked from the pricing page's "Subscribe" button.
// GET /api/stripe/checkout?plan=growth
//  - Not signed in -> send to /login, then return here to continue checkout.
//  - Signed in     -> create a Stripe Checkout Session and redirect to it.
export async function GET(req: NextRequest) {
  const plan = (req.nextUrl.searchParams.get('plan') ?? 'growth') as keyof typeof PLAN_PRICES
  const price = PLAN_PRICES[plan]
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

  const ctx = await apiCtx()
  if (!ctx) {
    // Sign in (or create an account) first, then bounce straight back into checkout.
    const back = `/api/stripe/checkout?plan=${plan}`
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(back)}`, origin))
  }

  if (!price) {
    return NextResponse.redirect(new URL('/plans?e=unavailable', origin))
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      customer_email: ctx.email ?? undefined,
      client_reference_id: ctx.userId,
      metadata: { user_id: ctx.userId, plan },
      subscription_data: { metadata: { user_id: ctx.userId, plan } },
      allow_promotion_codes: true,
      success_url: `${origin}/api/stripe/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#pricing`,
    })
    if (!session.url) return NextResponse.redirect(new URL('/plans?e=checkout', origin))
    return NextResponse.redirect(session.url, { status: 303 })
  } catch (e) {
    console.error('checkout create failed:', (e as Error).message)
    return NextResponse.redirect(new URL('/plans?e=checkout', origin))
  }
}
