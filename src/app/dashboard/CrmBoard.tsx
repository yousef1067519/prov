'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Building2 } from 'lucide-react'
import DashboardShell from './DashboardShell'

const STAGES = ['Prospect', 'Contacted', 'Follow-up', 'Negotiating', 'Active Client', 'Lost'] as const
type Stage = typeof STAGES[number]
const STAGE_COLOR: Record<Stage, string> = {
  Prospect: '#667eea', Contacted: '#38bdf8', 'Follow-up': '#FFD700',
  Negotiating: '#f59e0b', 'Active Client': '#00D084', Lost: '#ef4444',
}

interface Brand {
  id: string
  company: string
  contact_name?: string | null
  email?: string | null
  budget_range?: string | null
  stage: Stage
  next_followup?: string | null
  notes?: string | null
}

// Seed so the board is alive immediately in dev / empty accounts.
const SEED: Brand[] = [
  { id: 's1', company: 'Nvidia', contact_name: 'Dana Wu', email: 'partners@nvidia.com', budget_range: '$10K-$100K', stage: 'Negotiating', next_followup: '2026-07-02' },
  { id: 's2', company: 'Squarespace', contact_name: 'Marco Reyes', email: 'brand@squarespace.com', budget_range: '$2K-$15K', stage: 'Contacted' },
  { id: 's3', company: 'NordVPN', contact_name: 'Ingrid Sol', email: 'deals@nordvpn.com', budget_range: '$3K-$30K', stage: 'Active Client', next_followup: '2026-06-30' },
  { id: 's4', company: 'Notion', contact_name: 'Priya Anand', email: 'creators@notion.so', budget_range: '$5K-$40K', stage: 'Prospect' },
  { id: 's5', company: 'HelloFresh', contact_name: 'Tom Becker', email: 'influencers@hellofresh.com', budget_range: '$4K-$25K', stage: 'Follow-up' },
]

export default function CrmBoard({ email }: { email: string }) {
  const [brands, setBrands] = useState<Brand[]>(SEED)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ company: '', contact_name: '', email: '', budget_range: '', stage: 'Prospect' as Stage })

  useEffect(() => {
    fetch('/api/brands').then(r => r.json()).then(d => {
      if (Array.isArray(d.brands) && d.brands.length) setBrands(d.brands)
    }).catch(() => {})
  }, [])

  function moveBrand(id: string, dir: -1 | 1) {
    setBrands(prev => prev.map(b => {
      if (b.id !== id) return b
      const idx = STAGES.indexOf(b.stage)
      const next = STAGES[Math.min(STAGES.length - 1, Math.max(0, idx + dir))]
      fetch('/api/brands', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, stage: next }) }).catch(() => {})
      return { ...b, stage: next }
    }))
  }

  function addBrand(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company.trim()) return
    const optimistic: Brand = { id: `tmp-${Date.now()}`, ...form }
    setBrands(prev => [optimistic, ...prev])
    setForm({ company: '', contact_name: '', email: '', budget_range: '', stage: 'Prospect' })
    setAdding(false)
    fetch('/api/brands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(optimistic) })
      .then(r => r.json()).then(d => { if (d.brand) setBrands(prev => prev.map(b => b.id === optimistic.id ? d.brand : b)) })
      .catch(() => {})
  }

  return (
    <DashboardShell active="crm" email={email}>
      <div style={{ padding: '24px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>CRM Pipeline</h1>
        <button onClick={() => setAdding(a => !a)} className="btn-gold" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
          <Plus size={15} /> Add brand
        </button>
      </div>

      {adding && (
        <form onSubmit={addBrand} style={{ borderBottom: '1px solid #1a1a1a', padding: '16px 24px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: '#0d0d0d' }}>
          <input className="input-dark" placeholder="Company *" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} style={{ flex: '1 1 160px' }} />
          <input className="input-dark" placeholder="Contact name" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} style={{ flex: '1 1 140px' }} />
          <input className="input-dark" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ flex: '1 1 160px' }} />
          <input className="input-dark" placeholder="Budget e.g. $5K-$40K" value={form.budget_range} onChange={e => setForm({ ...form, budget_range: e.target.value })} style={{ flex: '1 1 140px' }} />
          <select className="input-dark" value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value as Stage })}>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" className="btn-gold" style={{ padding: '0 18px' }}>Save</button>
          <button type="button" onClick={() => setAdding(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </form>
      )}

      <div style={{ padding: '24px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 14, minWidth: 'min-content' }}>
          {STAGES.map(stage => {
            const items = brands.filter(b => b.stage === stage)
            return (
              <div key={stage} style={{ flex: '0 0 280px', minWidth: 280 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: STAGE_COLOR[stage] }} />
                  <span style={{ color: '#d0d0d0', fontWeight: 700, fontSize: '0.875rem' }}>{stage}</span>
                  <span style={{ color: '#555', fontSize: '0.8125rem' }}>{items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map(b => {
                    const idx = STAGES.indexOf(b.stage)
                    return (
                      <div key={b.id} style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: 12, padding: 14, borderLeft: `3px solid ${STAGE_COLOR[stage]}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <Building2 size={14} style={{ color: '#888' }} />
                          <span style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '0.9375rem' }}>{b.company}</span>
                        </div>
                        {b.contact_name && <p style={{ color: '#888', fontSize: '0.8125rem' }}>{b.contact_name}</p>}
                        {b.email && <p style={{ color: '#666', fontSize: '0.75rem', fontFamily: 'monospace' }}>{b.email}</p>}
                        {b.budget_range && <span style={{ display: 'inline-block', marginTop: 8, background: 'rgba(255,215,0,0.08)', color: '#FFD700', fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>{b.budget_range}</span>}
                        {b.next_followup && <p style={{ color: '#555', fontSize: '0.75rem', marginTop: 8 }}>Next follow-up: {b.next_followup}</p>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                          <button onClick={() => moveBrand(b.id, -1)} disabled={idx === 0} title="Move back"
                            style={{ background: 'none', border: '1px solid #222', borderRadius: 7, color: idx === 0 ? '#333' : '#888', cursor: idx === 0 ? 'default' : 'pointer', padding: '4px 8px', display: 'flex' }}><ChevronLeft size={14} /></button>
                          <button onClick={() => moveBrand(b.id, 1)} disabled={idx === STAGES.length - 1} title="Advance"
                            style={{ background: 'none', border: '1px solid #222', borderRadius: 7, color: idx === STAGES.length - 1 ? '#333' : '#FFD700', cursor: idx === STAGES.length - 1 ? 'default' : 'pointer', padding: '4px 8px', display: 'flex' }}><ChevronRight size={14} /></button>
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
      </div>
    </DashboardShell>
  )
}
