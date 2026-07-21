'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

type Option = { id: string; label: string; blurb: string }

// First-run agency-type picker (gated on profiles.agency_type_set). Saving routes
// into the dashboard, which then runs on the chosen vertical's preset from
// lib/verticals.ts (terminology, pipeline stages, copy).
export default function ChooseAgencyClient({ options }: { options: Option[] }) {
  const [choice, setChoice] = useState(options[0]?.id ?? 'ima')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/settings/agency-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agencyType: choice }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Could not save')
      window.location.assign('/dashboard') // hard nav so the dashboard re-reads the profile
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 10, fontFamily: 'var(--font-display)' }}>
          Pr<span style={{ color: '#FFD700' }}>o</span>v
        </div>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
          What kind of agency are you?
        </h1>
        <p style={{ color: '#8a8a92', marginBottom: 26, lineHeight: 1.6 }}>
          We’ll set Prov up for how <em>your</em> agency works — the pipeline stages, the
          language, the whole workflow. You can change this anytime in settings.
        </p>

        <div style={{ display: 'grid', gap: 12 }}>
          {options.map(o => {
            const active = choice === o.id
            return (
              <button key={o.id} onClick={() => setChoice(o.id)} style={{
                textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: 18, borderRadius: 14,
                border: `1px solid ${active ? 'rgba(255,215,0,0.55)' : 'rgba(255,255,255,0.10)'}`,
                background: active ? 'rgba(255,215,0,0.06)' : 'rgba(255,255,255,0.015)',
                transition: 'all .15s ease', color: 'inherit',
              }}>
                <span style={{
                  flexShrink: 0, marginTop: 2, width: 20, height: 20, borderRadius: 999,
                  border: `2px solid ${active ? '#FFD700' : 'rgba(255,255,255,0.25)'}`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? '#FFD700' : 'transparent',
                }}>
                  {active && <Check size={13} strokeWidth={3} color="#0a0a0a" />}
                </span>
                <span>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: '1rem' }}>{o.label}</span>
                  <span style={{ display: 'block', color: '#8a8a92', fontSize: '0.88rem', marginTop: 3 }}>{o.blurb}</span>
                </span>
              </button>
            )
          })}
        </div>

        {error && <p style={{ color: '#f8b4b4', fontSize: '0.85rem', marginTop: 14 }}>{error}</p>}

        <button onClick={save} disabled={saving} style={{
          marginTop: 22, width: '100%', height: 48, borderRadius: 12, border: 'none',
          background: '#FFD700', color: '#0a0a0a', fontSize: '1rem', fontWeight: 700,
          cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Setting up…' : 'Continue to Prov'}
        </button>
      </div>
    </div>
  )
}
