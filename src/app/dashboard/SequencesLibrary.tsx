'use client'

// §8.4 — Sequences: the workspace's standardized outreach library.
// Replaces the per-browser localStorage template editor with team-shared,
// governed sequences: drafts anyone (working roles) can edit, an
// owner/admin-only approve step, and per-sequence performance pulled from
// real sends. The five built-in Prov strategies are seedable as drafts via
// an explicit button — never auto-seeded.

import { useCallback, useEffect, useState } from 'react'
import { STEP1_STRATEGIES, DEFAULT_FOLLOW_UPS, TEMPLATE_VARIABLES } from '@/lib/emailStrategies'
import DashboardShell from './DashboardShell'
import { Check, ChevronDown, Loader2, Plus, ShieldCheck, Trash2, Archive, RotateCcw, Sparkles } from 'lucide-react'

interface SequenceStep { subject: string; body: string; days_after_previous: number }
interface Sequence {
  id: string
  name: string
  strategy_key: string | null
  steps: SequenceStep[]
  status: 'draft' | 'approved' | 'archived'
  approved_at: string | null
  updated_at: string
}
interface SeqStats { sends: number; replies: number; reply_rate: number; wins: number }

const STATUS_META: Record<Sequence['status'], { label: string; color: string }> = {
  approved: { label: 'Approved', color: '#00D084' },
  draft: { label: 'Draft', color: '#FFD700' },
  archived: { label: 'Archived', color: '#666' },
}

function stepLabel(i: number, days: number): string {
  if (i === 0) return 'Step 1 · sent immediately'
  return `Step ${i + 1} · ${days} day${days === 1 ? '' : 's'} after previous`
}

