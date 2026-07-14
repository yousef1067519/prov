'use client'

// §8.6 finance-grade invoices: real data only (the old fake SEED rows are
// gone per the no-fake-data rule), integer-cent math, sequential numbers,
// agency-branded PDF export.

import { useCallback, useEffect, useState } from 'react'
import { Plus, X, Download, Loader2, Receipt } from 'lucide-react'
import DashboardShell from './DashboardShell'
import { formatCents, formatInvoiceNumber, computeTotals, sanitizeLineItems, TERMS_LABEL, INVOICE_TERMS, type InvoiceTerms, type InvoiceLineItem } from '@/lib/invoice-money'
import { generateInvoicePdf } from '@/lib/invoice-pdf'
import { BRANDING_KEY } from './BrandingSettings'

type Status = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'void'
const STATUS_COLOR: Record<Status, string> = {
  draft: '#888', sent: '#38bdf8', viewed: '#8ab4f8', paid: '#00D084', overdue: '#ef4444', void: '#555',
}

interface Invoice {
  id: string; invoice_number: number | null; brand_name: string | null
  line_items: InvoiceLineItem[]; subtotal_cents: number | null; tax_bps: number | null
  tax_cents: number | null; total_cents: number | null; amount: number | null
  currency: string | null; issue_date: string | null; due_date: string | null
  terms: InvoiceTerms | null; late_fee_note: string | null; status: Status
  deal_id: string | null; remittance: Record<string, string> | null
}
interface Balances { outstanding_cents: number; overdue_cents: number; overdue_count: number; paid_cents: number }
interface Deal { id: string; name: string; stage: string }

const totalOf = (i: Invoice) => Number(i.total_cents ?? Math.round(Number(i.amount ?? 0) * 100))

