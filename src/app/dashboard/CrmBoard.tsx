'use client'

// Pipeline CRM (§8.3): deals board over the 0020 deals table.
// sourced → outreach → negotiating → contract → live → completed, with
// button-based stage moves, a per-client filter, and a double-pitch risk
// chip when a creator sits in 2+ active deals in this workspace.

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Building2, User, AlertTriangle, Loader2 } from 'lucide-react'
import DashboardShell from './DashboardShell'

const BOARD_STAGES = ['sourced', 'outreach', 'negotiating', 'contract', 'live', 'completed'] as const
type BoardStage = typeof BOARD_STAGES[number]
type Stage = BoardStage | 'lost'

const STAGE_LABEL: Record<BoardStage, string> = {
  sourced: 'Sourced', outreach: 'Outreach', negotiating: 'Negotiating',
  contract: 'Contract', live: 'Live', completed: 'Completed',
}
const STAGE_COLOR: Record<BoardStage, string> = {
  sourced: '#667eea', outreach: '#38bdf8', negotiating: '#f59e0b',
  contract: '#FFD700', live: '#00D084', completed: '#8a8a8a',
}
const ACTIVE_STAGES: Stage[] = ['sourced', 'outreach', 'negotiating', 'contract', 'live']

interface Deal {
  id: string
  name: string
  stage: Stage
  value_cents: number
  currency: string
  client_id: string | null
  creator_id: string | null
  notes: string | null
  stage_changed_at: string | null
  creators: { id: string; name: string; platform: string | null; niche: string | null } | null
  clients: { id: string; name: string } | null
}
interface Client { id: string; name: string }

function fmtMoney(cents: number, currency: string) {
  const dollars = (cents ?? 0) / 100
  const s = dollars.toLocaleString('en-US', { maximumFractionDigits: dollars % 1 ? 2 : 0 })
  return currency && currency !== 'USD' ? `${s} ${currency}` : `$${s}`
}

