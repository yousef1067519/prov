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
// 'starter' = $75/mo Starter — single seat, small monthly credit bundle.
// 'solo'    = $300/mo Premium — single seat, 1,500 outreach credits/day (resets daily).
// 'growth'  = $2,000/mo Growth Agency (the main tier, uncapped). Legacy
// standard/vip kept for existing subscribers.
export const PLAN_PRICES: Record<'starter' | 'solo' | 'growth' | 'standard' | 'vip', string | undefined> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID,
  solo: process.env.STRIPE_SOLO_PRICE_ID,
  growth: process.env.STRIPE_GROWTH_PRICE_ID,
  standard: process.env.STRIPE_STANDARD_PRICE_ID,
  vip: process.env.STRIPE_VIP_PRICE_ID ?? process.env.STRIPE_LIFETIME_PRICE_ID,
}

/** Map a Stripe price id back to a plan tier (for webhook sync). starter/solo are the
 *  credit-limited single-seat tiers; all other paid plans grant full dashboard access
 *  ('vip'); 'standard' is the only distinct legacy tier. */
export function planForPrice(priceId: string | null | undefined): 'starter' | 'solo' | 'standard' | 'vip' {
  if (priceId && priceId === process.env.STRIPE_STARTER_PRICE_ID) return 'starter'
  if (priceId && priceId === process.env.STRIPE_SOLO_PRICE_ID) return 'solo'
  if (priceId && priceId === process.env.STRIPE_STANDARD_PRICE_ID) return 'standard'
  return 'vip'
}
