'use client'

// "Request a feature" — a small link in the dashboard sidebar that opens a modal.
// Sends to /api/feature-request, which emails the team (Reply goes straight back
// to the requester) and records it as a support ticket.

import { useState } from 'react'
import { Lightbulb, Loader2, X, Check } from 'lucide-react'

export default function FeatureRequest() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  function close() {
    setOpen(false)
    // Reset a moment later so the modal doesn't visibly flip back mid-fade.
    setTimeout(() => { setSent(false); setText(''); setError('') }, 200)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/feature-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: text.trim() }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error ?? 'Could not send — try again.'); setBusy(false); return }
      setSent(true)
    } catch { setError('Network error — try again.') }
    setBusy(false)
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', background: 'none', border: 'none', color: '#777', fontSize: '0.8125rem', cursor: 'pointer', padding: '9px 13px', borderRadius: 9, textAlign: 'left' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#FFD700')}
        onMouseLeave={e => (e.currentTarget.style.color = '#777')}>
        <Lightbulb size={15} /> Request a feature
      </button>

      {open && (
        <>
          <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', zIndex: 61, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'calc(100% - 40px)', maxWidth: 460, background: '#111', border: '1px solid #262626', borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
              <Lightbulb size={17} style={{ color: '#FFD700' }} />
              <h2 style={{ color: '#f5f5f5', fontWeight: 800, fontSize: '1.05rem' }}>Request a feature</h2>
              <button onClick={close} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 4 }}><X size={17} /></button>
            </div>

            {sent ? (
              <div style={{ padding: '18px 0 6px', textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,208,132,0.12)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                  <Check size={20} style={{ color: '#00D084' }} />
                </div>
                <p style={{ color: '#f0f0f0', fontWeight: 700, marginBottom: 4 }}>Got it — thank you</p>
                <p style={{ color: '#888', fontSize: '0.875rem' }}>We read every request, and we&apos;ll reply to you directly if we have questions.</p>
                <button onClick={close} className="btn-gold" style={{ marginTop: 18, padding: '9px 22px' }}>Close</button>
              </div>
            ) : (
              <>
                <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: 16 }}>
                  What would make Prov better for your agency? Tell us what you&apos;re trying to do — we build from real requests.
                </p>
                <form onSubmit={submit}>
                  <textarea value={text} onChange={e => setText(e.target.value)} autoFocus rows={5} maxLength={2000}
                    placeholder="e.g. I want to bulk-move deals between clients, or sync invoices to QuickBooks…"
                    style={{ width: '100%', background: '#0a0a0a', border: '1px solid #262626', borderRadius: 10, padding: '12px 14px', color: '#e8e8e8', fontSize: '0.9rem', lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit', marginBottom: 12 }} />
                  {error && <p style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: 10 }}>{error}</p>}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={close} style={{ background: 'none', border: '1px solid #262626', color: '#aaa', borderRadius: 9, padding: '9px 18px', fontSize: '0.875rem', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" disabled={busy || !text.trim()} className="btn-gold"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', opacity: text.trim() ? 1 : 0.5 }}>
                      {busy ? <Loader2 size={15} className="animate-spin" /> : <Lightbulb size={15} />} Send request
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}
