'use client'

import { useEffect, useState } from 'react'
import { VERTICALS } from '@/lib/verticals'

// First-visit front-screen picker. On a visitor's first load of prov.agency we
// ask what kind of agency they run, then send them to that vertical's landing
// page (/for/<slug>). The choice is remembered in localStorage so returning
// visitors aren't asked again. A "browse everything" skip keeps it non-blocking.
const KEY = 'prov_vertical_choice'

export default function AgencyIntro() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true)
    } catch { /* storage blocked — just don't show */ }
  }, [])

  function choose(slug: string) {
    try { localStorage.setItem(KEY, slug) } catch {}
    window.location.assign(`/for/${slug}`)
  }
  function skip() {
    try { localStorage.setItem(KEY, 'all') } catch {}
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(6,6,6,0.92)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 620 }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 12, color: '#f5f5f5', fontFamily: 'var(--font-display)' }}>
          Pr<span style={{ color: '#FFD700' }}>o</span>v
        </div>
        <h1 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
          What kind of agency are you?
        </h1>
        <p style={{ color: '#8a8a92', marginBottom: 24, lineHeight: 1.6 }}>
          We’ll show you Prov built for how <em>your</em> agency actually works.
        </p>

        <div style={{ display: 'grid', gap: 12 }}>
          {Object.values(VERTICALS).map(v => (
            <button
              key={v.id}
              onClick={() => choose(v.slug)}
              style={{
                textAlign: 'left', cursor: 'pointer', padding: 18, borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.015)',
                color: 'inherit', transition: 'all .15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.55)'; e.currentTarget.style.background = 'rgba(255,215,0,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.background = 'rgba(255,255,255,0.015)' }}
            >
              <span style={{ display: 'block', fontWeight: 700, fontSize: '1rem', color: '#f5f5f5' }}>{v.label}</span>
              <span style={{ display: 'block', color: '#8a8a92', fontSize: '0.88rem', marginTop: 3 }}>{v.blurb}</span>
            </button>
          ))}
        </div>

        <button onClick={skip} style={{
          marginTop: 18, background: 'none', border: 'none', color: '#666',
          fontSize: '0.85rem', cursor: 'pointer', padding: 0,
        }}>
          Just browsing — show me everything →
        </button>
      </div>
    </div>
  )
}
