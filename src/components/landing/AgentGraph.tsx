'use client'

// ▸ how prov works — the orchestration graph. Nodes light up in sequence
// with flowing connectors; hovering (or focusing) a node reveals its detail.
// On small screens the graph reflows into a two-column grid, no connectors.

import { useEffect, useState } from 'react'
import { STAGES } from './stages'

export default function AgentGraph() {
  const [active, setActive] = useState(0)
  const [pinned, setPinned] = useState<number | null>(null)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => setActive(a => (a + 1) % STAGES.length), 1800)
    return () => clearInterval(t)
  }, [reduced])

  const shown = pinned ?? active
  const detail = STAGES[shown]

  return (
    <div>
      {/* Desktop rail */}
      <div className="lp-graph-rail" style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
        {STAGES.map((s, i) => {
          const on = i === shown
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <button
                onMouseEnter={() => setPinned(i)} onMouseLeave={() => setPinned(null)}
                onFocus={() => setPinned(i)} onBlur={() => setPinned(null)}
                aria-label={`${s.key}: ${s.detail}`}
                style={{
                  flex: 1, minWidth: 0, cursor: 'default', textAlign: 'left',
                  background: on ? 'rgba(255,215,0,0.06)' : 'var(--lp-surface-1)',
                  border: `1px solid ${on ? 'rgba(255,215,0,0.4)' : 'var(--lp-hairline)'}`,
                  borderRadius: 11, padding: '12px 12px',
                  boxShadow: on ? '0 0 28px rgba(255,215,0,0.10)' : 'none',
                  transition: 'border-color .4s, background .4s, box-shadow .4s',
                }}>
                <div className="lp-mono" style={{ fontSize: '0.68rem', color: on ? '#ffd700' : '#ccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.key}
                </div>
                <div className="lp-mono" style={{ fontSize: '0.6rem', color: '#5f5f66', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.role}
                </div>
              </button>
              {i < STAGES.length - 1 && (
                <span aria-hidden className={i === shown ? 'lp-connector-active' : undefined}
                  style={{ width: 18, height: 2, flexShrink: 0, background: i === shown ? undefined : 'var(--lp-hairline)' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Detail line */}
      <p className="lp-mono" aria-live="polite" style={{ marginTop: 16, fontSize: '0.78rem', color: '#8a8a92', minHeight: 22 }}>
        <span style={{ color: '#ffd700' }}>▸ {detail.key}</span>{'  '}{detail.detail}
      </p>

      <style>{`
        @media (max-width: 860px) {
          .lp-graph-rail { display: grid !important; grid-template-columns: 1fr 1fr; gap: 8px; }
          .lp-graph-rail span[aria-hidden] { display: none; }
        }
      `}</style>
    </div>
  )
}
