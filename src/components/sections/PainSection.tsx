'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { X, Check } from 'lucide-react'

const EASE_OUT = [0.16, 1, 0.3, 1] as const

const ROWS = [
  { problem: 'Finding influencers', hours: '20+ hrs', solution: 'Creators auto-matched in seconds' },
  { problem: 'Researching sponsors', hours: '15+ hrs', solution: 'Sponsors matched to your niche' },
  { problem: 'Writing and sending emails', hours: '20+ hrs', solution: 'AI writes every outreach email' },
  { problem: 'Chasing non-responders', hours: '15+ hrs', solution: 'AI handles the follow-ups' },
  { problem: 'Managing spreadsheets', hours: '10+ hrs', solution: 'One live campaign dashboard' },
]

export default function PainSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="section" ref={ref} style={{ background: '#080808' }}>
      <div className="divider-gold" style={{ marginBottom: 100 }} />
      <div className="container" style={{ maxWidth: 980 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: EASE_OUT }} className="text-center mb-16"
        >
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3.25rem)', fontWeight: 900, color: '#fff', marginBottom: 16, letterSpacing: '-0.025em', textWrap: 'balance' }}>
            Two ways to run your agency
          </h2>
          <p style={{ color: '#666', fontSize: '1.125rem', textWrap: 'pretty' }}>
            One buries you in busywork. The other hands you the week back.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 18, alignItems: 'stretch' }}>
          {/* PROBLEM — red */}
          <motion.div
            initial={{ opacity: 0, x: -24 }} animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            style={{ borderRadius: 20, border: '1px solid rgba(239,68,68,0.2)', background: 'linear-gradient(160deg, #140e0e, #0c0a0a)', padding: 28 }}
          >
            <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f87171', marginBottom: 22 }}>The manual grind</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {ROWS.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                    <X size={14} strokeWidth={2.5} />
                  </span>
                  <span style={{ flex: 1, fontSize: '0.9375rem', color: '#b0a3a3' }}>{r.problem}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f87171' }}>{r.hours}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#7a6a6a' }}>Every month</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444', fontFamily: 'var(--font-display)' }}>80+ hours gone</span>
            </div>
          </motion.div>

          {/* SOLUTION — green/gold */}
          <motion.div
            initial={{ opacity: 0, x: 24 }} animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT }}
            style={{ position: 'relative', borderRadius: 20, border: '1px solid rgba(0,208,132,0.25)', background: 'linear-gradient(160deg, #0b1410, #080c0a)', padding: 28, overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 180, background: 'radial-gradient(ellipse, rgba(0,208,132,0.10), transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#00D084', marginBottom: 22 }}>With Prov</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {ROWS.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, background: 'rgba(0,208,132,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00D084' }}>
                      <Check size={14} strokeWidth={2.5} />
                    </span>
                    <span style={{ flex: 1, fontSize: '0.9375rem', color: '#cdd8d2' }}>{r.solution}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(0,208,132,0.15)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', color: '#6a7a72' }}>Every month</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#00D084', fontFamily: 'var(--font-display)' }}>Under 5 hours</span>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.25, ease: EASE_OUT }}
          style={{ textAlign: 'center', color: '#888', fontSize: '1.0625rem', marginTop: 28, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto', textWrap: 'pretty' }}
        >
          <span style={{ color: '#e8e8e8', fontWeight: 700 }}>That is 75 hours back, every month.</span> While you are doing admin work, your competitors are closing deals.
        </motion.p>
      </div>
    </section>
  )
}
