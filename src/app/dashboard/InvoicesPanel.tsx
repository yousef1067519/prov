'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Download, Send, Check } from 'lucide-react'
import DashboardShell from './DashboardShell'

type Status = 'draft' | 'sent' | 'paid' | 'overdue'
const STATUS_COLOR: Record<Status, string> = { draft: '#888', sent: '#38bdf8', paid: '#00D084', overdue: '#ef4444' }

interface Invoice {
  id: string
  number: string
  brand_name: string
  amount: number
  status: Status
  due_date?: string | null
}

const SEED: Invoice[] = [
  { id: 'i1', number: 'INV-1042', brand_name: 'Nvidia', amount: 18000, status: 'paid', due_date: '2026-06-10' },
  { id: 'i2', number: 'INV-1043', brand_name: 'NordVPN', amount: 7500, status: 'sent', due_date: '2026-07-05' },
  { id: 'i3', number: 'INV-1044', brand_name: 'HelloFresh', amount: 5200, status: 'overdue', due_date: '2026-06-18' },
  { id: 'i4', number: 'INV-1045', brand_name: 'Notion', amount: 9800, status: 'draft', due_date: '2026-07-20' },
]

const money = (n: number) => '$' + n.toLocaleString()

export default function InvoicesPanel() {
  const [invoices, setInvoices] = useState<Invoice[]>(SEED)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ brand_name: '', amount: '', due_date: '' })

  useEffect(() => {
    fetch('/api/invoices').then(r => r.json()).then(d => {
      if (Array.isArray(d.invoices) && d.invoices.length) setInvoices(d.invoices)
    }).catch(() => {})
  }, [])

  const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)
  const paid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const overdue = invoices.filter(i => i.status === 'overdue').length

  function setStatus(id: string, status: Status) {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    fetch('/api/invoices', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }).catch(() => {})
  }

  function addInvoice(e: React.FormEvent) {
    e.preventDefault()
    if (!form.brand_name.trim() || !form.amount) return
    const number = `INV-${1046 + invoices.filter(i => i.number.startsWith('INV')).length}`
    const inv: Invoice = { id: `tmp-${Date.now()}`, number, brand_name: form.brand_name, amount: Number(form.amount), status: 'draft', due_date: form.due_date || null }
    setInvoices(prev => [inv, ...prev])
    setForm({ brand_name: '', amount: '', due_date: '' }); setAdding(false)
    fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inv) })
      .then(r => r.json()).then(d => { if (d.invoice) setInvoices(prev => prev.map(i => i.id === inv.id ? d.invoice : i)) }).catch(() => {})
  }

  function download(inv: Invoice) {
    const text = `INVOICE ${inv.number}
Date: ${new Date().toISOString().slice(0, 10)}
Due: ${inv.due_date ?? '[DUE DATE]'}

From: Your Agency
Bill to: ${inv.brand_name}

Description                                   Amount
Influencer marketing campaign services        ${money(Number(inv.amount))}
------------------------------------------------------
Total due                                     ${money(Number(inv.amount))}

Payment terms: Net 14. Thank you.`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${inv.number}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardShell active="invoices">
      <div style={{ padding: '24px 28px 0', maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Invoices</h1>
        <button onClick={() => setAdding(a => !a)} className="btn-gold" style={{ padding: '8px 16px', fontSize: '0.875rem' }}><Plus size={15} /> New invoice</button>
      </div>

      <div style={{ padding: '20px 28px 32px', maxWidth: 1080, margin: '0 auto' }}>
        {/* summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[['Outstanding', money(outstanding), '#FFD700'], ['Paid', money(paid), '#00D084'], ['Overdue', String(overdue), '#ef4444']].map(([l, v, c]) => (
            <div key={l} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '20px' }}>
              <div style={{ color: '#666', fontSize: '0.8125rem', marginBottom: 10 }}>{l}</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 800, color: c, fontFamily: 'var(--font-display)' }}>{v}</div>
            </div>
          ))}
        </div>

        {adding && (
          <form onSubmit={addInvoice} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <input className="input-dark" placeholder="Brand / client *" value={form.brand_name} onChange={e => setForm({ ...form, brand_name: e.target.value })} style={{ flex: '1 1 180px' }} />
            <input className="input-dark" type="number" placeholder="Amount ($) *" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={{ flex: '1 1 140px' }} />
            <input className="input-dark" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} style={{ flex: '1 1 150px' }} />
            <button type="submit" className="btn-gold" style={{ padding: '0 18px' }}>Create</button>
            <button type="button" onClick={() => setAdding(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
          </form>
        )}

        {/* list */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1a1a1a', background: '#0f0f0f' }}>
                  {['Invoice', 'Client', 'Amount', 'Due', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#444', fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id} style={{ borderBottom: i < invoices.length - 1 ? '1px solid #161616' : 'none' }}>
                    <td style={{ padding: '14px 16px', color: '#d0d0d0', fontFamily: 'monospace' }}>{inv.number}</td>
                    <td style={{ padding: '14px 16px', color: '#f0f0f0', fontWeight: 600 }}>{inv.brand_name}</td>
                    <td style={{ padding: '14px 16px', color: '#d0d0d0', fontWeight: 700 }}>{money(Number(inv.amount))}</td>
                    <td style={{ padding: '14px 16px', color: '#666' }}>{inv.due_date ?? '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: STATUS_COLOR[inv.status], textTransform: 'capitalize' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLOR[inv.status] }} /> {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {inv.status === 'draft' && <button onClick={() => setStatus(inv.id, 'sent')} title="Mark sent" className="btn-outline-gold" style={{ padding: '5px 10px', fontSize: '0.75rem' }}><Send size={12} /> Send</button>}
                        {(inv.status === 'sent' || inv.status === 'overdue') && <button onClick={() => setStatus(inv.id, 'paid')} title="Mark paid" className="btn-outline-gold" style={{ padding: '5px 10px', fontSize: '0.75rem' }}><Check size={12} /> Paid</button>}
                        <button onClick={() => download(inv)} title="Download" style={{ background: 'none', border: '1px solid #222', borderRadius: 7, color: '#FFD700', cursor: 'pointer', padding: '5px 9px', display: 'flex' }}><Download size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
