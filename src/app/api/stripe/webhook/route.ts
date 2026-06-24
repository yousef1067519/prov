import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const runtime = 'nodejs'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function setAccess(userId: string | null, email: string | null, accessType: 'lifetime' | 'none') {
  const supabase = adminClient()
  if (userId) {
    await supabase.from('profiles').upsert({ id: userId, access_type: accessType })
    return
  }
  if (email) {
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const found = users.find(u => u.email === email)
    if (found) {
      await supabase.from('profiles').upsert({ id: found.id, access_type: accessType })
    }
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  const supabase = adminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break
      await setAccess(session.metadata?.user_id ?? null, session.customer_email, 'lifetime')
      break
    }

    case 'customer.subscription.deleted':
    case 'customer.subscription.paused': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      // Find user by stripe customer id — stored in profiles if we save it, otherwise look up by customer email
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
      if (customer.email) {
        const { data: { users } } = await supabase.auth.admin.listUsers()
        const found = users.find(u => u.email === customer.email)
        if (found) {
          await supabase.from('profiles').upsert({ id: found.id, access_type: 'none' })
        }
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const isActive = sub.status === 'active' || sub.status === 'trialing'
      const customerId = sub.customer as string
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
      if (customer.email) {
        const { data: { users } } = await supabase.auth.admin.listUsers()
        const found = users.find(u => u.email === customer.email)
        if (found) {
          await supabase.from('profiles').upsert({ id: found.id, access_type: isActive ? 'lifetime' : 'none' })
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