function PerfCell({ s }: { s: SeqStats | undefined }) {
  if (!s || s.sends === 0) return <span style={{ color: '#444', fontSize: '0.8125rem' }}>No sends yet</span>
  return (
    <span style={{ display: 'inline-flex', gap: 14, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
      <span style={{ color: '#d0d0d0' }}><strong style={{ color: '#f0f0f0' }}>{s.sends}</strong> sent</span>
      <span style={{ color: s.reply_rate >= 10 ? '#4ade80' : '#888' }}><strong>{s.reply_rate}%</strong> replied</span>
      <span style={{ color: s.wins > 0 ? '#FFD700' : '#666' }}><strong>{s.wins}</strong> {s.wins === 1 ? 'win' : 'wins'}</span>
    </span>
  )
}

function SequenceCard({ seq, stats, canManage, canApprove, onSaved, onDeleted }: {
  seq: Sequence
  stats: SeqStats | undefined
  canManage: boolean
  canApprove: boolean
  onSaved: (s: Sequence) => void
  onDeleted: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(seq.name)
  const [steps, setSteps] = useState<SequenceStep[]>(seq.steps)
  const [busy, setBusy] = useState<string | null>(null) // 'save' | 'approve' | 'archive' | 'delete' | 'restore'
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const meta = STATUS_META[seq.status]
  const dirty = name !== seq.name || JSON.stringify(steps) !== JSON.stringify(seq.steps)

  async function put(patch: Record<string, unknown>, action: string) {
    setBusy(action); setErr('')
    try {
      const res = await fetch('/api/sequences', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: seq.id, ...patch }),
      })
      const d = await res.json()
      if (!res.ok) { setErr(d.error ?? 'Something went wrong'); return }
      onSaved(d.sequence)
      if (action === 'save') { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    } catch { setErr('Network error — try again') }
    finally { setBusy(null) }
  }

  async function remove() {
    if (!window.confirm(`Delete "${seq.name}"? This cannot be undone.`)) return
    setBusy('delete'); setErr('')
    try {
      const res = await fetch('/api/sequences', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: seq.id }),
      })
      if (res.ok) { onDeleted(seq.id); return }
      const d = await res.json().catch(() => ({}))
      setErr(d.error ?? 'Delete failed')
    } catch { setErr('Network error — try again') }
    finally { setBusy(null) }
  }

  function setStep(i: number, patch: Partial<SequenceStep>) {
    setSteps(prev => prev.map((s, j) => j === i ? { ...s, ...patch } : s))
  }

  // AI-personalize one step: sends the user's draft to /api/emails/polish and swaps
  // the editor contents with the improved version. Nothing is saved until Save.
  const [aiBusy, setAiBusy] = useState<number | null>(null)
  async function aiImprove(i: number) {
    setAiBusy(i); setErr('')
    try {
      const res = await fetch('/api/emails/polish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: steps[i].subject, body: steps[i].body }),
      })
      const d = await res.json()
      if (!res.ok) { setErr(d.error ?? 'AI improve failed — try again.'); return }
      setStep(i, { subject: d.subject, body: d.body })
    } catch { setErr('Network error — try again') }
    finally { setAiBusy(null) }
  }

  return (
    <div className="card-dark" style={{ padding: 0, marginBottom: 12, overflow: 'hidden' }}>
      {/* header row */}
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '0.9375rem' }}>{seq.name}</span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: meta.color, border: `1px solid ${meta.color}40`, background: `${meta.color}14`, borderRadius: 6, padding: '3px 8px' }}>
              {meta.label}
            </span>
            {seq.strategy_key && (
              <span style={{ fontSize: '0.6875rem', color: '#777', border: '1px solid #262626', borderRadius: 6, padding: '3px 8px' }}>
                Prov strategy · {seq.strategy_key}
              </span>
            )}
          </div>
          <p style={{ color: '#555', fontSize: '0.8125rem', marginTop: 4 }}>
            {seq.steps.length} step{seq.steps.length === 1 ? '' : 's'}
            {seq.steps.length > 1 && ` · follow-ups on day ${seq.steps.slice(1).reduce<{ acc: number; out: number[] }>((r, s) => { r.acc += s.days_after_previous; r.out.push(r.acc); return r }, { acc: 0, out: [] }).out.join(', day ')}`}
          </p>
        </div>
        {/* performance column */}
        <PerfCell s={stats} />
        <ChevronDown size={16} style={{ color: '#555', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #1a1a1a', padding: '18px 20px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: 6 }}>Sequence name</label>
          <input className="input-dark" value={name} onChange={e => setName(e.target.value)} disabled={!canManage} style={{ marginBottom: 16, maxWidth: 420 }} />

          {steps.map((st, i) => (
            <div key={i} style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FFD700' }}>{stepLabel(i, st.days_after_previous)}</span>
                <span style={{ flex: 1 }} />
                {canManage && (
                  <button onClick={() => aiImprove(i)} disabled={aiBusy !== null || !st.body.trim()}
                    title="AI keeps your voice and [Variables], tightens the hook and CTA"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)', color: '#FFD700', borderRadius: 7, padding: '5px 11px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', opacity: st.body.trim() ? 1 : 0.4 }}>
                    {aiBusy === i ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {aiBusy === i ? 'Improving…' : 'AI improve'}
                  </button>
                )}
                {i > 0 && canManage && (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#666' }}>
                    Days after previous
                    <input type="number" min={1} max={60} value={st.days_after_previous}
                      onChange={e => setStep(i, { days_after_previous: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })}
                      className="input-dark" style={{ width: 64, padding: '5px 8px' }} />
                  </label>
                )}
                {steps.length > 1 && canManage && (
                  <button onClick={() => setSteps(prev => prev.filter((_, j) => j !== i))} title="Remove step"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', display: 'flex', padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <input className="input-dark" value={st.subject} onChange={e => setStep(i, { subject: e.target.value })}
                placeholder="Subject" disabled={!canManage} style={{ marginBottom: 8 }} />
              <textarea value={st.body} onChange={e => setStep(i, { body: e.target.value })} rows={6} disabled={!canManage}
                placeholder="Body"
                style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 8, padding: '10px 12px', color: '#bbb', fontSize: '0.875rem', lineHeight: 1.65, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
          ))}

          {canManage && steps.length < 5 && (
            <button onClick={() => setSteps(prev => [...prev, { subject: 'Re: quick follow-up, [FirstName]', body: 'Hi [FirstName],\n\nJust floating this back to the top of your inbox.', days_after_previous: 3 }])}
              className="btn-outline-gold" style={{ padding: '7px 14px', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <Plus size={13} /> Add step
            </button>
          )}

          {err && <p style={{ color: '#f87171', fontSize: '0.8125rem', marginBottom: 10 }}>{err}</p>}
          {seq.status === 'approved' && dirty && (
            <p style={{ color: '#facc15', fontSize: '0.8125rem', marginBottom: 10 }}>Saving changes will return this sequence to drafts until it is re-approved.</p>
          )}

          {canManage && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => put({ name, steps }, 'save')} disabled={!dirty || busy !== null}
                className="btn-gold" style={{ padding: '8px 16px', fontSize: '0.8125rem', opacity: dirty ? 1 : 0.4 }}>
                {busy === 'save' ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : saved ? <><Check size={13} /> Saved</> : 'Save changes'}
              </button>

              {/* Approve — owner/admin only, and only for drafts */}
              {canApprove && seq.status === 'draft' && (
                <button onClick={() => put({ status: 'approved' }, 'approve')} disabled={busy !== null || dirty}
                  title={dirty ? 'Save your changes first' : 'Approve for the whole workspace'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', fontSize: '0.8125rem', fontWeight: 700, borderRadius: 9, cursor: dirty ? 'default' : 'pointer', background: 'rgba(0,208,132,0.12)', border: '1px solid rgba(0,208,132,0.4)', color: '#00D084', opacity: dirty ? 0.4 : 1 }}>
                  {busy === 'approve' ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={14} />} Approve for workspace
                </button>
              )}

              {seq.status !== 'archived' ? (
                (seq.status !== 'approved' || canApprove) && (
                  <button onClick={() => put({ status: 'archived' }, 'archive')} disabled={busy !== null}
                    className="btn-outline-gold" style={{ padding: '8px 14px', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {busy === 'archive' ? <Loader2 size={13} className="animate-spin" /> : <Archive size={13} />} Archive
                  </button>
                )
              ) : (
                <button onClick={() => put({ status: 'draft' }, 'restore')} disabled={busy !== null}
                  className="btn-outline-gold" style={{ padding: '8px 14px', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {busy === 'restore' ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Restore to drafts
                </button>
              )}

              {(seq.status !== 'approved' || canApprove) && (
                <button onClick={remove} disabled={busy !== null}
                  style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#775', cursor: 'pointer', fontSize: '0.8125rem', padding: '8px 4px' }}>
                  {busy === 'delete' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SequencesLibrary({ email, accessType, daysLeft, wsRole }: {
  email: string; accessType: string; daysLeft: number | null; wsRole: string | null
}) {
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [stats, setStats] = useState<Record<string, SeqStats>>({})
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [creating, setCreating] = useState(false)
  const [loadError, setLoadError] = useState('')

  const canManage = wsRole !== null && ['owner', 'admin', 'account_manager'].includes(wsRole)
  const canApprove = wsRole !== null && ['owner', 'admin'].includes(wsRole)

  const load = useCallback(async () => {
    try {
      const [seqRes, statRes] = await Promise.all([
        fetch('/api/sequences').then(r => r.json()),
        fetch('/api/sequences/stats').then(r => r.json()).catch(() => ({ stats: {} })),
      ])
      if (Array.isArray(seqRes.sequences)) setSequences(seqRes.sequences)
      else if (seqRes.error) setLoadError(String(seqRes.error))
      setStats(statRes.stats ?? {})
    } catch { setLoadError('Could not load sequences') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function upsert(s: Sequence) {
    setSequences(prev => {
      const i = prev.findIndex(p => p.id === s.id)
      if (i === -1) return [s, ...prev]
      const next = [...prev]; next[i] = s; return next
    })
  }

  // Explicit, user-triggered seeding of the five Prov strategies as DRAFTS.
  // Strategies already in the library (by strategy_key) are skipped.
  async function seedProvStrategies() {
    setSeeding(true)
    const existing = new Set(sequences.map(s => s.strategy_key).filter(Boolean))
    const followUps: SequenceStep[] = DEFAULT_FOLLOW_UPS.reduce<{ prev: number; out: SequenceStep[] }>((r, f) => {
      r.out.push({ subject: f.subject, body: f.body, days_after_previous: f.days - r.prev })
      r.prev = f.days
      return r
    }, { prev: 0, out: [] }).out
    for (const strat of STEP1_STRATEGIES) {
      if (existing.has(strat.id)) continue
      try {
        const res = await fetch('/api/sequences', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: strat.name,
            strategy_key: strat.id,
            steps: [{ subject: strat.subject, body: strat.body, days_after_previous: 0 }, ...followUps],
          }),
        })
        const d = await res.json()
        if (res.ok && d.sequence) upsert(d.sequence)
      } catch { /* keep seeding the rest */ }
    }
    setSeeding(false)
  }

  async function createBlank() {
    setCreating(true)
    try {
      const res = await fetch('/api/sequences', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New sequence',
          steps: [{ subject: 'Partnership opportunity', body: 'Hey [FirstName],\n\n', days_after_previous: 0 }],
        }),
      })
      const d = await res.json()
      if (res.ok && d.sequence) upsert(d.sequence)
    } catch { /* leave list as-is */ }
    setCreating(false)
  }

  const groups: { key: Sequence['status']; title: string; blurb: string }[] = [
    { key: 'approved', title: 'Approved', blurb: 'Live for the whole team — these appear in the campaign composer.' },
    { key: 'draft', title: 'Drafts', blurb: 'Work in progress. An owner or admin approves a draft to make it the workspace standard.' },
    { key: 'archived', title: 'Archived', blurb: 'Retired sequences, kept for their performance history.' },
  ]

  const unseeded = STEP1_STRATEGIES.filter(s => !sequences.some(q => q.strategy_key === s.id)).length

  return (
    <DashboardShell active="templates" email={email} accessType={accessType} daysLeft={daysLeft}>
      <div style={{ padding: '32px 28px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f5f5f5', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Sequences</h1>
            <p style={{ color: '#666', marginTop: 4, maxWidth: 640, lineHeight: 1.6 }}>
              Your workspace&apos;s standardized outreach. Every account manager sends the same approved sequences — and every send feeds the performance numbers here.
            </p>
          </div>
          {canManage && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {unseeded > 0 && (
                <button onClick={seedProvStrategies} disabled={seeding} className="btn-outline-gold"
                  style={{ padding: '9px 16px', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Seed the five Prov strategies
                </button>
              )}
              <button onClick={createBlank} disabled={creating} className="btn-gold"
                style={{ padding: '9px 16px', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} New sequence
              </button>
            </div>
          )}
        </div>

        {/* variables legend */}
        <div style={{ margin: '18px 0 26px' }}>
          <p style={{ fontSize: '0.75rem', color: '#555', marginBottom: 8 }}>Available variables (auto-filled when sending). Your branding signature is appended automatically.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TEMPLATE_VARIABLES.map(v => (
              <span key={v} style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#FFD700', background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.16)', borderRadius: 6, padding: '3px 8px' }}>{v}</span>
            ))}
          </div>
        </div>

        {loadError && (
          <div className="card-dark" style={{ padding: '16px 20px', marginBottom: 20, borderColor: 'rgba(248,113,113,0.3)' }}>
            <p style={{ color: '#f87171', fontSize: '0.875rem' }}>{loadError}</p>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#555' }}>
            <Loader2 size={26} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block', color: '#FFD700' }} />
            Loading sequences…
          </div>
        ) : sequences.length === 0 && !loadError ? (
          <div className="card-dark" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ color: '#d0d0d0', fontWeight: 700, marginBottom: 6 }}>No sequences yet</p>
            <p style={{ color: '#666', fontSize: '0.875rem', maxWidth: 460, margin: '0 auto 18px', lineHeight: 1.6 }}>
              Start from the five Prov cold-outreach strategies (they arrive as drafts for review), or build a sequence from scratch.
            </p>
            {canManage && (
              <button onClick={seedProvStrategies} disabled={seeding} className="btn-gold"
                style={{ padding: '10px 20px', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {seeding ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Seed the five Prov strategies
              </button>
            )}
          </div>
        ) : (
          groups.map(g => {
            const items = sequences.filter(s => s.status === g.key)
            if (items.length === 0) return null
            return (
              <section key={g.key} style={{ marginBottom: 30 }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: STATUS_META[g.key].color, marginBottom: 4 }}>
                  {g.title} · {items.length}
                </p>
                <p style={{ color: '#555', fontSize: '0.8125rem', marginBottom: 12 }}>{g.blurb}</p>
                {items.map(s => (
                  <SequenceCard key={s.id} seq={s} stats={stats[s.id]}
                    canManage={canManage} canApprove={canApprove}
                    onSaved={upsert} onDeleted={id => setSequences(prev => prev.filter(p => p.id !== id))} />
                ))}
              </section>
            )
          })
        )}
      </div>
    </DashboardShell>
  )
}
