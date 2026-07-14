'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, DollarSign, Send, Reply, Trophy, Clock } from 'lucide-react'
import DashboardShell from './DashboardShell'

const CRM_STAGES = ['Prospect', 'Contacted', 'Follow-up', 'Negotiating', 'Active Client', 'Lost'] as const
const STAGE_COLOR: Record<string, string> = {
  Prospect: '#667eea', Contacted: '#38bdf8', 'Follow-up': '#FFD700',
  Negotiating: '#f59e0b', 'Active Client': '#00D084', Lost: '#ef4444',
}
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const money = (n: number) => '$' + Math.round(n).toLocaleString()

interface State {
  campaigns: number
  contacted: number
  replies: number
  deals: number
  revenue: number
  outstanding: number
  months: { label: string; value: number }[]
  pipeline: { stage: string; count: number }[]
  invoiceStatus: { draft: number; sent: number; paid: number; overdue: number }
  loaded: boolean
}

const EMPTY: State = {
  campaigns: 0, contacted: 0, replies: 0, deals: 0, revenue: 0, outstanding: 0,
  months: [], pipeline: [], invoiceStatus: { draft: 0, sent: 0, paid: 0, overdue: 0 }, loaded: false,
}

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666', fontSize: '0.8125rem', marginBottom: 12 }}>
        <span style={{ color }}>{icon}</span> {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f5f5f5', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{value}</div>
    </div>
  )
}

export default function AnalyticsPanel() {
  const [s, setS] = useState<State>(EMPTY)

  useEffect(() => {
    const sb = createClient()
    async function count(table: string, filter?: [string, string]) {
      let q = sb.from(table).select('*', { count: 'exact', head: true })
      if (filter) q = q.eq(filter[0], filter[1])
      const { count } = await q
      return count ?? 0
    }
    (async () => {
      const [campaigns, contacted, replies, deals] = await Promise.all([
        count('campaigns'),
        count('emails_sent', ['recipient_type', 'creator']),
        count('responses'),
        count('contracts', ['status', 'signed']),
      ])

      // Invoices drive revenue, outstanding, monthly growth, status breakdown.
      const { data: inv } = await sb.from('invoices').select('amount, status, created_at')
      const invoices = inv ?? []
      const revenue = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + Number(i.amount), 0)
      const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((a, i) => a + Number(i.amount), 0)
      const invoiceStatus = {
        draft: invoices.filter(i => i.status === 'draft').length,
        sent: invoices.filter(i => i.status === 'sent').length,
        paid: invoices.filter(i => i.status === 'paid').length,
        overdue: invoices.filter(i => i.status === 'overdue').length,
      }

      // last 6 months of paid revenue
      const now = new Date()
      const months: { label: string; value: number }[] = []
      for (let k = 5; k >= 0; k--) {
        const d = new Date(now.getFullYear(), now.getMonth() - k, 1)
        const value = invoices
          .filter(i => i.status === 'paid' && i.created_at)
          .filter(i => { const c = new Date(i.created_at); return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear() })
          .reduce((a, i) => a + Number(i.amount), 0)
        months.push({ label: MONTH_LABELS[d.getMonth()], value })
      }

      // CRM pipeline by stage
      const { data: brands } = await sb.from('brands').select('stage')
      const pipeline = CRM_STAGES.map(stage => ({ stage, count: (brands ?? []).filter(b => b.stage === stage).length }))

      setS({ campaigns, contacted, replies, deals, revenue, outstanding, months, pipeline, invoiceStatus, loaded: true })
    })().catch(() => setS(prev => ({ ...prev, loaded: true })))
  }, [])

  const replyRate = s.contacted ? Math.round((s.replies / s.contacted) * 100) : 0
  const maxMonth = Math.max(1, ...s.months.map(m => m.value))
  const hasRevenue = s.months.some(m => m.value > 0)
  const hasPipeline = s.pipeline.some(p => p.count > 0)

  return (
    <DashboardShell active="analytics">
      <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Analytics</h1>
        <p style={{ color: '#666', marginTop: 4, marginBottom: 24 }}>Your real numbers, updated as you run campaigns.</p>

        {/* metric cards — all live, per-user */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 28 }}>
          <Metric icon={<TrendingUp size={15} />} label="Active campaigns" value={String(s.campaigns)} color="#FFD700" />
          <Metric icon={<Send size={15} />} label="Influencers contacted" value={String(s.contacted)} color="#667eea" />
          <Metric icon={<Reply size={15} />} label="Reply rate" value={`${replyRate}%`} color="#38bdf8" />
          <Metric icon={<Trophy size={15} />} label="Deals signed" value={String(s.deals)} color="#00D084" />
          <Metric icon={<DollarSign size={15} />} label="Revenue (paid)" value={money(s.revenue)} color="#00D084" />
          <Metric icon={<Clock size={15} />} label="Outstanding" value={money(s.outstanding)} color="#f59e0b" />
        </div>

        {/* revenue growth — real, from paid invoices */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 16, padding: '24px', marginBottom: 28 }}>
          <p style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 20 }}>Revenue (last 6 months)</p>
          {hasRevenue ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 180 }}>
              {s.months.map((m, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#FFD700', fontSize: '0.8125rem', fontWeight: 700 }}>{m.value ? money(m.value) : ''}</span>
                  <div style={{ width: '100%', maxWidth: 56, height: `${(m.value / maxMonth) * 140}px`, minHeight: m.value ? 4 : 0, background: 'linear-gradient(180deg, #FFD700, #CA8A04)', borderRadius: '6px 6px 0 0' }} />
                  <span style={{ color: '#666', fontSize: '0.75rem' }}>{m.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#555', fontSize: '0.875rem', padding: '40px 0', textAlign: 'center' }}>
              {s.loaded ? 'No paid invoices yet. Mark an invoice paid to see revenue here.' : 'Loading…'}
            </p>
          )}
        </div>

        {/* pipeline + invoice status — real */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 16, padding: '20px' }}>
            <p style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '0.9375rem', marginBottom: 14 }}>Deal pipeline</p>
            {hasPipeline ? s.pipeline.map(p => (
              <div key={p.stage} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#888', width: 96 }}>{p.stage}</span>
                <span style={{ flex: 1, height: 8, borderRadius: 4, background: '#1a1a1a', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', width: `${(p.count / Math.max(1, ...s.pipeline.map(x => x.count))) * 100}%`, background: STAGE_COLOR[p.stage], borderRadius: 4 }} />
                </span>
                <span style={{ fontSize: 12, color: '#aaa', fontWeight: 700, width: 20, textAlign: 'right' }}>{p.count}</span>
              </div>
            )) : <p style={{ color: '#555', fontSize: '0.875rem', padding: '24px 0', textAlign: 'center' }}>{s.loaded ? 'No brands in your CRM yet.' : 'Loading…'}</p>}
          </div>

          <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 16, padding: '20px' }}>
            <p style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '0.9375rem', marginBottom: 14 }}>Invoices</p>
            {([['Paid', s.invoiceStatus.paid, '#00D084'], ['Sent', s.invoiceStatus.sent, '#38bdf8'], ['Overdue', s.invoiceStatus.overdue, '#ef4444'], ['Draft', s.invoiceStatus.draft, '#888']] as const).map(([label, n, c]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #161616' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: '#cfcfcf' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c }} /> {label}
                </span>
                <span style={{ color: '#aaa', fontWeight: 700 }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
