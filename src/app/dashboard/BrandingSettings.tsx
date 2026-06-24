'use client'

import { useState, useEffect } from 'react'
import { Check, Loader2 } from 'lucide-react'
import DashboardShell from './DashboardShell'

export interface Branding {
  agency_name: string
  agency_title: string
  company_name: string
  company_email: string
  company_website: string
  company_phone: string
  company_logo_url: string
}

const EMPTY: Branding = {
  agency_name: '', agency_title: '', company_name: '',
  company_email: '', company_website: '', company_phone: '', company_logo_url: '',
}

export const BRANDING_KEY = 'prov_branding'

const FIELDS: { key: keyof Branding; label: string; placeholder: string; required?: boolean; optional?: boolean }[] = [
  { key: 'agency_name', label: 'Your full name', placeholder: 'Yousef A', required: true },
  { key: 'agency_title', label: 'Your title', placeholder: 'Managing Director', required: true },
  { key: 'company_name', label: 'Company name', placeholder: 'Provide Media Brands', required: true },
  { key: 'company_email', label: 'Company email', placeholder: 'hello@providemedia.com', required: true },
  { key: 'company_website', label: 'Company website', placeholder: 'providemedia.com', optional: true },
  { key: 'company_phone', label: 'Phone', placeholder: '+1 (555) 123-4567', optional: true },
  { key: 'company_logo_url', label: 'Logo URL', placeholder: 'https://…/logo.png', optional: true },
]

export default function BrandingSettings() {
  const [form, setForm] = useState<Branding>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Local copy first (instant, works in dev), then hydrate from the API if present.
    try {
      const local = localStorage.getItem(BRANDING_KEY)
      if (local) setForm({ ...EMPTY, ...JSON.parse(local) })
    } catch {}
    fetch('/api/profile').then(r => r.json()).then(d => {
      if (d.profile) setForm(prev => ({ ...prev, ...Object.fromEntries(Object.entries(d.profile).filter(([, v]) => v)) }))
    }).catch(() => {})
  }, [])

  function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaved(false)
    try { localStorage.setItem(BRANDING_KEY, JSON.stringify(form)) } catch {}
    fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      .catch(() => {})
      .finally(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500) })
  }

  const sigName = form.agency_name || 'Your Name'
  const sigLine = [form.agency_title || 'Title', form.company_name || 'Company Name'].join(' | ')

  return (
    <DashboardShell active="branding">
      <div style={{ padding: '32px 28px', maxWidth: 760, margin: '0 auto' }}>
        <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', marginBottom: 8 }}>Agency Branding</h1>
        <p style={{ color: '#888', fontSize: '0.9375rem', marginBottom: 28, lineHeight: 1.6 }}>
          Set this up once. It auto-fills the signature on every outreach email you send, so creators and sponsors always see a real agency, never a faceless template.
        </p>

        <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
          {FIELDS.map(f => (
            <div key={f.key}>
              <label htmlFor={f.key} style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cfcfcf', marginBottom: 8 }}>
                {f.label} {f.optional && <span style={{ color: '#555', fontWeight: 400 }}>(optional)</span>}
              </label>
              <input id={f.key} className="input-dark" value={form[f.key]} placeholder={f.placeholder}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                required={f.required} type={f.key === 'company_email' ? 'email' : 'text'} />
            </div>
          ))}
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 14 }}>
            <button type="submit" disabled={saving} className="btn-gold" style={{ padding: '12px 26px' }}>
              {saving ? <Loader2 size={17} className="animate-spin" /> : saved ? <><Check size={17} /> Saved</> : 'Save branding'}
            </button>
            {saved && <span style={{ color: '#00D084', fontSize: '0.875rem' }}>Signature updated everywhere.</span>}
          </div>
        </form>

        {/* live signature preview */}
        <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 12 }}>Email signature preview</p>
        <div style={{ background: '#0f0f0f', border: '1px solid #1c1c1c', borderRadius: 12, padding: '20px 22px' }}>
          <p style={{ color: '#888', fontSize: '0.9375rem', marginBottom: 14 }}>…looking forward to hearing from you.</p>
          <div style={{ borderTop: '1px solid #1f1f1f', paddingTop: 14, color: '#d0d0d0', fontSize: '0.9375rem', lineHeight: 1.7 }}>
            <div>Best,</div>
            <div style={{ fontWeight: 700, color: '#f5f5f5' }}>{sigName}</div>
            <div>{sigLine}</div>
            <div style={{ color: '#FFD700' }}>{form.company_email || 'you@company.com'}</div>
            {form.company_website && <div style={{ color: '#666' }}>{form.company_website}</div>}
            {form.company_phone && <div style={{ color: '#666' }}>{form.company_phone}</div>}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
