'use client'

// §8.5 enterprise contracts: lifecycle table, clause-composed wizard with
// merge fields from deals, clause library editing, PDF export. The quick
// two-contract generator was retired with the self-serve product.

import { useCallback, useEffect, useState } from 'react'
import { FileText, Loader2, Download, Plus, ChevronRight, ScrollText, X } from 'lucide-react'
import DashboardShell from './DashboardShell'
import { generateContractPdf } from '@/lib/contract-pdf'
import { BRANDING_KEY } from './BrandingSettings'

interface ContractRow {
  id: string; title: string | null; type: string; counterparty_name: string | null
  status: 'draft' | 'internal_approval' | 'sent' | 'signed' | 'executed' | 'void'
  version: number; deal_id: string | null; created_at: string
}
interface Clause { id: string; key: string; title: string; body_md: string; workspace_id: string | null }
interface Deal { id: string; name: string; stage: string }

const STATUS: Record<ContractRow['status'], { fg: string; label: string }> = {
  draft: { fg: '#999', label: 'Draft' },
  internal_approval: { fg: '#c084fc', label: 'Awaiting approval' },
  sent: { fg: '#ffca28', label: 'Sent' },
  signed: { fg: '#8ab4f8', label: 'Signed' },
  executed: { fg: '#5dd47a', label: 'Executed' },
  void: { fg: '#666', label: 'Void' },
}
const ACTIONS: Record<ContractRow['status'], Array<{ action: string; label: string }>> = {
  draft: [{ action: 'submit_for_approval', label: 'Submit for approval' }, { action: 'send', label: 'Send' }, { action: 'void', label: 'Void' }],
  internal_approval: [{ action: 'approve', label: 'Approve' }, { action: 'void', label: 'Void' }],
  sent: [{ action: 'mark_signed', label: 'Mark signed' }, { action: 'void', label: 'Void' }],
  signed: [{ action: 'mark_executed', label: 'Mark executed' }],
  executed: [], void: [],
}