export default function CrmBoard({ email }: { email: string }) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [activeByCreator, setActiveByCreator] = useState<Record<string, number>>({})
  const [clientFilter, setClientFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', client_id: '', value: '', stage: 'sourced' as Stage })

  const load = useCallback(async (clientId: string) => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/deals${clientId ? `?client_id=${encodeURIComponent(clientId)}` : ''}`)
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setDeals(Array.isArray(d.deals) ? d.deals : [])
      setClients(Array.isArray(d.clients) ? d.clients : [])
      setActiveByCreator(d.activeByCreator ?? {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the pipeline.')
    }
    setLoading(false)
  }, [])
  useEffect(() => { load(clientFilter) }, [load, clientFilter])

  async function setStage(deal: Deal, stage: Stage) {
    const prev = deals
    setDeals(ds => ds.map(d => d.id === deal.id ? { ...d, stage } : d))
    try {
      const res = await fetch('/api/deals', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deal.id, stage }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      // Active-deal counts shift when a deal enters/leaves an active stage.
      if (deal.creator_id) load(clientFilter)
    } catch (e) {
      setDeals(prev)
      setError(e instanceof Error ? e.message : 'Stage change failed.')
    }
  }

  function moveDeal(deal: Deal, dir: -1 | 1) {
    const idx = BOARD_STAGES.indexOf(deal.stage as BoardStage)
    if (idx < 0) return
    const next = BOARD_STAGES[Math.min(BOARD_STAGES.length - 1, Math.max(0, idx + dir))]
    if (next !== deal.stage) setStage(deal, next)
  }

  async function addDeal(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || saving) return
    setSaving(true); setError('')
    try {
      const dollars = parseFloat(form.value)
      const res = await fetch('/api/deals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          client_id: form.client_id || null,
          stage: form.stage,
          value_cents: Number.isFinite(dollars) ? Math.round(dollars * 100) : 0, // money is integer cents
        }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setForm({ name: '', client_id: '', value: '', stage: 'sourced' })
      setAdding(false)
      load(clientFilter)
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Could not create the deal.')
    }
    setSaving(false)
  }

  const lostCount = deals.filter(d => d.stage === 'lost').length
  const pipelineValue = deals.filter(d => ACTIVE_STAGES.includes(d.stage)).reduce((s, d) => s + (d.value_cents ?? 0), 0)

  return (
    <DashboardShell active="crm" email={email}>
      <div style={{ padding: '24px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Pipeline</h1>
          <p style={{ color: '#666', fontSize: '0.8125rem', marginTop: 2 }}>
            {fmtMoney(pipelineValue, 'USD')} in active deals{lostCount > 0 ? ` · ${lostCount} lost` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select className="input-dark" value={clientFilter} onChange={e => setClientFilter(e.target.value)} style={{ minWidth: 160 }}>
            <option value="">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => setAdding(a => !a)} className="btn-gold" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
            <Plus size={15} /> Add deal
          </button>
        </div>
      </div>

      {adding && (
        <form onSubmit={addDeal} style={{ borderBottom: '1px solid #1a1a1a', padding: '16px 24px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: '#0d0d0d', marginTop: 16 }}>
          <input className="input-dark" placeholder="Deal name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ flex: '1 1 180px' }} />
          <select className="input-dark" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} style={{ flex: '0 1 160px' }}>
            <option value="">No client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="input-dark" type="number" min="0" step="0.01" placeholder="Value ($)" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} style={{ flex: '0 1 120px' }} />
          <select className="input-dark" value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value as Stage })}>
            {BOARD_STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </select>
          <button type="submit" className="btn-gold" disabled={saving} style={{ padding: '0 18px' }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : 'Save'}
          </button>
          <button type="button" onClick={() => setAdding(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </form>
      )}

      {error && (
        <div style={{ margin: '16px 24px 0', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: '0.8125rem', color: '#f87171' }}>{error}</div>
      )}

      <div style={{ padding: '24px', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#666', padding: '40px 0', justifyContent: 'center' }}>
            <Loader2 size={18} className="animate-spin" /> Loading pipeline…
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 14, minWidth: 'min-content' }}>
            {BOARD_STAGES.map(stage => {
              const items = deals.filter(d => d.stage === stage)
              const colValue = items.reduce((s, d) => s + (d.value_cents ?? 0), 0)
              return (
                <div key={stage} style={{ flex: '0 0 280px', minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: STAGE_COLOR[stage] }} />
                    <span style={{ color: '#d0d0d0', fontWeight: 700, fontSize: '0.875rem' }}>{STAGE_LABEL[stage]}</span>
                    <span style={{ color: '#555', fontSize: '0.8125rem' }}>{items.length}</span>
                    {colValue > 0 && <span style={{ color: '#555', fontSize: '0.75rem', marginLeft: 'auto' }}>{fmtMoney(colValue, 'USD')}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map(d => {
                      const idx = BOARD_STAGES.indexOf(stage)
                      const doublePitch = !!d.creator_id && (activeByCreator[d.creator_id] ?? 0) >= 2 && ACTIVE_STAGES.includes(d.stage)
                      return (
                        <div key={d.id} style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: 12, padding: 14, borderLeft: `3px solid ${STAGE_COLOR[stage]}` }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                            <span style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '0.9375rem' }}>{d.name}</span>
                            <span style={{ color: '#FFD700', fontWeight: 800, fontSize: '0.875rem', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>{fmtMoney(d.value_cents, d.currency)}</span>
                          </div>
                          {d.clients && (
                            <p style={{ color: '#888', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Building2 size={12} /> {d.clients.name}
                            </p>
                          )}
                          {d.creators && (
                            <p style={{ color: '#888', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                              <User size={12} /> {d.creators.name}{d.creators.platform ? ` · ${d.creators.platform}` : ''}
                            </p>
                          )}
                          {doublePitch && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', fontSize: '0.6875rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
                              <AlertTriangle size={11} /> Double-pitch risk
                            </span>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                            <button onClick={() => moveDeal(d, -1)} disabled={idx === 0} title="Move back"
                              style={{ background: 'none', border: '1px solid #222', borderRadius: 7, color: idx === 0 ? '#333' : '#888', cursor: idx === 0 ? 'default' : 'pointer', padding: '4px 8px', display: 'flex' }}><ChevronLeft size={14} /></button>
                            {stage !== 'completed' && (
                              <button onClick={() => setStage(d, 'lost')} title="Mark lost"
                                style={{ background: 'none', border: 'none', color: '#553333', cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 600 }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#553333')}>
                                Mark lost
                              </button>
                            )}
                            <button onClick={() => moveDeal(d, 1)} disabled={idx === BOARD_STAGES.length - 1} title="Advance"
                              style={{ background: 'none', border: '1px solid #222', borderRadius: 7, color: idx === BOARD_STAGES.length - 1 ? '#333' : '#FFD700', cursor: idx === BOARD_STAGES.length - 1 ? 'default' : 'pointer', padding: '4px 8px', display: 'flex' }}><ChevronRight size={14} /></button>
                          </div>
                        </div>
                      )
                    })}
                    {items.length === 0 && <p style={{ color: '#333', fontSize: '0.8125rem', textAlign: 'center', padding: '16px 0' }}>Empty</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {!loading && deals.length === 0 && !error && (
          <p style={{ color: '#555', fontSize: '0.875rem', textAlign: 'center', marginTop: 8 }}>
            No deals yet. Add your first deal, or send creators here from discovery.
          </p>
        )}
      </div>
    </DashboardShell>
  )
}
