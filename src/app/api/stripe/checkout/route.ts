import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { stripe, LIFETIME_PRICE_ID } from '@/lib/stripe'

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://prov.com'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: LIFETIME_PRICE_ID, quantity: 1 }],
    success_url: `${appUrl}/dashboard?payment=success`,
    cancel_url: `${appUrl}/buy?cancelled=1`,
    customer_email: user?.email,
    metadata: { user_id: user?.id ?? '' },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