export default function ContractsPanel() {
  const [tab, setTab] = useState<'contracts' | 'clauses'>('contracts')
  const [rows, setRows] = useState<ContractRow[]>([])
  const [clauses, setClauses] = useState<Clause[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [wizard, setWizard] = useState(false)
  const [viewing, setViewing] = useState<{ row: ContractRow; body: string } | null>(null)
  const [editingClause, setEditingClause] = useState<Clause | null>(null)
  const [agencyName, setAgencyName] = useState('Your Agency')

  // Wizard state
  const [wTitle, setWTitle] = useState('')
  const [wDeal, setWDeal] = useState('')
  const [wKeys, setWKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    try { const b = localStorage.getItem(BRANDING_KEY); if (b) { const v = JSON.parse(b); if (v.company_name) setAgencyName(v.company_name) } } catch {}
  }, [])

  const load = useCallback(async () => {
    try {
      const d = await (await fetch('/api/contracts')).json()
      setRows(d.contracts ?? [])
    } catch {}
    try {
      const d = await (await fetch('/api/contracts/clauses')).json()
      const cs: Clause[] = d.clauses ?? []
      setClauses(cs)
      setWKeys(prev => prev.size ? prev : new Set(cs.map(c => c.key)))
    } catch {}
    try {
      const d = await (await fetch('/api/deals')).json()
      setDeals(Array.isArray(d) ? d : d.deals ?? [])
    } catch {}
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function createContract(e: React.FormEvent) {
    e.preventDefault(); setBusy('create'); setError('')
    const res = await fetch('/api/contracts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: wTitle || undefined, deal_id: wDeal || undefined, clause_keys: [...wKeys] }),
    })
    const d = await res.json()
    if (!res.ok) setError(d.error ?? 'Could not create contract')
    else { setWizard(false); setWTitle(''); setWDeal(''); await load() }
    setBusy(null)
  }

  async function act(row: ContractRow, action: string) {
    setBusy(row.id); setError('')
    const res = await fetch(`/api/contracts/${row.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
    })
    if (!res.ok) setError((await res.json()).error ?? 'Action failed')
    await load(); setBusy(null)
  }

  async function open(row: ContractRow) {
    const d = await (await fetch(`/api/contracts/${row.id}`)).json()
    if (d.contract) setViewing({ row, body: d.contract.body })
  }

  function downloadPdf(row: ContractRow, body: string) {
    const doc = generateContractPdf({
      title: row.title ?? 'Sponsorship agreement', body,
      agencyName, creatorName: row.counterparty_name ?? undefined, version: row.version,
    })
    doc.save(`${(row.title ?? 'contract').replace(/[^a-z0-9-_ ]/gi, '')}-v${row.version}.pdf`)
  }

  async function saveClause(e: React.FormEvent) {
    e.preventDefault()
    if (!editingClause) return
    setBusy('clause'); setError('')
    const res = await fetch('/api/contracts/clauses', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: editingClause.key, title: editingClause.title, body_md: editingClause.body_md }),
    })
    if (!res.ok) setError((await res.json()).error ?? 'Could not save clause')
    else setEditingClause(null)
    await load(); setBusy(null)
  }

  return (
    <DashboardShell active="contracts">
      <div style={{ padding: '32px 28px', maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.625rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Contracts</h1>
            <p style={{ color: '#888', fontSize: '0.9375rem', marginTop: 4, marginBottom: 8, maxWidth: 640, lineHeight: 1.6 }}>
              Composed from your clause library with merge fields from the deal. Lifecycle:
              draft → internal approval → sent → signed → executed, with every step in the audit trail.
            </p>
            <p style={{ color: '#555', fontSize: '0.78rem', marginBottom: 20 }}>
              Templates are starting points, not legal advice — have high-value agreements reviewed by counsel.
            </p>
          </div>
          <button className="btn-gold" style={{ padding: '10px 18px', whiteSpace: 'nowrap' }} onClick={() => setWizard(true)}>
            <Plus size={15} /> New contract
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['contracts', 'clauses'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 16px', borderRadius: 999, fontSize: '0.82rem', cursor: 'pointer',
              border: `1px solid ${tab === t ? '#FFD700' : '#2a2a2a'}`,
              background: tab === t ? 'rgba(255,215,0,.1)' : 'transparent',
              color: tab === t ? '#FFD700' : '#888',
            }}>{t === 'contracts' ? `Contracts (${rows.length})` : 'Clause library'}</button>
          ))}
        </div>

        {error && <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginBottom: 14 }}>{error}</p>}

        {tab === 'contracts' && (
          loading ? <div style={{ color: '#666', padding: 40, textAlign: 'center' }}><Loader2 size={18} className="animate-spin" style={{ display: 'inline' }} /></div>
          : rows.length === 0 ? (
            <div className="card-dark" style={{ padding: 48, textAlign: 'center', color: '#666' }}>
              <ScrollText size={28} style={{ color: '#333', margin: '0 auto 12px' }} />
              No contracts yet. Create one from your clause library — merge fields fill from the linked deal.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {rows.map(r => {
                const s = STATUS[r.status]
                return (
                  <div key={r.id} className="card-dark" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <FileText size={16} style={{ color: '#FFD700', flexShrink: 0 }} />
                    <button onClick={() => open(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', flex: 1, minWidth: 200 }}>
                      <div style={{ color: '#eee', fontWeight: 600, fontSize: '0.92rem' }}>{r.title ?? 'Untitled agreement'} <span style={{ color: '#555', fontWeight: 400 }}>v{r.version}</span></div>
                      <div style={{ color: '#666', fontSize: '0.78rem' }}>{r.counterparty_name ?? '—'} · {new Date(r.created_at).toLocaleDateString()}</div>
                    </button>
                    <span style={{ color: s.fg, border: `1px solid ${s.fg}44`, background: `${s.fg}14`, borderRadius: 999, padding: '3px 12px', fontSize: '0.74rem', fontWeight: 600 }}>{s.label}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {busy === r.id ? <Loader2 size={15} className="animate-spin" style={{ color: '#FFD700' }} /> :
                        ACTIONS[r.status].map(a => (
                          <button key={a.action} onClick={() => act(r, a.action)} style={{
                            padding: '5px 12px', borderRadius: 8, fontSize: '0.76rem', cursor: 'pointer',
                            border: '1px solid #2c2c2c', background: '#161616', color: '#bbb',
                          }}>{a.label}</button>
                        ))}
                      <button onClick={() => open(r)} title="Open" style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><ChevronRight size={16} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {tab === 'clauses' && (
          <div style={{ display: 'grid', gap: 10 }}>
            {clauses.map(c => (
              <div key={c.key} className="card-dark" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <strong style={{ color: '#eee', fontSize: '0.9rem' }}>{c.title}</strong>
                    <span style={{ color: '#555', fontSize: '0.74rem', marginLeft: 10 }}>
                      {c.workspace_id ? 'customized by your workspace' : 'Prov stock clause'}
                    </span>
                  </div>
                  <button onClick={() => setEditingClause({ ...c })} style={{ padding: '5px 14px', borderRadius: 8, fontSize: '0.78rem', cursor: 'pointer', border: '1px solid #2c2c2c', background: '#161616', color: '#bbb' }}>
                    Edit
                  </button>
                </div>
                <p style={{ color: '#777', fontSize: '0.8rem', lineHeight: 1.55, marginTop: 8, whiteSpace: 'pre-wrap' }}>
                  {c.body_md.slice(0, 220)}{c.body_md.length > 220 ? '…' : ''}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* New-contract wizard */}
        {wizard && (
          <Modal onClose={() => setWizard(false)} title="New contract">
            <form onSubmit={createContract} style={{ display: 'grid', gap: 14 }}>
              <input className="input-dark" placeholder="Contract title (defaults to deal name)" value={wTitle} onChange={e => setWTitle(e.target.value)} />
              <select className="input-dark" value={wDeal} onChange={e => setWDeal(e.target.value)}>
                <option value="">Link a deal (fills creator, brand, value, deliverables)</option>
                {deals.map(d => <option key={d.id} value={d.id}>{d.name} ({d.stage})</option>)}
              </select>
              <div>
                <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: 8 }}>Clause blocks ({wKeys.size} selected)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxHeight: 220, overflow: 'auto' }}>
                  {clauses.map(c => (
                    <label key={c.key} style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#bbb', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={wKeys.has(c.key)} onChange={e => {
                        const next = new Set(wKeys); if (e.target.checked) next.add(c.key); else next.delete(c.key); setWKeys(next)
                      }} />
                      {c.title}
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-gold" disabled={busy === 'create'} style={{ padding: '11px' }}>
                {busy === 'create' ? <Loader2 size={15} className="animate-spin" /> : 'Create draft'}
              </button>
            </form>
          </Modal>
        )}

        {/* Contract viewer */}
        {viewing && (
          <Modal onClose={() => setViewing(null)} title={`${viewing.row.title ?? 'Contract'} · v${viewing.row.version}`} wide>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button className="btn-gold" style={{ padding: '7px 14px', fontSize: '0.8rem' }} onClick={() => downloadPdf(viewing.row, viewing.body)}>
                <Download size={14} /> PDF
              </button>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', color: '#bbb', fontSize: '0.82rem', lineHeight: 1.6, fontFamily: 'ui-monospace, monospace', maxHeight: '60vh', overflow: 'auto', background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 8, padding: 16 }}>
              {viewing.body}
            </pre>
          </Modal>
        )}

        {/* Clause editor */}
        {editingClause && (
          <Modal onClose={() => setEditingClause(null)} title={`Edit clause — ${editingClause.title}`} wide>
            <form onSubmit={saveClause} style={{ display: 'grid', gap: 12 }}>
              <input className="input-dark" value={editingClause.title} onChange={e => setEditingClause({ ...editingClause, title: e.target.value })} />
              <textarea className="input-dark" rows={14} value={editingClause.body_md}
                onChange={e => setEditingClause({ ...editingClause, body_md: e.target.value })}
                style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.82rem', lineHeight: 1.6 }} />
              <p style={{ color: '#555', fontSize: '0.75rem' }}>Saves as your workspace&apos;s copy — the Prov stock clause stays untouched. {'{{fields}}'} merge from the linked deal.</p>
              <button type="submit" className="btn-gold" disabled={busy === 'clause'} style={{ padding: '10px' }}>
                {busy === 'clause' ? <Loader2 size={15} className="animate-spin" /> : 'Save workspace copy'}
              </button>
            </form>
          </Modal>
        )}
      </div>
    </DashboardShell>
  )
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="card-dark" style={{ width: '100%', maxWidth: wide ? 760 : 520, padding: 24, maxHeight: '85vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ color: '#f0f0f0', fontSize: '1.05rem', fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
