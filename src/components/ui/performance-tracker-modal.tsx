'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface PerformanceTrackerModalProps {
  campaign_id?: string
  creator_id?: string
  creator_email?: string
  creator_handle: string
  brand_name: string
  onClose: () => void
  onSave: (data: unknown) => void
}

const PLATFORM_KEYS: Record<string, string> = {
  'YouTube': 'youtube',
  'YouTube Shorts': 'youtube_shorts',
  'Instagram Reels': 'instagram',
  'TikTok': 'tiktok',
  'Twitch': 'twitch',
  'X': 'x',
  'LinkedIn': 'linkedin',
}

const METRIC_FIELDS: Array<{ key: string; label: string; help?: string }> = [
  { key: 'views', label: 'Views' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'shares', label: 'Shares' },
  { key: 'clicks', label: 'Link clicks' },
  { key: 'conversions', label: 'Conversions' },
  { key: 'sales', label: 'Sales' },
  { key: 'revenue_generated', label: 'Revenue generated ($)', help: 'Deal value + attributed sales' },
]

export default function PerformanceTrackerModal({
  campaign_id,
  creator_id,
  creator_email,
  creator_handle,
  brand_name: initialBrand,
  onClose,
  onSave,
}: PerformanceTrackerModalProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [brandName, setBrandName] = useState(initialBrand)
  const [product, setProduct] = useState('')
  const [datePosted, setDatePosted] = useState(() => new Date().toISOString().slice(0, 10))
  const [platforms, setPlatforms] = useState<string[]>([])
  const [mediaLinks, setMediaLinks] = useState<Record<string, string>>({})
  const [metrics, setMetrics] = useState<Record<string, number>>(
    Object.fromEntries(METRIC_FIELDS.map(f => [f.key, 0]))
  )
  const [notes, setNotes] = useState('')
  const [brandFeedback, setBrandFeedback] = useState('')
  const [fetching, setFetching] = useState(false)
  const [autoFetched, setAutoFetched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const togglePlatform = (p: string) =>
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

  async function autoFetchYouTube(url: string) {
    setFetching(true)
    setError('')
    try {
      const res = await fetch('/api/performance/youtube-metrics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Auto-fetch failed — enter metrics manually.'); return }
      setMetrics(prev => ({ ...prev, views: d.metrics.views, likes: d.metrics.likes, comments: d.metrics.comments }))
      setAutoFetched(true)
    } catch {
      setError('Auto-fetch failed — enter metrics manually.')
    } finally {
      setFetching(false)
    }
  }

  async function save() {
    if (!brandName.trim()) { setError('Brand name is required'); return }
    setSaving(true)
    setError('')
    try {
      const platformsPayload = Object.fromEntries(
        platforms.map(p => [PLATFORM_KEYS[p] ?? p.toLowerCase(), { url: mediaLinks[p] || null }])
      )
      const res = await fetch('/api/performance/record', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id,
          creator_id,
          creator_email,
          creator_handle,
          brand_name: brandName.trim(),
          product_promoted: product.trim() || null,
          campaign_date_posted: new Date(datePosted).toISOString(),
          platforms: platformsPayload,
          metrics,
          notes: notes.trim() || null,
          brand_feedback: brandFeedback.trim() || null,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Save failed'); return }
      onSave(d)
      onClose()
    } catch {
      setError('Save failed — try again')
    } finally {
      setSaving(false)
    }
  }

  const stepTitles = ['Platforms & links', 'Metrics', 'Details & save']

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#0f0f0f', border: '1px solid #262626', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, background: '#0f0f0f', borderBottom: '1px solid #1a1a1a', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
          <div>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#f5f5f5' }}>Track campaign performance</h2>
            <p style={{ fontSize: '0.8125rem', color: '#666', marginTop: 2 }}>
              {brandName || 'Brand'} × {creator_handle} · step {step + 1} of 3 — {stepTitles[step]}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ padding: 22 }}>
          {error && (
            <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#f87171', fontSize: '0.8125rem' }}>
              {error}
            </div>
          )}

          {step === 0 && (
            <div>
              <p className="disc-eyebrow">Where was the content posted?</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
                {Object.keys(PLATFORM_KEYS).map(p => (
                  <button key={p} onClick={() => togglePlatform(p)}
                    style={{
                      padding: '12px 10px', borderRadius: 10, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                      border: platforms.includes(p) ? '1px solid #FFD700' : '1px solid #2a2a2a',
                      background: platforms.includes(p) ? 'rgba(255,215,0,0.08)' : '#141414',
                      color: platforms.includes(p) ? '#FFD700' : '#ccc',
                    }}>
                    {p}
                  </button>
                ))}
              </div>

              {platforms.map(p => (
                <div key={p} style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#999', marginBottom: 5 }}>{p} link</label>
                  <input className="input-dark" type="url" placeholder="https://…" value={mediaLinks[p] || ''}
                    onChange={e => setMediaLinks({ ...mediaLinks, [p]: e.target.value })} />
                  {(p === 'YouTube' || p === 'YouTube Shorts') && mediaLinks[p] && (
                    <button onClick={() => autoFetchYouTube(mediaLinks[p])} disabled={fetching}
                      style={{ marginTop: 8, padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(255,215,0,0.15)', color: '#FFD700', opacity: fetching ? 0.6 : 1 }}>
                      {fetching ? 'Fetching…' : autoFetched ? '✓ Metrics pulled — refetch' : 'Auto-fetch metrics from YouTube'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="disc-eyebrow">Performance metrics {autoFetched && <span style={{ color: '#4ade80', textTransform: 'none', letterSpacing: 0 }}>(views/likes/comments auto-filled from YouTube)</span>}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {METRIC_FIELDS.map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#999', marginBottom: 5 }}>{f.label}</label>
                    <input className="input-dark" inputMode="numeric"
                      value={metrics[f.key] > 0 ? metrics[f.key].toLocaleString('en-US') : ''}
                      placeholder="0"
                      onChange={e => {
                        const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 12)
                        setMetrics({ ...metrics, [f.key]: digits ? Number(digits) : 0 })
                      }} />
                    {f.help && <p style={{ fontSize: '0.6875rem', color: '#555', marginTop: 4 }}>{f.help}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#999', marginBottom: 5 }}>Brand *</label>
                <input className="input-dark" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Brand name" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#999', marginBottom: 5 }}>Product promoted</label>
                  <input className="input-dark" value={product} onChange={e => setProduct(e.target.value)} placeholder="e.g. Galaxy S25" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#999', marginBottom: 5 }}>Date posted</label>
                  <input className="input-dark" type="date" value={datePosted} onChange={e => setDatePosted(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#999', marginBottom: 5 }}>Brand feedback</label>
                <textarea className="input-dark" style={{ minHeight: 60, resize: 'vertical' }} value={brandFeedback} onChange={e => setBrandFeedback(e.target.value)} placeholder="What did the brand say about the results?" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#999', marginBottom: 5 }}>Notes</label>
                <textarea className="input-dark" style={{ minHeight: 60, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything future-you should know about this deal" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ position: 'sticky', bottom: 0, background: '#0f0f0f', borderTop: '1px solid #1a1a1a', padding: '14px 22px', display: 'flex', gap: 10 }}>
          {step > 0 && (
            <button onClick={() => setStep((step - 1) as 0 | 1)} className="btn-outline-gold" style={{ padding: '0 16px', fontSize: '0.875rem' }}>
              Back
            </button>
          )}
          <button
            onClick={() => { if (step < 2) setStep((step + 1) as 1 | 2); else save() }}
            disabled={saving || (step === 0 && platforms.length === 0)}
            className="btn-gold"
            style={{ marginLeft: 'auto', padding: '0 18px', fontSize: '0.875rem', opacity: saving || (step === 0 && platforms.length === 0) ? 0.5 : 1 }}>
            {saving ? 'Saving…' : step === 2 ? 'Save performance record' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
