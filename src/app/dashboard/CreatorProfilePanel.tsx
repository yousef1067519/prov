'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, Eye, Activity, DollarSign, Briefcase, TrendingUp } from 'lucide-react'
import DashboardShell from './DashboardShell'
import type { Influencer } from '@/lib/types'
import type { PerfPoint, PastCampaign } from '@/lib/creatorPerformance'

interface Data {
  creator: Influencer
  history: PerfPoint[]
  pastCampaigns: PastCampaign[]
  cpm: number
  estDealValue: number
  totalRevenue: number
}

const fmt = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n)
const money = (n: number) => '$' + Math.round(n).toLocaleString()
const RESULT_COLOR: Record<string, string> = { successful: '#00D084', pending: '#FFD700', declined: '#ef4444' }

function LineChart({ points, color, label, format }: { points: { x: string; y: number }[]; color: string; label: string; format: (n: number) => string }) {
  const w = 100, h = 40
  const ys = points.map(p => p.y)
  const min = Math.min(...ys), max = Math.max(...ys)
  const range = max - min || 1
  const coords = points.map((p, i) => {
    const x = points.length === 1 ? 0 : (i / (points.length - 1)) * w
    const y = h - ((p.y - min) / range) * (h - 6) - 3
    return { x, y }
  })
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const area = `${path} L${w},${h} L0,${h} Z`
  const last = points[points.length - 1]?.y ?? 0
  const first = points[0]?.y ?? 0
  const delta = first ? Math.round(((last - first) / first) * 100) : 0
  return (
    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <span style={{ color: '#888', fontSize: '0.8125rem' }}>{label}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', fontWeight: 700, color: delta >= 0 ? '#00D084' : '#ef4444' }}>
          <TrendingUp size={13} style={{ transform: delta >= 0 ? 'none' : 'scaleY(-1)' }} /> {delta >= 0 ? '+' : ''}{delta}%
        </span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f5f5f5', fontFamily: 'var(--font-display)', marginBottom: 8 }}>{format(last)}</div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 56 }}>
        <defs>
          <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#g-${label})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666', fontSize: '0.75rem', marginBottom: 10 }}>
        <span style={{ color }}>{icon}</span> {label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f5f5f5', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{value}</div>
    </div>
  )
}

export default function CreatorProfilePanel({ id }: { id: string }) {
  const [data, setData] = useState<Data | null>(null)
  const [range, setRange] = useState(12)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/creators/${id}/performance`)
        if (!res.ok) { setError('Creator not found.'); return }
        setData(await res.json())
      } catch { setError('Could not load creator.') }
    })()
  }, [id])

  if (error) return <DashboardShell active="search"><div style={{ padding: 40, color: '#888' }}>{error} <Link href="/dashboard/discovery" style={{ color: '#FFD700' }}>← Back</Link></div></DashboardShell>
  if (!data) return <DashboardShell active="search"><div style={{ padding: 40, color: '#555' }}>Loading…</div></DashboardShell>

  const c = data.creator
  const hist = data.history.slice(-range)
  const successful = data.pastCampaigns.filter(p => p.result === 'successful').length
  const pieData = [
    { label: 'Successful', value: successful, color: '#00D084' },
    { label: 'Pending', value: data.pastCampaigns.filter(p => p.result === 'pending').length, color: '#FFD700' },
    { label: 'Declined', value: data.pastCampaigns.filter(p => p.result === 'declined').length, color: '#ef4444' },
  ].filter(p => p.value > 0)
  const pieTotal = pieData.reduce((a, p) => a + p.value, 0)
  const maxRev = Math.max(1, ...data.pastCampaigns.map(p => p.revenue))

  return (
    <DashboardShell active="search">
      <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>
        <Link href="/dashboard/discovery" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#888', fontSize: '0.875rem', textDecoration: 'none', marginBottom: 18 }}>
          <ArrowLeft size={15} /> Back to discovery
        </Link>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg, #FFD700, #CA8A04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.5rem', color: '#0a0a0a' }}>
            {c.name.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--font-display)' }}>{c.name}</h1>
            <p style={{ color: '#888', fontSize: '0.875rem', marginTop: 2 }}>{c.niche} · {c.platform} · {c.country}{c.language ? ` · ${c.language}` : ''}</p>
          </div>
          {c.email && <a href={`mailto:${c.email}`} className="btn-gold" style={{ padding: '9px 18px' }}>Contact</a>}
        </div>

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          <Metric icon={<Users size={14} />} label="Followers" value={fmt(c.subscribers)} color="#667eea" />
          <Metric icon={<Eye size={14} />} label="Avg views" value={fmt(c.avg_views)} color="#38bdf8" />
          <Metric icon={<Activity size={14} />} label="Engagement" value={c.engagement_rate + '%'} color="#FFD700" />
          <Metric icon={<DollarSign size={14} />} label="Est. CPM" value={money(data.cpm)} color="#00D084" />
          <Metric icon={<DollarSign size={14} />} label="Est. / post" value={money(data.estDealValue)} color="#00D084" />
          <Metric icon={<Briefcase size={14} />} label="Total revenue" value={money(data.totalRevenue)} color="#00D084" />
        </div>

        {/* Range toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[3, 6, 12].map(r => (
            <button key={r} onClick={() => setRange(r)}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                background: range === r ? 'rgba(255,215,0,0.12)' : 'transparent', border: `1px solid ${range === r ? 'rgba(255,215,0,0.4)' : '#222'}`, color: range === r ? '#FFD700' : '#888' }}>
              {r} months
            </button>
          ))}
        </div>

        {/* Trend charts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 24 }}>
          <LineChart label="Followers" color="#667eea" format={fmt} points={hist.map(h => ({ x: h.date, y: h.followers }))} />
          <LineChart label="Avg views" color="#38bdf8" format={fmt} points={hist.map(h => ({ x: h.date, y: h.avg_views }))} />
          <LineChart label="Engagement" color="#FFD700" format={n => n.toFixed(1) + '%'} points={hist.map(h => ({ x: h.date, y: h.engagement }))} />
        </div>

        {/* Past campaigns + success pie */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 14 }}>
          <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 16, padding: '20px' }}>
            <p style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '0.9375rem', marginBottom: 14 }}>Previous campaigns</p>
            {data.pastCampaigns.length === 0 ? (
              <p style={{ color: '#555', fontSize: '0.875rem', padding: '20px 0', textAlign: 'center' }}>No campaigns with this creator yet.</p>
            ) : data.pastCampaigns.map((p, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < data.pastCampaigns.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ color: '#e0e0e0', fontSize: '0.875rem', fontWeight: 600 }}>{p.campaign} · <span style={{ color: '#888', fontWeight: 400 }}>{p.sponsor}</span></span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: RESULT_COLOR[p.result], textTransform: 'capitalize' }}>{p.result}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, height: 6, borderRadius: 3, background: '#1a1a1a', overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${(p.revenue / maxRev) * 100}%`, background: 'linear-gradient(90deg,#FFD700,#CA8A04)' }} />
                  </span>
                  <span style={{ color: '#aaa', fontSize: '0.8125rem', fontWeight: 700, width: 64, textAlign: 'right' }}>{money(p.revenue)}</span>
                  <span style={{ color: p.roi >= 0 ? '#00D084' : '#ef4444', fontSize: '0.75rem', width: 48, textAlign: 'right' }}>{p.roi >= 0 ? '+' : ''}{p.roi}%</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 16, padding: '20px' }}>
            <p style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '0.9375rem', marginBottom: 14 }}>Campaign outcomes</p>
            {pieTotal === 0 ? (
              <p style={{ color: '#555', fontSize: '0.875rem', padding: '20px 0', textAlign: 'center' }}>No history.</p>
            ) : (
              <>
                <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 16px', borderRadius: '50%',
                  background: `conic-gradient(${pieData.map((p, i) => {
                    const start = pieData.slice(0, i).reduce((a, x) => a + x.value, 0) / pieTotal * 100
                    const end = start + p.value / pieTotal * 100
                    return `${p.color} ${start}% ${end}%`
                  }).join(', ')})` }}>
                  <div style={{ position: 'absolute', inset: 14, borderRadius: '50%', background: '#111' }} />
                </div>
                {pieData.map(p => (
                  <div key={p.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: '#cfcfcf' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} /> {p.label}
                    </span>
                    <span style={{ color: '#aaa', fontWeight: 700, fontSize: '0.8125rem' }}>{p.value}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
