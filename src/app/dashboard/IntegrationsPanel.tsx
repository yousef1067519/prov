'use client'

import { useState, useEffect } from 'react'
import { Webhook, Loader2, Check, Send, MessageSquare, Zap } from 'lucide-react'
import DashboardShell from './DashboardShell'

const input: React.CSSProperties = { width: '100%', background: '#0d0d0d', border: '1px solid #222', borderRadius: 8, color: '#e8e8e8', fontSize: '0.85rem', padding: '10px 12px', outline: 'none', fontFamily: 'monospace' }

export default function IntegrationsPanel() {
  const [slack, setSlack] = useState('')
  const [zapier, setZapier] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [testing, setTesting] = useState<'' | 'slack' | 'zapier'>('')

  useEffect(() => {
    (async () => {
      try { const d = await (await fetch('/api/integrations/webhooks')).json(); setSlack(d.slack || ''); setZapier(d.zapier || '') } catch {}
    })()
  }, [])

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/integrations/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slack, zapier }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Save failed')
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed') }
    setSaving(false)
  }
  async function test(target: 'slack' | 'zapier') {
    setTesting(target)
    await fetch('/api/integrations/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ test: target }) }).catch(() => {})
    setTimeout(() => setTesting(''), 1200)
  }

  return (
    <DashboardShell active="integrations">
      <div style={{ padding: '24px 28px', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Webhook size={22} style={{ color: '#FFD700' }} />
          <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Integrations</h1>
        </div>
        <p style={{ color: '#666', marginTop: 4, marginBottom: 24 }}>Send Prov events — invites, content approvals, and more — to Slack or Zapier via webhooks.</p>

        {error && <p style={{ color: '#f87171', fontSize: '0.8125rem', marginBottom: 14 }}>{error}</p>}

        {/* Slack */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <MessageSquare size={18} style={{ color: '#FFD700' }} />
            <h2 style={{ color: '#e8e8e8', fontWeight: 700, fontSize: '0.95rem' }}>Slack</h2>
            {slack && <span style={{ fontSize: '0.7rem', color: '#5dd47a' }}>connected</span>}
          </div>
          <p style={{ color: '#666', fontSize: '0.78rem', marginBottom: 10 }}>
            Free — create an Incoming Webhook at <span style={{ color: '#9aa6e8' }}>api.slack.com/messaging/webhooks</span>, then paste the URL.
          </p>
          <input value={slack} onChange={e => setSlack(e.target.value)} placeholder="https://hooks.slack.com/services/..." style={input} />
          {slack && <button onClick={() => test('slack')} style={testBtn}>{testing === 'slack' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send test</button>}
        </div>

        {/* Zapier */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <Zap size={18} style={{ color: '#FFD700' }} />
            <h2 style={{ color: '#e8e8e8', fontWeight: 700, fontSize: '0.95rem' }}>Zapier</h2>
            {zapier && <span style={{ fontSize: '0.7rem', color: '#5dd47a' }}>connected</span>}
          </div>
          <p style={{ color: '#666', fontSize: '0.78rem', marginBottom: 10 }}>
            In Zapier, create a Zap with a <strong>Webhooks → Catch Hook</strong> trigger, copy its URL, and paste it here. Prov POSTs each event as JSON.
          </p>
          <input value={zapier} onChange={e => setZapier(e.target.value)} placeholder="https://hooks.zapier.com/hooks/catch/..." style={input} />
          {zapier && <button onClick={() => test('zapier')} style={testBtn}>{testing === 'zapier' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send test</button>}
        </div>

        <button onClick={save} disabled={saving} className="btn-gold" style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 8 }}>
          {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : saved ? <><Check size={15} /> Saved</> : 'Save'}
        </button>
      </div>
    </DashboardShell>
  )
}

const testBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, background: 'rgba(255,215,0,.08)', border: '1px solid rgba(255,215,0,.25)', color: '#FFD700', cursor: 'pointer' }
