'use client'

import { useState } from 'react'
import { Ticket } from 'lucide-react'

// Prominent "redeem a code" box. Shown on every plan-choosing surface (the /plans
// page and the landing pricing section). Redeems a comp code for free access,
// then sends the user into the app. They must be signed in first (API enforces).
export default function RedeemCode() {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function redeem() {
    if (!code || busy) return
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
    <div style={{
      maxWidth: 460, margin: '32px auto 0', padding: '20px 22px', borderRadius: 16,
      border: '1px solid rgba(255,215,0,0.28)',
      background: 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(255,255,255,0.01) 60%)',
      textAlign: 'center',
    }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#FFD700', fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>
        <Ticket size={17} /> Have a redemption code?
      </div>
      <p style={{ color: '#8a8a92', fontSize: '0.83rem', margin: '0 0 14px' }}>
        Enter it below to unlock free access.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === 'Enter') redeem() }}
          placeholder="ENTER CODE"
          style={{ flex: 1, height: 46, borderRadius: 11, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(0,0,0,0.35)', color: '#f5f5f5', padding: '0 14px', fontSize: '0.95rem', letterSpacing: '0.12em', textAlign: 'center', fontWeight: 600 }}
        />
        <button onClick={redeem} disabled={busy || !code} style={{ height: 46, padding: '0 22px', borderRadius: 11, border: 'none', background: '#FFD700', color: '#0a0a0a', fontWeight: 800, cursor: busy || !code ? 'default' : 'pointer', opacity: busy || !code ? 0.55 : 1 }}>
          {busy ? '…' : 'Redeem'}
        </button>
      </div>
      {error && <p style={{ color: '#f8b4b4', fontSize: '0.82rem', marginTop: 10 }}>{error}</p>}
      <p style={{ color: '#555', fontSize: '0.75rem', marginTop: 10 }}>Sign in first, then redeem for free access.</p>
    </div>
  )
}
