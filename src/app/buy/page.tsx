'use client'

import { useState } from 'react'
import { Loader2, Zap } from 'lucide-react'
import Link from 'next/link'

export default function BuyPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleBuy() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        setLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Network error. Try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f5f5f5', textDecoration: 'none' }}>
            Pr<span style={{ color: '#FFD700' }}>o</span>v
          </Link>
        </div>
        <div style={{
          background: '#111', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 20,
          padding: '48px 40px', textAlign: 'center',
          boxShadow: '0 0 40px rgba(255,215,0,0.06)',
        }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#FFD700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
            Agency Plan
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, marginBottom: 8 }}>
            <span style={{ fontSize: '5rem', fontWeight: 900, color: '#FFD700', lineHeight: 1 }}>$299</span>
            <span style={{ color: '#555', marginBottom: 14 }}>/month</span>
          </div>
          <p style={{ color: '#555', marginBottom: 40 }}>Billed monthly · Cancel anytime</p>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 20 }}>
              {error}
            </div>
          )}
          <button onClick={handleBuy} disabled={loading} className="btn-gold w-full py-4 text-lg" style={{ display: 'flex', justifyContent: 'center' }}>
            {loading ? <Loader2 size={20} className="animate-spin" /> : <><Zap size={18} fill="#0a0a0a" /> Subscribe at $299/month</>}
          </button>
          <p style={{ color: '#333', fontSize: '0.8125rem', marginTop: 16 }}>
            Secured by Stripe · 30-day money-back guarantee
          </p>
          <p style={{ color: '#444', fontSize: '0.875rem', marginTop: 24 }}>
            Want to try first?{' '}
            <Link href="/trial" style={{ color: '#FFD700', textDecoration: 'underline' }}>Start free 30-day trial</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
