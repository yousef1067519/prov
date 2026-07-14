'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

// The "here is exactly what to do next" close — zero ambiguity, then the P.S.
const STEPS = [
  { n: '1', title: 'Click the gold button', desc: 'Takes 30 seconds. No credit card for your free month.' },
  { n: '2', title: 'Answer 3 quick questions', desc: 'We build your first campaign around your niche automatically.' },
  { n: '3', title: 'Send your first outreach', desc: 'Creators found, emails written, sent from your own Gmail — inside 10 minutes.' },
]

export default function NextStepsSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="section" ref={ref} style={{ background: '#080808', paddingBottom: 110 }}>
      <div className="container" style={{ maxWidth: 760 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center" style={{ marginBottom: 44 }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: 10 }}>
              Here&apos;s exactly what to do next
            </h2>
            <p style={{ color: '#666', fontSize: '1.0625rem' }}>Three steps. Ten minutes. That&apos;s the whole thing.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 }}>
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.12 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 18, background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 14, padding: '20px 24px' }}
              >
                <span style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #FFD700, #CA8A04)', color: '#0a0a0a', fontWeight: 900, fontSize: '1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</span>
                <div>
                  <p style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '1.0625rem', marginBottom: 4 }}>{s.title}</p>
                  <p style={{ color: '#777', fontSize: '0.9375rem', lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/demo" className="btn-gold text-lg px-12 py-5" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              Start step 1 now <ArrowRight size={20} />
            </Link>
          </div>

        </motion.div>
      </div>
    </section>
  )
}
