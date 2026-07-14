'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

// Landing for clients who have a portal link but no agency account.
export default function PortalLanding() {
  const router = useRouter()
  const [token, setToken] = useState('')
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <h1 style={{ color: '#FFD700', fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: 8 }}>Client Portal</h1>
        <p style={{ color: '#777', fontSize: '0.875rem', marginBottom: 24 }}>Enter the access code from your invite email, or open the link your agency sent you.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={token} onChange={e => setToken(e.target.value.trim())} onKeyDown={e => e.key === 'Enter' && token && router.push(`/portal/${token}`)}
            placeholder="Access code"
            style={{ flex: 1, background: '#111', border: '1px solid #222', borderRadius: 10, color: '#e8e8e8', fontSize: '0.9375rem', padding: '12px 14px', outline: 'none' }} />
          <button onClick={() => token && router.push(`/portal/${token}`)} className="btn-gold" style={{ padding: '0 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
            Open <ArrowRight size={15} />
          </button>
        </div>
        <button onClick={() => router.push('/portal/demo')} style={{ marginTop: 18, background: 'none', border: 'none', color: '#667eea', fontSize: '0.8125rem', cursor: 'pointer' }}>
          View a demo portal →
        </button>
      </div>
    </div>
  )
}
