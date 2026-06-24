'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ShieldCheck } from 'lucide-react'

const EASE_OUT = [0.16, 1, 0.3, 1] as const

export default function GuaranteeSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="section" ref={ref} style={{ background: '#0a0a0a' }}>
      <div className="divider-gold" style={{ marginBottom: 100 }} />
      <div className="container" style={{ maxWidth: 760 }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: EASE_OUT }}
          className="glass-gold"
          style={{ borderRadius: 24, padding: 'clamp(36px, 6vw, 64px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 360, height: 240, background: 'radial-gradient(ellipse, rgba(202,138,4,0.12), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)', color: '#FFD700', marginBottom: 24 }}>
              <ShieldCheck size={26} strokeWidth={1.75} />
            </span>
            <h2 style={{ fontSize: 'clamp(1.625rem, 4vw, 2.5rem)', fontWeight: 900, color: '#fff', marginBottom: 20, letterSpacing: '-0.025em', textWrap: 'balance' }}>
              Get 20 hours back in week one,<br />or your money back.
            </h2>
            <p style={{ color: '#9a9a9a', fontSize: '1.0625rem', lineHeight: 1.7, maxWidth: 540, margin: '0 auto', textWrap: 'pretty' }}>
              Run Prov for 30 days. If it does not hand you back at least 20 hours a week,
              email us and we refund every cent. No forms, no friction. Your time is the
              whole point, so we put it on the line, not you.
            </p>
            <p style={{ color: '#555', fontSize: '0.875rem', marginTop: 24 }}>
              We are betting you will feel the difference in the first week.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
