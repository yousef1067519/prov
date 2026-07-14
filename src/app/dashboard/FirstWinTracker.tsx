'use client'

import { useEffect, useState } from 'react'
import { Send, Reply, ThumbsUp, CalendarCheck, Trophy } from 'lucide-react'
import { fetchWinMetrics, hasFirstWin, EMPTY_WINS, type WinMetrics } from '@/lib/firstWin'

const OUTREACH_GOAL = 100

export default function FirstWinTracker() {
  const [m, setM] = useState<WinMetrics>(EMPTY_WINS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { fetchWinMetrics().then(v => { setM(v); setLoaded(true) }) }, [])

  const won = hasFirstWin(m)
  const items = [
    { Icon: Send, label: 'Outreach sent', value: m.outreachSent, goal: OUTREACH_GOAL, color: '#667eea' },
    { Icon: Reply, label: 'Replies received', value: m.replies, color: '#38bdf8' },
    { Icon: ThumbsUp, label: 'Positive responses', value: m.positiveResponses, color: '#FFD700' },
    { Icon: CalendarCheck, label: 'Booked calls', value: m.bookedCalls, color: '#00D084' },
  ]

  return (
    <div style={{ background: '#111', border: `1px solid ${won ? 'rgba(0,208,132,0.35)' : '#1a1a1a'}`, borderRadius: 16, padding: '20px 22px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#f0f0f0' }}>
          <Trophy size={17} style={{ color: won ? '#00D084' : '#FFD700' }} /> Your first win
        </span>
        {won && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00D084', background: 'rgba(0,208,132,0.12)', borderRadius: 999, padding: '3px 10px' }}>Traction!</span>}
      </div>

      {/* Outreach progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 6 }}>
          <span style={{ color: '#aaa' }}>Outreach sent</span>
          <span style={{ color: '#FFD700', fontWeight: 700 }}>{m.outreachSent} / {OUTREACH_GOAL}</span>
        </div>
        <div style={{ height: 8, background: '#1a1a1a', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, (m.outreachSent / OUTREACH_GOAL) * 100)}%`, background: 'linear-gradient(90deg,#FFD700,#CA8A04)', transition: 'width 0.4s' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 10 }}>
        {items.map(it => (
          <div key={it.label} style={{ background: '#0d0d0d', border: '1px solid #181818', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#777', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              <it.Icon size={13} style={{ color: it.color }} /> {it.label}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f5f5f5', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{it.value}</div>
          </div>
        ))}
      </div>

      {loaded && !won && (
        <p style={{ color: '#666', fontSize: '0.8125rem', marginTop: 14 }}>
          Send your first batch of outreach to start tracking replies — your first win is usually a reply within 24–72 hours.
        </p>
      )}
    </div>
  )
}
