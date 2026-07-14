'use client'

import { useEffect, useState } from 'react'
import { Upload, Check, Loader2 } from 'lucide-react'
import { fetchWhiteLabel, pushWhiteLabel, DEFAULT_WL, type WhiteLabel } from '@/lib/whitelabel'

function WLToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} role="switch" aria-checked={on}
      style={{ width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', background: on ? '#FFD700' : '#2a2a2a', transition: 'background 0.2s' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: on ? '#0a0a0a' : '#777', transition: 'left 0.2s' }} />
    </button>
  )
}

export function WhiteLabelTab() {
  const [wl, setWl] = useState<WhiteLabel>(DEFAULT_WL)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [logoError, setLogoError] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => { fetchWhiteLabel().then(setWl) }, [])

  function set<K extends keyof WhiteLabel>(key: K, value: WhiteLabel[K]) {
    setWl(prev => ({ ...prev, [key]: value })); setSaved(false)
  }

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 1_000_000) { setLogoError('Logo must be under 1MB.'); return }
    setLogoError('')
    const reader = new FileReader()
    reader.onload = () => set('logo', String(reader.result))
    reader.readAsDataURL(file)
  }

  async function save() {
    setSaving(true); setSaveError('')
    const ok = await pushWhiteLabel(wl)
    setSaving(false)
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    else setSaveError('Could not save. Please try again.')
  }

  const brand = wl.name || 'Prov'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h2 style={{ color: '#f5f5f5', fontWeight: 800, fontSize: '1.125rem' }}>White Labeling</h2>
        <WLToggle on={wl.enabled} onChange={v => set('enabled', v)} />
      </div>
      <p style={{ color: '#777', fontSize: '0.875rem', marginBottom: 24, maxWidth: 560 }}>
        Rebrand Prov as your own product. When enabled, your brand name, logo and colors replace Prov&apos;s across the
        dashboard sidebar, the client portal, and PDF reports.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 24, alignItems: 'start' }}>
        {/* ── Form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, opacity: wl.enabled ? 1 : 0.5, pointerEvents: wl.enabled ? 'auto' : 'none' }}>
          {/* Brand name */}
          <Field label="Brand name" desc="Shown instead of “Prov”.">
            <input value={wl.name} onChange={e => set('name', e.target.value)} placeholder="Acme Agency" style={inp} />
          </Field>

          {/* Logo */}
          <Field label="Logo" desc="Square, under 1MB. Appears in the sidebar, portal and reports.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <label style={{ width: 64, height: 64, borderRadius: 12, cursor: 'pointer', overflow: 'hidden', background: '#0d0d0d', border: wl.logo ? '1px solid #1f1f1f' : '1.5px dashed #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {wl.logo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={wl.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                  : <Upload size={18} style={{ color: '#555' }} />}
                <input type="file" accept="image/*" onChange={onLogo} style={{ display: 'none' }} />
              </label>
              {wl.logo && <button onClick={() => set('logo', '')} style={{ background: 'none', border: 'none', color: '#777', fontSize: '0.8125rem', cursor: 'pointer' }}>Remove</button>}
            </div>
            {logoError && <p style={{ color: '#f87171', fontSize: '0.8125rem', marginTop: 8 }}>{logoError}</p>}
          </Field>

          {/* Colors */}
          <div style={{ display: 'flex', gap: 16 }}>
            <Field label="Primary color" desc="Buttons & accents.">
              <ColorInput value={wl.primary} onChange={v => set('primary', v)} />
            </Field>
            <Field label="Accent color" desc="Gradients & fills.">
              <ColorInput value={wl.accent} onChange={v => set('accent', v)} />
            </Field>
          </div>

          {/* Footer */}
          <Field label="Custom footer" desc="Shown at the bottom of reports.">
            <input value={wl.footer} onChange={e => set('footer', e.target.value)} placeholder="© 2026 Acme Agency. All rights reserved." style={inp} />
          </Field>

          {/* Domain */}
          <Field label="Custom domain" desc="Point a CNAME to your Prov subdomain (setup guide below).">
            <input value={wl.domain} onChange={e => set('domain', e.target.value)} placeholder="portal.youragency.com" style={inp} />
          </Field>

          <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 10, padding: '14px 16px', fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>
            <strong style={{ color: '#aaa' }}>Custom domain setup:</strong> add a CNAME record at your DNS provider pointing
            <code style={{ color: '#FFD700', margin: '0 4px' }}>{wl.domain || 'portal.youragency.com'}</code> to
            <code style={{ color: '#FFD700', margin: '0 4px' }}>cname.prov.app</code>, then email support to attach it. Until then your portal links use the default domain.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={save} disabled={saving} className="btn-gold" style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 8 }}>
              {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : saved ? <><Check size={15} /> Saved</> : 'Save white-label settings'}
            </button>
            {saveError && <span style={{ color: '#f87171', fontSize: '0.8125rem' }}>{saveError}</span>}
          </div>
        </div>

        {/* ── Live preview ── */}
        <div style={{ position: 'sticky', top: 80 }}>
          <p style={{ fontSize: '0.6875rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Live preview</p>
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #1f1f1f', background: '#0c0c12' }}>
            {/* Sidebar header mock */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #1a1a22', display: 'flex', alignItems: 'center', gap: 10 }}>
              {wl.enabled && wl.logo
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={wl.logo} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
                : <span style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${wl.enabled ? wl.primary : '#FFD700'}, ${wl.enabled ? wl.accent : '#CA8A04'})` }} />}
              <span style={{ fontWeight: 900, color: wl.enabled ? wl.primary : '#FFD700', fontFamily: 'var(--font-display)' }}>{wl.enabled ? brand : 'Prov'}</span>
            </div>
            {/* Button + portal chip mock */}
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button style={{ background: `linear-gradient(135deg, ${wl.enabled ? wl.primary : '#FFD700'}, ${wl.enabled ? wl.accent : '#CA8A04'})`, color: '#0a0a0a', border: 'none', borderRadius: 9, padding: '9px', fontWeight: 700, fontSize: '0.8125rem' }}>Primary button</button>
              <div style={{ background: '#111', borderRadius: 9, padding: 12 }}>
                <p style={{ fontSize: '0.75rem', color: '#888' }}>Client Portal header</p>
                <p style={{ fontWeight: 800, color: wl.enabled ? wl.primary : '#FFD700', fontFamily: 'var(--font-display)' }}>{wl.enabled ? brand : 'Prov'}</p>
              </div>
              <p style={{ fontSize: '0.6875rem', color: '#555' }}>{wl.enabled ? (wl.footer || 'Custom footer appears in reports') : 'Powered by Prov'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ color: '#e0e0e0', fontWeight: 600, fontSize: '0.875rem' }}>{label}</label>
      {desc && <p style={{ color: '#666', fontSize: '0.75rem', margin: '2px 0 8px' }}>{desc}</p>}
      {children}
    </div>
  )
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: 40, height: 36, borderRadius: 8, border: '1px solid #222', background: '#0d0d0d', cursor: 'pointer', padding: 2 }} />
      <input value={value} onChange={e => onChange(e.target.value)} style={{ ...inp, width: 100, fontFamily: 'monospace' }} />
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', background: '#0d0d0d', border: '1px solid #222', borderRadius: 8, color: '#e8e8e8', fontSize: '0.875rem', padding: '10px 12px', outline: 'none' }
