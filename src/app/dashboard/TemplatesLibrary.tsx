'use client'

import { useEffect, useState } from 'react'
import { STEP1_STRATEGIES, STEP2_SPONSOR, buildSignature, TEMPLATE_VARIABLES, type EmailStrategy } from '@/lib/emailStrategies'
import { BRANDING_KEY } from './BrandingSettings'
import DashboardShell from './DashboardShell'
import { RotateCcw, Check } from 'lucide-react'

const CONV_COLOR: Record<string, string> = { Medium: '#888', 'Medium-High': '#38bdf8', High: '#FFD700', Highest: '#00D084' }

function StrategyCard({ s, signature }: { s: EmailStrategy; signature: string }) {
  const [subject, setSubject] = useState(s.subject)
  const [body, setBody] = useState(s.body)
  const [saved, setSaved] = useState(false)
  const KEY = `prov_tmpl_${s.id}`

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) { const v = JSON.parse(raw); setSubject(v.subject ?? s.subject); setBody(v.body ?? s.body) }
    } catch {}
  }, [KEY, s.subject, s.body])

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ subject, body })) } catch {}
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }
  function reset() {
    setSubject(s.subject); setBody(s.body)
    try { localStorage.removeItem(KEY) } catch {}
  }

  return (
    <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: 16, padding: '22px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div>
          <p style={{ color: '#f5f5f5', fontWeight: 800, fontSize: '1.0625rem' }}>{s.name}</p>
          <p style={{ color: '#666', fontSize: '0.8125rem', marginTop: 3 }}>Best for: {s.bestFor} · Tone: {s.tone}</p>
        </div>
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: CONV_COLOR[s.conversion], border: `1px solid ${CONV_COLOR[s.conversion]}40`, background: `${CONV_COLOR[s.conversion]}14`, borderRadius: 6, padding: '4px 10px', whiteSpace: 'nowrap' }}>
          {s.conversion} conversion
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {/* editor */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: 6 }}>Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} className="input-dark" style={{ marginBottom: 12 }} />
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: 6 }}>Body</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={10}
            style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 8, padding: '10px 12px', color: '#bbb', fontSize: '0.875rem', lineHeight: 1.65, resize: 'vertical', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button onClick={save} className="btn-gold" style={{ padding: '8px 16px', fontSize: '0.8125rem' }}>{saved ? <><Check size={13} /> Saved</> : 'Save'}</button>
            <button onClick={reset} className="btn-outline-gold" style={{ padding: '8px 14px', fontSize: '0.8125rem' }}><RotateCcw size={13} /> Reset</button>
          </div>
        </div>

        {/* live preview with signature */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: 6 }}>Preview (with your signature)</label>
          <div style={{ background: '#0f0f0f', border: '1px solid #1c1c1c', borderRadius: 8, padding: '14px 16px', minHeight: 220 }}>
            <p style={{ color: '#d0d0d0', fontWeight: 700, fontSize: '0.875rem', marginBottom: 10 }}>{subject}</p>
            <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{body}</p>
            <p style={{ color: '#888', fontSize: '0.875rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginTop: 14, paddingTop: 12, borderTop: '1px solid #1a1a1a' }}>{signature}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TemplatesLibrary({ email, accessType, daysLeft }: { email: string; accessType: string; daysLeft: number | null }) {
  const [signature, setSignature] = useState(buildSignature({}))

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BRANDING_KEY)
      if (raw) setSignature(buildSignature(JSON.parse(raw)))
    } catch {}
  }, [])

  return (
    <DashboardShell active="templates" email={email} accessType={accessType} daysLeft={daysLeft}>
      <div style={{ padding: '32px 28px', maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f5f5f5', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Email Templates</h1>
        <p style={{ color: '#666', marginTop: 4, marginBottom: 20, maxWidth: 640, lineHeight: 1.6 }}>
          Five cold-outreach strategies for creators (Step 1). Edit any of them. Your branding signature is appended automatically.
        </p>

        {/* hard rule banner */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(0,208,132,0.05)', border: '1px solid rgba(0,208,132,0.18)', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
          <Check size={18} style={{ color: '#00D084', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.875rem', color: '#b9b9b9', lineHeight: 1.6 }}>
            <span style={{ color: '#00D084', fontWeight: 700 }}>Step 1 rule: </span>
            these emails go to creators only. They position you as a facilitator who connects creators with partnerships. They never name a specific brand and never say you represent or work for brands.
          </div>
        </div>

        {/* variables legend */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: '0.75rem', color: '#555', marginBottom: 8 }}>Available variables (auto-filled when sending):</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TEMPLATE_VARIABLES.map(v => (
              <span key={v} style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#FFD700', background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.16)', borderRadius: 6, padding: '3px 8px' }}>{v}</span>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>Step 1 · Creator outreach</p>
        {STEP1_STRATEGIES.map(s => <StrategyCard key={s.id} s={s} signature={signature} />)}

        <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', margin: '12px 0 14px' }}>Step 2 · Sponsor pitch</p>
        <StrategyCard s={STEP2_SPONSOR} signature={signature} />
      </div>
    </DashboardShell>
  )
}
