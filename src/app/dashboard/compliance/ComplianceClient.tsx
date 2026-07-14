'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShieldAlert, ShieldCheck, UploadCloud, ExternalLink, Loader2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'compliance-proofs'

interface Disclosure {
  id: string; deal_id: string; deliverable_label: string; platform: string | null
  required_language: string; placement: string; status: 'pending' | 'live_unverified' | 'verified' | 'flagged'
  posted_url: string | null; proof_path: string | null; notes: string | null
  verified_at: string | null
  deals?: { name: string; stage: string } | null
}
interface Deal { id: string; name: string; stage: string }

const STATUS: Record<Disclosure['status'], { bg: string; fg: string; label: string }> = {
  pending: { bg: 'rgba(255,255,255,.08)', fg: '#999', label: 'Pending' },
  live_unverified: { bg: 'rgba(255,193,7,.14)', fg: '#ffca28', label: 'Live — unverified' },
  verified: { bg: 'rgba(46,160,67,.16)', fg: '#5dd47a', label: 'Verified' },
  flagged: { bg: 'rgba(255,92,92,.14)', fg: '#ff6b6b', label: 'Flagged' },
}
const PLACEMENTS: Array<[string, string]> = [
  ['caption_first_line', '#ad — first line of caption'],
  ['video_first_frame', 'Disclosure in first frame of video'],
  ['paid_partnership_tag', 'Native paid-partnership tag'],
  ['audio_disclosure', 'Verbal disclosure (audio)'],
  ['stream_overlay', 'Persistent stream overlay'],
]

