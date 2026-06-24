'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'

function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = target / 50
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setVal(target); clearInterval(timer) }
      else setVal(Math.floor(start))
    }, 30)
    return () => clearInterval(timer)
  }, [inView, target])

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

const STATS = [
  { value: 500, suffix: '+', label: 'Verified creators', sub: 'Ready to pitch' },
  { value: 11, suffix: '', label: 'Niches covered', sub: 'Every major category' },
  { value: 50, suffix: '+', label: 'Sponsor matches per niche', sub: 'Auto-matched to your creators' },
  { value: 80, suffix: '+', label: 'Hours saved per month', sub: 'Per agency' },
  { value: 10, suffix: 'x', label: 'Faster deal closure', sub: 'vs. manual outreach' },
  { value: 200, suffix: '+', label: 'Agencies using Prov', sub: 'And growing' },
]

export default function StatsSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="section" ref={ref} style={{ background: '#0a0a0a' }}>
      <div className="divider-gold" style={{ marginBottom: 100 }} />
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.025em' }}>
            Real numbers. Real results.
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="stat-card"
            >
              <div style={{ fontSize: '3rem', fontWeight: 900, color: '#FFD700', lineHeight: 1, marginBottom: 8 }}>
                <Counter target={stat.value} suffix={stat.suffix} />
              </div>
              <div style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{stat.label}</div>
              <div style={{ color: '#444', fontSize: '0.875rem' }}>{stat.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
