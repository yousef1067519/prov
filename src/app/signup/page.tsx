'use client'

import { useState } from 'react'
import { Loader2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import GoogleAuthButton, { safeDest } from '@/components/GoogleAuthButton'
import Link from 'next/link'

// Create a Prov account: name + email + password (or Google). After signup we sign
// in with the password and hard-navigate so the server sees the session first try.
export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setLoading(false); setError(d.error || 'Could not create your account.'); return }

      const supabase = createClient()
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      if (signInErr) { setLoading(false); setError('Account created — sign in with your new password.'); return }
      // Hard navigation so the server sees the fresh session on the first request.
      window.location.assign(safeDest())
    } catch {
      setLoading(false); setError('Network error — try again.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f5f5f5', textDecoration: 'none' }}>
            Pr<span style={{ color: '#FFD700' }}>o</span>v
          </Link>
        </div>

        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 20, padding: '40px 36px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f5f5f5', marginBottom: 8 }}>Create your account</h1>
          <p style={{ color: '#888', marginBottom: 28 }}>Set up Prov for your agency in under a minute.</p>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <GoogleAuthButton label="Continue with Google" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#222' }} />
            <span style={{ color: '#555', fontSize: '0.78rem' }}>or with email</span>
            <div style={{ flex: 1, height: 1, background: '#222' }} />
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input className="input-dark" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
            <input type="email" className="input-dark" placeholder="you@youragency.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            <input type="password" className="input-dark" placeholder="Password (8+ characters)" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            <button type="submit" disabled={loading} className="btn-gold py-4">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>Create account <ArrowRight size={16} /></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: '#555', fontSize: '0.9rem', marginTop: 24 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#FFD700', textDecoration: 'underline' }}>Sign in</Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', color: '#444', fontSize: '0.75rem', marginTop: 18 }}>
          By creating an account you agree to our <Link href="/terms" style={{ color: '#666' }}>Terms</Link> and <Link href="/privacy" style={{ color: '#666' }}>Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