export default function ComplianceClient() {
  const supabase = createClient()
  const [rows, setRows] = useState<Disclosure[]>([])
  const [exposed, setExposed] = useState(0)
  const [deals, setDeals] = useState<Deal[]>([])
  const [filter, setFilter] = useState<'all' | Disclosure['status']>('all')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ deal_id: '', deliverable_label: '', platform: '', placement: 'caption_first_line', required_language: '#ad in the first line of the caption' })
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const d = await (await fetch('/api/compliance')).json()
      setRows(d.disclosures ?? []); setExposed(d.exposed ?? 0)
    } catch { /* table not migrated yet */ }
    try {
      const d = await (await fetch('/api/deals')).json()
      setDeals(Array.isArray(d) ? d : d.deals ?? [])
    } catch { /* pipeline module may not be live yet */ }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function update(id: string, patch: Record<string, unknown>) {
    setBusy(id); setError('')
    const res = await fetch('/api/compliance', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    if (!res.ok) setError((await res.json()).error ?? 'Update failed')
    await load(); setBusy(null)
  }

  async function uploadProof(row: Disclosure, file: File) {
    setBusy(row.id); setError('')
    try {
      const res = await fetch('/api/compliance/upload-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disclosureId: row.id, filename: file.name }),
      })
      const u = await res.json()
      if (!res.ok) throw new Error(u.error || 'Could not start upload')
      const { error: upErr } = await supabase.storage.from(BUCKET).uploadToSignedUrl(u.path, u.token, file)
      if (upErr) throw new Error(upErr.message)
      await update(row.id, { proof_path: u.path })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed'); setBusy(null)
    }
  }

  async function viewProof(path: string) {
    const res = await fetch(`/api/compliance/upload-url?path=${encodeURIComponent(path)}`)
    const d = await res.json()
    if (res.ok && d.url) window.open(d.url, '_blank')
  }

  async function addRequirement(e: React.FormEvent) {
    e.preventDefault(); setError('')
    const res = await fetch('/api/compliance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    if (!res.ok) { setError((await res.json()).error ?? 'Could not create requirement'); return }
    setShowAdd(false)
    setForm({ deal_id: '', deliverable_label: '', platform: '', placement: 'caption_first_line', required_language: '#ad in the first line of the caption' })
    await load()
  }

  const visible = filter === 'all' ? rows : rows.filter(r => r.status === filter)

  return (
    <div style={{ padding: '28px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: 6 }}>Compliance</h1>
          <p style={{ color: '#777', fontSize: '0.9rem', maxWidth: 560 }}>
            FTC disclosure tracking per deliverable. Agency and creator share liability —
            penalties can exceed $50,000 per violation. Every approval here is logged to
            your audit trail.
          </p>
        </div>
        <button className="btn-gold" style={{ padding: '9px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }} onClick={() => setShowAdd(v => !v)}>
          <Plus size={15} /> Requirement
        </button>
      </div>

      {/* Exposure banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12, padding: '14px 18px', margin: '18px 0 22px',
        background: exposed > 0 ? 'rgba(255,92,92,.08)' : 'rgba(46,160,67,.08)',
        border: `1px solid ${exposed > 0 ? 'rgba(255,92,92,.25)' : 'rgba(46,160,67,.25)'}`,
      }}>
        {exposed > 0
          ? <><ShieldAlert size={20} style={{ color: '#ff6b6b', flexShrink: 0 }} />
              <span style={{ color: '#ff9b9b', fontSize: '0.9rem' }}>
                <strong>{exposed} live deliverable{exposed === 1 ? '' : 's'}</strong> without verified disclosure — regulatory exposure until proof is uploaded and verified.
              </span></>
          : <><ShieldCheck size={20} style={{ color: '#5dd47a', flexShrink: 0 }} />
              <span style={{ color: '#8fd9a0', fontSize: '0.9rem' }}>All live deliverables have verified disclosure.</span></>}
      </div>

      {showAdd && (
        <form onSubmit={addRequirement} className="card-dark" style={{ padding: 20, marginBottom: 22, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <select required className="input-dark" value={form.deal_id} onChange={e => setForm({ ...form, deal_id: e.target.value })}>
              <option value="">Select deal *</option>
              {deals.map(d => <option key={d.id} value={d.id}>{d.name} ({d.stage})</option>)}
            </select>
            <input required className="input-dark" placeholder="Deliverable (e.g. IG Reel #1) *" value={form.deliverable_label} onChange={e => setForm({ ...form, deliverable_label: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input className="input-dark" placeholder="Platform (Instagram, YouTube…)" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} />
            <select className="input-dark" value={form.placement} onChange={e => setForm({ ...form, placement: e.target.value })}>
              {PLACEMENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <input className="input-dark" placeholder="Required language" value={form.required_language} onChange={e => setForm({ ...form, required_language: e.target.value })} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn-gold" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>Add requirement</button>
            {deals.length === 0 && <span style={{ color: '#666', fontSize: '0.8rem', alignSelf: 'center' }}>No pipeline deals found — create a deal first.</span>}
          </div>
        </form>
      )}

      {error && <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginBottom: 14 }}>{error}</p>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['all', 'pending', 'live_unverified', 'verified', 'flagged'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 999, fontSize: '0.8rem', cursor: 'pointer',
            border: `1px solid ${filter === f ? '#FFD700' : '#2a2a2a'}`,
            background: filter === f ? 'rgba(255,215,0,.1)' : 'transparent',
            color: filter === f ? '#FFD700' : '#888',
          }}>
            {f === 'all' ? 'All' : STATUS[f].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: '#666', padding: 40, textAlign: 'center' }}><Loader2 size={18} className="animate-spin" style={{ display: 'inline' }} /> Loading…</div>
      ) : visible.length === 0 ? (
        <div className="card-dark" style={{ padding: 40, textAlign: 'center', color: '#666' }}>
          No disclosure requirements{filter !== 'all' ? ' in this status' : ' yet — add one per posted deliverable'}.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {visible.map(r => {
            const s = STATUS[r.status]
            return (
              <div key={r.id} className="card-dark" style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <strong style={{ color: '#f0f0f0', fontSize: '0.95rem' }}>{r.deliverable_label}</strong>
                    <span style={{ background: s.bg, color: s.fg, borderRadius: 999, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 600 }}>{s.label}</span>
                    {r.platform && <span style={{ color: '#666', fontSize: '0.78rem' }}>{r.platform}</span>}
                    {r.deals?.name && <span style={{ color: '#555', fontSize: '0.78rem' }}>· {r.deals.name}</span>}
                  </div>
                  <div style={{ color: '#888', fontSize: '0.8rem' }}>
                    Requires: <span style={{ color: '#bba14a' }}>{r.required_language}</span>
                    {' '}· {PLACEMENTS.find(([v]) => v === r.placement)?.[1] ?? r.placement}
                  </div>
                  {r.posted_url && (
                    <a href={r.posted_url} target="_blank" rel="noreferrer" style={{ color: '#8ab4f8', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      Posted deliverable <ExternalLink size={11} />
                    </a>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {busy === r.id ? <Loader2 size={16} className="animate-spin" style={{ color: '#FFD700' }} /> : (
                    <>
                      {r.status === 'pending' && (
                        <button onClick={() => {
                          const url = window.prompt('URL of the posted deliverable:')
                          if (url) update(r.id, { status: 'live_unverified', posted_url: url })
                        }} style={pill('#ffca28')}>Mark live</button>
                      )}
                      {(r.status === 'live_unverified' || r.status === 'flagged') && (
                        <>
                          <label style={{ ...pill('#8ab4f8'), display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <UploadCloud size={13} /> {r.proof_path ? 'Replace proof' : 'Upload proof'}
                            <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadProof(r, f) }} />
                          </label>
                          {r.proof_path && <button onClick={() => update(r.id, { status: 'verified' })} style={pill('#5dd47a')}>Verify</button>}
                          {r.status !== 'flagged' && <button onClick={() => update(r.id, { status: 'flagged' })} style={pill('#ff6b6b')}>Flag</button>}
                        </>
                      )}
                      {r.proof_path && <button onClick={() => viewProof(r.proof_path!)} style={pill('#999')}>View proof</button>}
                      {r.status === 'verified' && r.verified_at && (
                        <span style={{ color: '#555', fontSize: '0.72rem' }}>verified {new Date(r.verified_at).toLocaleDateString()}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function pill(color: string): React.CSSProperties {
  return {
    padding: '5px 12px', borderRadius: 8, fontSize: '0.78rem', cursor: 'pointer',
    border: `1px solid ${color}44`, background: `${color}14`, color,
  }
}