export default function InvoicesPanel() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [balances, setBalances] = useState<Balances | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [agency, setAgency] = useState<{ name?: string; email?: string; website?: string }>({})

  // Create form
  const [form, setForm] = useState({ brand_name: '', deal_id: '', tax_bps: '0', terms: 'net_30' as InvoiceTerms, late_fee_note: '1.5% per month on overdue balances' })
  const [items, setItems] = useState<Array<{ description: string; qty: string; unit: string }>>([
    { description: '', qty: '1', unit: '' },
  ])

  useEffect(() => {
    try {
      const b = localStorage.getItem(BRANDING_KEY)
      if (b) { const v = JSON.parse(b); setAgency({ name: v.company_name, email: v.company_email, website: v.company_website }) }
    } catch {}
  }, [])

  const load = useCallback(async () => {
    try {
      const d = await (await fetch('/api/invoices')).json()
      setInvoices(d.invoices ?? []); setBalances(d.balances ?? null)
    } catch {}
    try {
      const d = await (await fetch('/api/deals')).json()
      setDeals(Array.isArray(d) ? d : d.deals ?? [])
    } catch {}
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const liveItems = (): InvoiceLineItem[] => sanitizeLineItems(items.map(i => ({
    description: i.description, qty: Number(i.qty) || 0,
    unit_cents: Math.round((Number(i.unit) || 0) * 100),
  })))
  const preview = computeTotals(liveItems(), Number(form.tax_bps) || 0)

  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy('create'); setError('')
    const res = await fetch('/api/invoices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand_name: form.brand_name || undefined,
        deal_id: form.deal_id || undefined,
        line_items: liveItems(),
        tax_bps: Number(form.tax_bps) || 0,
        terms: form.terms,
        late_fee_note: form.late_fee_note || undefined,
      }),
    })
    const d = await res.json()
    if (!res.ok) setError(d.error ?? 'Could not create invoice')
    else { setAdding(false); setItems([{ description: '', qty: '1', unit: '' }]); setForm({ ...form, brand_name: '', deal_id: '' }); await load() }
    setBusy(null)
  }

  async function act(inv: Invoice, action: 'send' | 'mark_paid' | 'void') {
    setBusy(inv.id); setError('')
    const res = await fetch(`/api/invoices/${inv.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
    })
    if (!res.ok) setError((await res.json()).error ?? 'Action failed')
    await load(); setBusy(null)
  }

  function pdf(inv: Invoice) {
    const doc = generateInvoicePdf({
      invoice_number: inv.invoice_number,
      brand_name: inv.brand_name,
      line_items: sanitizeLineItems(inv.line_items),
      subtotal_cents: Number(inv.subtotal_cents ?? totalOf(inv)),
      tax_bps: Number(inv.tax_bps ?? 0),
      tax_cents: Number(inv.tax_cents ?? 0),
      total_cents: totalOf(inv),
      currency: inv.currency ?? 'USD',
      issue_date: inv.issue_date ?? new Date().toISOString().slice(0, 10),
      due_date: inv.due_date ?? '',
      terms: (inv.terms ?? 'net_30') as InvoiceTerms,
      late_fee_note: inv.late_fee_note,
      agency,
      remittance: inv.remittance ?? {},
    })
    doc.save(`${formatInvoiceNumber(inv.invoice_number)}.pdf`)
  }

  return (
    <DashboardShell active="invoices">
      <div style={{ padding: '32px 28px', maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.625rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Invoices &amp; payments</h1>
            <p style={{ color: '#888', fontSize: '0.9375rem', marginTop: 4, maxWidth: 620, lineHeight: 1.6 }}>
              Sequential numbering, exact cent math, your branding on every PDF. Overdue invoices flag themselves.
            </p>
          </div>
          <button className="btn-gold" style={{ padding: '10px 18px', whiteSpace: 'nowrap' }} onClick={() => setAdding(v => !v)}>
            {adding ? <><X size={15} /> Close</> : <><Plus size={15} /> New invoice</>}
          </button>
        </div>

        {/* Balances */}
        {balances && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {([
              ['Outstanding', balances.outstanding_cents, '#38bdf8'],
              [`Overdue (${balances.overdue_count})`, balances.overdue_cents, '#ef4444'],
              ['Collected', balances.paid_cents, '#00D084'],
            ] as Array<[string, number, string]>).map(([label, cents, color]) => (
              <div key={label} className="card-dark" style={{ padding: '16px 18px' }}>
                <div style={{ color: '#777', fontSize: '0.78rem', marginBottom: 4 }}>{label}</div>
                <div style={{ color, fontSize: '1.35rem', fontWeight: 800 }}>{formatCents(cents)}</div>
              </div>
            ))}
          </div>
        )}

        {error && <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginBottom: 14 }}>{error}</p>}

        {/* Create form */}
        {adding && (
          <form onSubmit={create} className="card-dark" style={{ padding: 20, marginBottom: 24, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input className="input-dark" placeholder="Bill to (client / brand)" value={form.brand_name} onChange={e => setForm({ ...form, brand_name: e.target.value })} />
              <select className="input-dark" value={form.deal_id} onChange={e => setForm({ ...form, deal_id: e.target.value })}>
                <option value="">Link a deal (optional — fills line items)</option>
                {deals.map(d => <option key={d.id} value={d.id}>{d.name} ({d.stage})</option>)}
              </select>
            </div>
            {items.map((li, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 70px 120px 32px', gap: 8 }}>
                <input className="input-dark" placeholder="Description" value={li.description} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                <input className="input-dark" placeholder="Qty" inputMode="numeric" value={li.qty} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))} />
                <input className="input-dark" placeholder="Unit $" inputMode="decimal" value={li.unit} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} />
                <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={15} /></button>
              </div>
            ))}
            <button type="button" onClick={() => setItems([...items, { description: '', qty: '1', unit: '' }])}
              style={{ justifySelf: 'start', padding: '5px 12px', borderRadius: 8, fontSize: '0.78rem', cursor: 'pointer', border: '1px solid #2c2c2c', background: '#161616', color: '#bbb' }}>
              <Plus size={12} style={{ display: 'inline' }} /> Line item
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 12 }}>
              <input className="input-dark" placeholder="Tax bps (825 = 8.25%)" inputMode="numeric" value={form.tax_bps} onChange={e => setForm({ ...form, tax_bps: e.target.value })} />
              <select className="input-dark" value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value as InvoiceTerms })}>
                {INVOICE_TERMS.map(t => <option key={t} value={t}>{TERMS_LABEL[t]}</option>)}
              </select>
              <input className="input-dark" placeholder="Late-fee note" value={form.late_fee_note} onChange={e => setForm({ ...form, late_fee_note: e.target.value })} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#999', fontSize: '0.85rem' }}>
                Subtotal {formatCents(preview.subtotal_cents)} · Tax {formatCents(preview.tax_cents)} ·{' '}
                <strong style={{ color: '#FFD700' }}>Total {formatCents(preview.total_cents)}</strong>
              </span>
              <button type="submit" className="btn-gold" disabled={busy === 'create'} style={{ padding: '10px 20px' }}>
                {busy === 'create' ? <Loader2 size={15} className="animate-spin" /> : 'Create draft'}
              </button>
            </div>
          </form>
        )}

        {/* Table */}
        {loading ? (
          <div style={{ color: '#666', padding: 40, textAlign: 'center' }}><Loader2 size={18} className="animate-spin" style={{ display: 'inline' }} /></div>
        ) : invoices.length === 0 ? (
          <div className="card-dark" style={{ padding: 48, textAlign: 'center', color: '#666' }}>
            <Receipt size={28} style={{ color: '#333', margin: '0 auto 12px' }} />
            No invoices yet. Create one from a deal — line items and totals fill automatically.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {invoices.map(inv => (
              <div key={inv.id} className="card-dark" style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ color: '#FFD700', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'ui-monospace, monospace' }}>
                  {formatInvoiceNumber(inv.invoice_number)}
                </span>
                <span style={{ color: '#ddd', flex: 1, minWidth: 140, fontSize: '0.9rem' }}>{inv.brand_name ?? '—'}</span>
                <span style={{ color: '#eee', fontWeight: 700, fontSize: '0.92rem' }}>{formatCents(totalOf(inv), inv.currency ?? 'USD')}</span>
                <span style={{ color: '#777', fontSize: '0.78rem' }}>due {inv.due_date ?? '—'}</span>
                <span style={{
                  color: STATUS_COLOR[inv.status], border: `1px solid ${STATUS_COLOR[inv.status]}44`,
                  background: `${STATUS_COLOR[inv.status]}14`, borderRadius: 999, padding: '3px 12px',
                  fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize',
                }}>{inv.status}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {busy === inv.id ? <Loader2 size={15} className="animate-spin" style={{ color: '#FFD700' }} /> : (
                    <>
                      {inv.status === 'draft' && <ActionBtn onClick={() => act(inv, 'send')}>Send</ActionBtn>}
                      {['sent', 'viewed', 'overdue'].includes(inv.status) && <ActionBtn onClick={() => act(inv, 'mark_paid')}>Mark paid</ActionBtn>}
                      {!['paid', 'void'].includes(inv.status) && <ActionBtn onClick={() => act(inv, 'void')}>Void</ActionBtn>}
                      <button onClick={() => pdf(inv)} title="Download PDF" style={{ background: 'none', border: 'none', color: '#FFD700', cursor: 'pointer', display: 'flex' }}>
                        <Download size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}

function ActionBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 8, fontSize: '0.76rem', cursor: 'pointer',
      border: '1px solid #2c2c2c', background: '#161616', color: '#bbb',
    }}>{children}</button>
  )
}
