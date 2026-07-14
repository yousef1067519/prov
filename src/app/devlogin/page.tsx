'use client'

import { useState, useEffect } from 'react'
import { Loader2, LogIn } from 'lucide-react'

// DEV ONLY — one-click login as any email (no code). Disabled in prod via SHOW_LOGIN_CODE.
export default function DevLogin() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('error')
    if (e) setError(e === 'verify' ? 'Could not establish a session — try again.' : e === 'create' ? 'Could not create that user.' : 'Enter a valid email.')
  }, [])

  function go(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    // Top-level navigation: the server sets the session cookie on the redirect to /dashboard.
    window.location.href = `/api/dev/login?email=${encodeURIComponent(email.trim())}`
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 20, padding: '40px 36px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#FFD700', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 999, padding: '4px 12px', marginBottom: 18 }}>
            Dev login · no email needed
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f5f5f5', marginBottom: 8 }}>Sign in as anyone</h1>
          <p style={{ color: '#888', marginBottom: 28, fontSize: '0.9rem' }}>Type an email and you&apos;re straight in — no code. Use this to test team members.</p>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 16 }}>{error}</div>}
          <form onSubmit={go} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input type="email" className="input-dark" placeholder="member@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            <button type="submit" disabled={loading || !email.trim()} className="btn-gold py-4" style={{ justifyContent: 'center' }}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>Log in <LogIn size={16} /></>}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', color: '#444', fontSize: '0.78rem', marginTop: 16 }}>Local testing only · disabled in production</p>
      </div>
    </div>
  )
}
