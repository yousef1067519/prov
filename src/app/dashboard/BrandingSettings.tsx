'use client'

import { useState, useEffect } from 'react'
import { Check, Loader2, Upload, Image as ImageIcon } from 'lucide-react'
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

const TEXT_FIELDS: { key: keyof Branding; title: string; desc: string; placeholder: string; required?: boolean; type?: string }[] = [
  { key: 'agency_name', title: 'Your name', desc: 'The name creators and sponsors see in your emails.', placeholder: 'Yousef A', required: true },
  { key: 'agency_title', title: 'Your title', desc: 'Shown next to your company in the signature.', placeholder: 'Managing Director', required: true },
  { key: 'company_name', title: 'Company name', desc: 'Your agency name.', placeholder: 'Provide Media Brands', required: true },
  { key: 'company_email', title: 'Company email', desc: 'Where replies should land.', placeholder: 'hello@providemedia.com', required: true, type: 'email' },
  { key: 'company_website', title: 'Website', desc: 'Optional. Adds credibility.', placeholder: 'providemedia.com' },
  { key: 'company_phone', title: 'Phone', desc: 'Optional.', placeholder: '+1 (555) 123-4567' },
]

function Divider() {
  return <div style={{ height: 1, background: '#1a1a1a' }} />
}

function Section({ title, desc, optional, children }: { title: string; desc: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-10" style={{ gap: 24, padding: '28px 0' }}>
      <div className="md:col-span-4">
        <h3 style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '1.0625rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          {title}
          {optional && (
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#888', background: 'rgba(255,255,255,0.05)', border: '1px solid #222', borderRadius: 999, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Optional</span>
          )}
        </h3>
        <p style={{ color: '#666', fontSize: '0.875rem', marginTop: 4, lineHeight: 1.5 }}>{desc}</p>
      </div>
      <div className="md:col-span-6">{children}</div>
    </div>
  )
}

export default function BrandingSettings() {
  const [form, setForm] = useState<Branding>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [logoError, setLogoError] = useState('')

  useEffect(() => {
    try { const local = localStorage.getItem(BRANDING_KEY); if (local) setForm({ ...EMPTY, ...JSON.parse(local) }) } catch {}
    fetch('/api/profile').then(r => r.json()).then(d => {
      if (d.profile) setForm(prev => ({ ...prev, ...Object.fromEntries(Object.entries(d.profile).filter(([, v]) => v)) }))
    }).catch(() => {})
  }, [])

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError('')
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setLogoError('Please choose an image file.'); return }
    if (file.size > 1.5 * 1024 * 1024) { setLogoError('Logo must be under 1.5 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => setForm(prev => ({ ...prev, company_logo_url: String(reader.result) }))
    reader.readAsDataURL(file)
  }

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
      <form onSubmit={save} style={{ padding: '32px 28px', maxWidth: 880, margin: '0 auto' }}>
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.625rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Agency Branding</h1>
          <p style={{ color: '#888', fontSize: '0.9375rem', marginTop: 4 }}>Manage your agency identity. This signature appears on every email you send.</p>
        </div>
        <Divider />

        {/* Logo — square placeholder (replaces the round avatar) */}
        <Section title="Your logo" desc="Optional but recommended. It appears in your email signature so you look like a real agency.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <label style={{ position: 'relative', width: 112, height: 112, borderRadius: 14, cursor: 'pointer', overflow: 'hidden', background: '#0d0d0d', border: form.company_logo_url ? '1px solid #1f1f1f' : '1.5px dashed #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {form.company_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.company_logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 10 }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#555' }}>
                  <ImageIcon size={24} />
                  <span style={{ fontSize: 11 }}>Logo</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleLogo} style={{ display: 'none' }} />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="btn-outline-gold" style={{ padding: '9px 16px', fontSize: '0.875rem', cursor: 'pointer', width: 'fit-content' }}>
                <Upload size={15} /> {form.company_logo_url ? 'Replace logo' : 'Upload logo'}
                <input type="file" accept="image/*" onChange={handleLogo} style={{ display: 'none' }} />
              </label>
              {form.company_logo_url && (
                <button type="button" onClick={() => setForm({ ...form, company_logo_url: '' })} style={{ background: 'none', border: 'none', color: '#777', fontSize: '0.8125rem', cursor: 'pointer', textAlign: 'left' }}>Remove</button>
              )}
              <span style={{ color: '#555', fontSize: '0.75rem' }}>PNG, JPG or WEBP, under 1.5 MB.</span>
            </div>
          </div>
          {logoError && <p style={{ color: '#f87171', fontSize: '0.8125rem', marginTop: 10 }}>{logoError}</p>}
        </Section>
        <Divider />

        {/* Text fields */}
        {TEXT_FIELDS.map((f, i) => (
          <div key={f.key}>
            <Section title={f.title} desc={f.desc} optional={!f.required}>
              <input
                className="input-dark"
                value={form[f.key]}
                placeholder={f.placeholder}
                required={f.required}
                type={f.type ?? 'text'}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                style={{ maxWidth: 420 }}
              />
            </Section>
            {i < TEXT_FIELDS.length - 1 && <Divider />}
          </div>
        ))}
        <Divider />

        {/* Signature preview */}
        <Section title="Email signature" desc="A live preview of what creators and sponsors see at the bottom of your emails.">
          <div style={{ background: '#0f0f0f', border: '1px solid #1c1c1c', borderRadius: 12, padding: '18px 20px', maxWidth: 420 }}>
            <p style={{ color: '#888', fontSize: '0.9375rem', marginBottom: 12 }}>…looking forward to hearing from you.</p>
            <div style={{ borderTop: '1px solid #1f1f1f', paddingTop: 12, color: '#d0d0d0', fontSize: '0.9375rem', lineHeight: 1.7 }}>
              <div>Best,</div>
              {form.company_logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.company_logo_url} alt="" style={{ height: 36, width: 'auto', maxWidth: 150, objectFit: 'contain', margin: '6px 0' }} />
              )}
              <div style={{ fontWeight: 700, color: '#f5f5f5' }}>{sigName}</div>
              <div>{sigLine}</div>
              <div style={{ color: '#FFD700' }}>{form.company_email || 'you@company.com'}</div>
              {form.company_website && <div style={{ color: '#666' }}>{form.company_website}</div>}
              {form.company_phone && <div style={{ color: '#666' }}>{form.company_phone}</div>}
            </div>
          </div>
        </Section>
        <Divider />

        {/* Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 24 }}>
          <button type="submit" disabled={saving} className="btn-gold" style={{ padding: '12px 28px' }}>
            {saving ? <Loader2 size={17} className="animate-spin" /> : saved ? <><Check size={17} /> Saved</> : 'Save branding'}
          </button>
          {saved && <span style={{ color: '#00D084', fontSize: '0.875rem' }}>Signature updated everywhere.</span>}
        </div>
      </form>
    </DashboardShell>
  )
}
