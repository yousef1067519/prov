import { NextRequest, NextResponse } from 'next/server'
import { stripe, planForPrice } from '@/lib/stripe'
import { serviceClient } from '@/lib/apiUser'

// Post-checkout landing. Grants access immediately by confirming the paid session with
// Stripe (belt-and-suspenders alongside the webhook, so a paying customer is never
// bounced to /demo while waiting for the webhook to fire), then sends them to the app.
export async function GET(req: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId) return NextResponse.redirect(new URL('/dashboard', origin))

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items'] })
    const paid = session.payment_status === 'paid' || session.status === 'complete'
    const userId = session.metadata?.user_id
    if (paid && userId) {
      const priceId = session.line_items?.data?.[0]?.price?.id
      const plan = planForPrice(priceId)
      await serviceClient().from('profiles').upsert({ id: userId, access_type: plan })
    }
  } catch (e) {
    console.error('checkout success confirm failed:', (e as Error).message)
    // Fall through — the webhook is the backstop.
  }
  return NextResponse.redirect(new URL('/dashboard?welcome=1', origin))
}
