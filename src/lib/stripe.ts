import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-05-27.dahlia' })
  }
  return _stripe
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) { return getStripe()[prop as keyof Stripe] },
})

export const LIFETIME_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID!
export const GROWTH_PRICE_ID = process.env.STRIPE_GROWTH_PRICE_ID

// Self-serve plans buyable from the pricing page.
// 'growth' = $2,000/mo Growth Agency (the main tier). Legacy standard/vip kept for
// existing subscribers.
export const PLAN_PRICES: Record<'growth' | 'standard' | 'vip', string | undefined> = {
  growth: process.env.STRIPE_GROWTH_PRICE_ID,
  standard: process.env.STRIPE_STANDARD_PRICE_ID,
  vip: process.env.STRIPE_VIP_PRICE_ID ?? process.env.STRIPE_LIFETIME_PRICE_ID,
}

/** Map a Stripe price id back to a plan tier (for webhook sync). All paid plans grant
 *  full dashboard access ('vip'); 'standard' is the only distinct legacy tier. */
export function planForPrice(priceId: string | null | undefined): 'standard' | 'vip' {
  if (priceId && priceId === process.env.STRIPE_STANDARD_PRICE_ID) return 'standard'
  return 'vip'
}
