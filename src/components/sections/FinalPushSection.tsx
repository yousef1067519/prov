'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Calendar } from 'lucide-react'

export default function FinalPushSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="section" ref={ref} style={{ background: '#080808' }}>
      <div className="divider-gold" style={{ marginBottom: 100 }} />
      <div className="container" style={{ textAlign: 'center', maxWidth: 720 }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <div style={{
            padding: '80px 48px',
            background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,215,0,0.06) 0%, transparent 70%)',
          }}>
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#ffffff', marginBottom: 20, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
              Stop managing IMA chaos.<br />
              <span className="gold-text">Start closing deals.</span>
            </h2>
            <p style={{ color: '#666', fontSize: '1.125rem', maxWidth: 480, margin: '0 auto 48px', lineHeight: 1.7 }}>
              Your competition is already using automation.
              Every hour you spend on spreadsheets is an hour they spend closing deals.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
              <Link href="/trial" className="btn-gold text-lg px-12 py-5">
                Start Free Month <ArrowRight size={20} />
              </Link>
              <Link href="/buy" className="btn-outline-gold text-base px-10 py-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={16} /> Subscribe at $299/month
              </Link>
              <p style={{ color: '#333', fontSize: '0.8125rem', marginTop: 8 }}>
                No credit card for trial · $299/month after · Cancel anytime
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
