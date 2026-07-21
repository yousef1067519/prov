'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { firePurchase } from '@/components/MetaPixel'

// Post-checkout thank-you page. Exists so the Meta Pixel can fire a client-side
// Purchase event (the /api/stripe/checkout/success route is a server redirect,
// which a browser pixel can't observe). Fires once, then forwards to the app.
const PLAN_VALUE: Record<string, number> = { starter: 75, solo: 300, growth: 2000 }

function WelcomeInner() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const plan = params.get('plan') ?? ''
    const value = PLAN_VALUE[plan] ?? 0
    if (value > 0) firePurchase(value)
    const t = setTimeout(() => router.replace('/dashboard?welcome=1'), 1400)
    return () => clearTimeout(t)
  }, [params, router])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'grid', placeContent: 'center', textAlign: 'center', padding: 24 }}>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f5f5f5', marginBottom: 10 }}>
          Pr<span style={{ color: '#FFD700' }}>o</span>v
        </div>
        <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '1.4rem', marginBottom: 8 }}>You’re in. Setting up your workspace…</h1>
        <p style={{ color: '#888' }}>One moment — taking you to your dashboard.</p>
      </div>
    </div>
  )
}

// useSearchParams must sit inside a Suspense boundary for static prerendering.
export default function WelcomePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0a' }} />}>
      <WelcomeInner />
    </Suspense>
  )
}
