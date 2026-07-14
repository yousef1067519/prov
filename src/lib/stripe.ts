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

// Tier price IDs. Standard $99/mo (1,500 sends/wk) · VIP $299/mo (unlimited).
// Until the Standard price exists in Stripe, both fall back to the original
// price so checkout never breaks.
export const PLAN_PRICES: Record<'standard' | 'vip', string | undefined> = {
  standard: process.env.STRIPE_STANDARD_PRICE_ID,
  vip: process.env.STRIPE_VIP_PRICE_ID ?? process.env.STRIPE_LIFETIME_PRICE_ID,
}

/** Map a Stripe price id back to a plan tier (for webhook sync). */
export function planForPrice(priceId: string | null | undefined): 'standard' | 'vip' {
  if (priceId && priceId === process.env.STRIPE_STANDARD_PRICE_ID) return 'standard'
  return 'vip'
}
