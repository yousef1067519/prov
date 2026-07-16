'use client'

// Ask-your-data — a query box over the workspace's own deal history (Intelligence
// page). Sends the question to /api/intelligence/ask, which answers strictly from
// this workspace's tracked campaigns, pipeline deals, and outreach stats.

import { useState } from 'react'
import { Brain, Loader2, ArrowRight } from 'lucide-react'

const SUGGESTIONS = [
  'Which brands generated the most revenue?',
  'Which creators have the best engagement?',
  'What does our pipeline look like right now?',
  'Which niche closes the biggest deals?',
]

export default function AskYourData() {
  const [q, setQ] = useState('')
  const [asked, setAsked] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function ask(question: string) {
    const trimmed = question.trim()
    if (!trimmed || busy) return
    setBusy(true); setError(''); setAnswer(''); setAsked(trimmed)
    try {
      const res = await fetch('/api/intelligence/ask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Could not answer — try again.'); return }
      setAnswer(d.answer)
    } catch { setError('Network error — try again.') }
    finally { setBusy(false) }
  }

  return (
    <div className="card-dark" style={{ padding: 20, marginBottom: 22, border: '1px solid rgba(255,215,0,0.18)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
        <Brain size={17} style={{ color: '#FFD700' }} />
        <span style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '0.9375rem' }}>Ask your data</span>
        <span style={{ color: '#666', fontSize: '0.78rem' }}>answers come only from your own deal history</span>
      </div>

      <form onSubmit={e => { e.preventDefault(); ask(q) }} style={{ display: 'flex', gap: 10 }}>
        <input className="input-dark" style={{ flex: 1 }} value={q} onChange={e => setQ(e.target.value)}
          placeholder="e.g. which sponsors respond best to fitness creators?" maxLength={500} />
        <button type="submit" disabled={busy || !q.trim()} className="btn-gold"
          style={{ padding: '10px 18px', display: 'inline-flex', alignItems: 'center', gap: 7, opacity: q.trim() ? 1 : 0.5 }}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />} Ask
        </button>
      </form>

      {!asked && !busy && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => { setQ(s); ask(s) }}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', color: '#888', borderRadius: 99, padding: '5px 12px', fontSize: '0.75rem', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#FFD700'; e.currentTarget.style.borderColor = 'rgba(255,215,0,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#222' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {busy && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888', fontSize: '0.85rem', marginTop: 14 }}>
          <Loader2 size={14} className="animate-spin" /> Reading your deal history…
        </p>
      )}
      {error && <p style={{ color: '#f87171', fontSize: '0.85rem', marginTop: 14 }}>{error}</p>}
      {answer && !busy && (
        <div style={{ marginTop: 14, background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ color: '#666', fontSize: '0.75rem', marginBottom: 8 }}>“{asked}”</p>
          <p style={{ color: '#d8d8d8', fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{answer}</p>
        </div>
      )}
    </div>
  )
}
