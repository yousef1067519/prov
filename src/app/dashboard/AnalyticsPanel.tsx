'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, DollarSign, Send, Reply, Trophy, Clock } from 'lucide-react'
import DashboardShell from './DashboardShell'

interface Counts { campaigns: number; emails: number; signed: number; brands: number }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const SAMPLE_GROWTH = [12, 19, 27, 24, 38, 47] // revenue $K, illustrative
const SAMPLE_CREATORS = [['Alex Martin Pro', 6], ['Jake Allen Academy', 5], ['Priya Sharma Labs', 4]] as const
const SAMPLE_SPONSORS = [['Nvidia', 7], ['Notion', 4], ['NordVPN', 3]] as const

function Metric({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666', fontSize: '0.8125rem', marginBottom: 12 }}>
        <span style={{ color }}>{icon}</span> {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f5f5f5', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: '#555', fontSize: '0.8125rem', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

export default function AnalyticsPanel() {
  const [c, setC] = useState<Counts>({ campaigns: 0, emails: 0, signed: 0, brands: 0 })

  useEffect(() => {
    const sb = createClient()
    async function count(table: string, filter?: [string, string]) {
      let q = sb.from(table).select('*', { count: 'exact', head: true })
      if (filter) q = q.eq(filter[0], filter[1])
      const { count } = await q
      return count ?? 0
    }
    Promise.all([
      count('campaigns'), count('emails_sent'), count('contracts', ['status', 'signed']), count('brands'),
    ]).then(([campaigns, emails, signed, brands]) => setC({ campaigns, emails, signed, brands }))
      .catch(() => {})
  }, [])

  const hasData = c.emails > 0
  const replyRate = hasData ? Math.round((c.signed / Math.max(1, c.emails)) * 100) : 62
  const max = Math.max(...SAMPLE_GROWTH)

  return (
    <DashboardShell active="analytics">
      <div style={{ padding: '24px 28px 0', maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Analytics</h1>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
        {/* metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
          <Metric icon={<DollarSign size={15} />} label="Revenue this month" value="$47K" sub="sample" color="#00D084" />
          <Metric icon={<TrendingUp size={15} />} label="Active campaigns" value={String(c.campaigns)} sub="live" color="#FFD700" />
          <Metric icon={<Send size={15} />} label="Emails sent" value={hasData ? String(c.emails) : '142'} sub={hasData ? 'live' : 'sample'} color="#667eea" />
          <Metric icon={<Reply size={15} />} label="Reply rate" value={`${replyRate}%`} sub={hasData ? 'live' : 'sample'} color="#38bdf8" />
          <Metric icon={<Trophy size={15} />} label="Deals signed" value={hasData ? String(c.signed) : '18'} sub={hasData ? 'live' : 'sample'} color="#00D084" />
          <Metric icon={<Clock size={15} />} label="Avg. time to close" value="6 days" sub="sample" color="#f59e0b" />
        </div>

        {/* monthly growth chart */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 16, padding: '24px', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p style={{ color: '#f5f5f5', fontWeight: 700 }}>Revenue growth</p>
            <span style={{ fontSize: '0.6875rem', color: '#555', border: '1px solid #222', borderRadius: 6, padding: '2px 8px' }}>sample data</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 180 }}>
            {SAMPLE_GROWTH.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#FFD700', fontSize: '0.8125rem', fontWeight: 700 }}>${v}K</span>
                <div style={{ width: '100%', maxWidth: 56, height: `${(v / max) * 140}px`, background: 'linear-gradient(180deg, #FFD700, #CA8A04)', borderRadius: '6px 6px 0 0' }} />
                <span style={{ color: '#666', fontSize: '0.75rem' }}>{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* best performers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {[['Top creators by deals', SAMPLE_CREATORS], ['Top sponsors by deals', SAMPLE_SPONSORS]].map(([title, rows]) => (
            <div key={title as string} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 16, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '0.9375rem' }}>{title as string}</p>
                <span style={{ fontSize: '0.6875rem', color: '#555' }}>sample</span>
              </div>
              {(rows as readonly (readonly [string, number])[]).map(([name, n], i) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < 2 ? '1px solid #161616' : 'none' }}>
                  <span style={{ color: '#FFD700', fontWeight: 800, width: 18 }}>{i + 1}</span>
                  <span style={{ flex: 1, color: '#d0d0d0', fontSize: '0.875rem' }}>{name}</span>
                  <span style={{ color: '#888', fontSize: '0.875rem' }}>{n} deals</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  )
}
