'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Loader2, ArrowRight, CheckCircle } from 'lucide-react'

function TrialForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/trial/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Try again.')
      } else {
        setSent(true)
      }
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,215,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle size={32} style={{ color: '#FFD700' }} />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f5f5f5', marginBottom: 12 }}>Check your inbox</h2>
        <p style={{ color: '#888', lineHeight: 1.7 }}>
          We sent a magic link to <strong style={{ color: '#f5f5f5' }}>{email}</strong>.<br />
          Click it to activate your 30-day free trial.
        </p>
      </div>
    )
  }

  return (
    <>
      <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 800, color: '#f5f5f5', marginBottom: 8, letterSpacing: '-0.02em' }}>
        Start your free trial
      </h1>
      <p style={{ color: '#888', marginBottom: 32 }}>30 days · No credit card · Full access</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: 14 }}>
            {error}
          </div>
        )}
        <input
          type="email"
          className="input-dark"
          placeholder="your@agency.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={loading} className="btn-gold py-4">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <>Activate Free Trial <ArrowRight size={16} /></>}
        </button>
        <p style={{ textAlign: 'center', color: '#444', fontSize: '0.8125rem' }}>
          One free trial per IP address. Email verification required.
        </p>
      </form>

      <p style={{ textAlign: 'center', color: '#555', fontSize: '0.9rem', marginTop: 24 }}>
        Already have an account?{' '}
        <button onClick={() => router.push('/login')} style={{ color: '#FFD700', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          Sign in
        </button>
      </p>
    </>
  )
}

export default function TrialPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <a href="/" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f5f5f5', textDecoration: 'none' }}>
            Pr<span style={{ color: '#FFD700' }}>o</span>v
          </a>
        </div>
        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 20, padding: '40px 36px' }}>
          <Suspense>
            <TrialForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
