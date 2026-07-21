'use client'

import { useState } from 'react'

// Small "have a code?" box on /plans. Redeems a comp code for free access, then
// sends the user into the app. They must be signed in first (the API enforces it).
export default function RedeemCode() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function redeem() {
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401) { window.location.assign(`/login?redirect=${encodeURIComponent('/plans')}`); return }
        throw new Error(data.error || 'Could not redeem that code.')
      }
      window.location.assign('/dashboard?welcome=1')
    } catch (e) {
      setError((e as Error).message); setBusy(false)
    }
  }

  return (
    <div style={{ textAlign: 'center', marginTop: 26 }}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline' }}>
          Have a code?
        </button>
      ) : (
        <div style={{ maxWidth: 380, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter' && code && !busy) redeem() }}
              placeholder="Enter your code"
              autoFocus
              style={{ flex: 1, height: 44, borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: '#f5f5f5', padding: '0 14px', fontSize: '0.95rem', letterSpacing: '0.06em' }}
            />
            <button onClick={redeem} disabled={busy || !code} style={{ height: 44, padding: '0 20px', borderRadius: 10, border: 'none', background: '#FFD700', color: '#0a0a0a', fontWeight: 700, cursor: busy || !code ? 'default' : 'pointer', opacity: busy || !code ? 0.6 : 1 }}>
              {busy ? '…' : 'Apply'}
            </button>
          </div>
          {error && <p style={{ color: '#f8b4b4', fontSize: '0.82rem', marginTop: 10 }}>{error}</p>}
          <p style={{ color: '#555', fontSize: '0.78rem', marginTop: 10 }}>Sign in first, then apply your code for free access.</p>
        </div>
      )}
    </div>
  )
}
