'use client'

// The signature element: a live deal running through Prov's real stages.
// Statuses cycle queued → running → done on a loop; the gold glow tracks the
// active stage and each stage emits one log line. Reduced motion gets the
// finished state, static.

import { useEffect, useRef, useState } from 'react'
import { STAGES } from './stages'

const TICK_MS = 1500
const RESET_HOLD_MS = 2600

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return reduced
}

export default function PipelinePanel() {
  const reduced = useReducedMotion()
  const [active, setActive] = useState(0) // index of running stage; STAGES.length = all done
  const [run, setRun] = useState(1)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduced) { setActive(STAGES.length); return }
    let cancelled = false
    let t: ReturnType<typeof setTimeout>
    const step = (i: number) => {
      if (cancelled) return
      if (i > STAGES.length) {
        setRun(r => r + 1)
        setActive(0)
        t = setTimeout(() => step(1), TICK_MS)
      } else {
        setActive(i === STAGES.length ? STAGES.length : i)
        t = setTimeout(() => step(i + 1), i === STAGES.length ? RESET_HOLD_MS : TICK_MS)
      }
    }
    t = setTimeout(() => step(1), TICK_MS)
    return () => { cancelled = true; clearTimeout(t) }
  }, [reduced])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [active])

  const complete = active >= STAGES.length

  return (
    <div className="lp-card" role="img" aria-label="Animated demo: a sponsorship deal moving through Prov's pipeline stages"
      style={{ overflow: 'hidden', boxShadow: '0 0 80px rgba(255,215,0,0.06)' }}>
      {/* Terminal chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderBottom: '1px solid var(--lp-hairline)', background: 'var(--lp-surface-2)' }}>
        {['#3a3a3f', '#3a3a3f', '#3a3a3f'].map((c, i) => (
          <span key={i} style={{ width: 9, height: 9, borderRadius: 99, background: c, display: 'inline-block' }} />
        ))}
        <span className="lp-mono" style={{ marginLeft: 8, fontSize: '0.72rem', color: '#777' }}>
          prov · deal run #{String(run).padStart(3, '0')}
        </span>
        <span className="lp-mono" style={{ marginLeft: 'auto', fontSize: '0.68rem', color: complete ? '#5dd47a' : '#ffd700' }}>
          {complete ? '● complete' : '● live'}
        </span>
      </div>

      {/* Stages */}
      <div style={{ padding: '14px 16px', display: 'grid', gap: 6 }}>
        {STAGES.map((s, i) => {
          const status = complete ? 'done' : i < active ? 'done' : i === active ? 'running' : 'queued'
          return (
            <div key={s.key} className={status === 'running' ? 'lp-running' : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 9,
                border: `1px solid ${status === 'running' ? 'rgba(255,215,0,0.35)' : 'var(--lp-hairline)'}`,
                background: status === 'running' ? undefined : status === 'done' ? 'rgba(255,255,255,0.015)' : 'transparent',
                opacity: status === 'queued' ? 0.45 : 1,
                transition: 'opacity .4s, border-color .4s',
              }}>
              <span className="lp-mono" style={{ fontSize: '0.78rem', color: status === 'done' ? '#bbb' : '#f0f0f0', minWidth: 148 }}>
                {s.key}
              </span>
              <span className="lp-mono" style={{ fontSize: '0.68rem', color: '#666', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.role}
              </span>
              <StatusBadge status={status} />
            </div>
          )
        })}
      </div>

      {/* Log tail */}
      <div ref={logRef} className="lp-mono" aria-hidden="true"
        style={{ borderTop: '1px solid var(--lp-hairline)', background: '#08080a', padding: '10px 16px', height: 74, overflow: 'hidden', fontSize: '0.68rem', lineHeight: 1.8, color: '#5f5f66' }}>
        {STAGES.slice(0, complete ? STAGES.length : active).map(s => (
          <div key={s.key}><span style={{ color: '#3f3f45' }}>▸ </span>{s.log}</div>
        ))}
        {complete
          ? <div style={{ color: '#5dd47a' }}>▸ deal complete — record written to intelligence</div>
          : <span className="lp-cursor" style={{ color: '#ffd700' }}>▮</span>}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'queued' | 'running' | 'done' }) {
  const map = {
    queued: { fg: '#666', label: 'queued' },
    running: { fg: '#ffd700', label: 'running' },
    done: { fg: '#5dd47a', label: 'done' },
  }[status]
  return (
    <span className="lp-mono" style={{
      fontSize: '0.62rem', color: map.fg, border: `1px solid ${map.fg}44`,
      background: `${map.fg}11`, borderRadius: 99, padding: '2px 9px', letterSpacing: '0.08em',
    }}>
      {map.label}
    </span>
  )
}
