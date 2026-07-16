'use client'

// Join your team — redeem a one-time invite code from the invite email.
// Signed-in users just enter the code; new people create their account in the
// same step. Either way they land in the manager's workspace, no payment.

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, ArrowRight, Ticket } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function JoinForm() {
  const params = useSearchParams()
  const [code, setCode] = useState(params.get('code') ?? '')
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => setHasSession(Boolean(data.session)))
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/team/join', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hasSession ? { code } : { code, name, email, password }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setLoading(false); setError(d.error || 'Could not redeem that code.'); return }

      if (d.created) {
        // Fresh account: sign in with the just-created password, then hard-navigate
        // so the server sees the session on the first request.
        const { error: signInErr } = await createClient().auth.signInWithPassword({
          email: email.trim().toLowerCase(), password,
        })
        if (signInErr) { setLoading(false); setError('You’re on the team! Sign in with your new password to continue.'); return }
      }
      window.location.assign('/dashboard')
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#FFD700', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 999, padding: '4px 12px', marginBottom: 18 }}>
            <Ticket size={13} /> Team invite
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f5f5f5', marginBottom: 8 }}>Join your team</h1>
          <p style={{ color: '#888', marginBottom: 28 }}>
            Enter the invite code from your email{hasSession === false ? ' and create your account' : ''}. No payment needed — you’re joining your agency’s workspace.
          </p>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input className="input-dark" placeholder="Invite code" value={code}
              onChange={e => setCode(e.target.value.toUpperCase())} required
              style={{ textAlign: 'center', fontSize: '1.1rem', letterSpacing: '0.2em', fontFamily: 'monospace' }} />

            {hasSession === false && (
              <>
                <input className="input-dark" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
                <input type="email" className="input-dark" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                <input type="password" className="input-dark" placeholder="Create a password (8+ characters)" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
              </>
            )}

            <button type="submit" disabled={loading || hasSession === null} className="btn-gold py-4">
              {loading || hasSession === null ? <Loader2 size={18} className="animate-spin" /> : <>Join workspace <ArrowRight size={16} /></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: '#555', fontSize: '0.9rem', marginTop: 24 }}>
            {hasSession
              ? <>Wrong account? <Link href="/login" style={{ color: '#FFD700', textDecoration: 'underline' }}>Switch</Link></>
              : <>Already have an account? <Link href={`/login?redirect=${encodeURIComponent(`/join${code ? `?code=${code}` : ''}`)}`} style={{ color: '#FFD700', textDecoration: 'underline' }}>Sign in first</Link></>}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0a' }} />}>
      <JoinForm />
    </Suspense>
  )
}
