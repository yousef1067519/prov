'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { CheckCircle, Zap } from 'lucide-react'
import Link from 'next/link'

const INCLUDES = [
  'Unlimited niche searches',
  '500+ verified creators',
  'Unlimited sponsor matching',
  'Automated email generation (3 templates)',
  'Unlimited bulk email sending',
  'Unlimited AI email assistant',
  'Campaign tracking & analytics',
  'Response & deal pipeline',
  'Priority support',
  'Cancel anytime',
]

export default function PricingSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="pricing" className="section" ref={ref} style={{ background: '#0a0a0a' }}>
      <div className="divider-gold" style={{ marginBottom: 100 }} />
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="badge-gold" style={{ marginBottom: 20, display: 'inline-flex' }}>Pricing</span>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 900, color: '#ffffff', marginBottom: 16, letterSpacing: '-0.025em' }}>
            All-in-one platform. One price.
          </h2>
          <p style={{ color: '#666', fontSize: '1.125rem' }}>
            Everything you need to close more IMA deals. No hidden fees.
          </p>
        </motion.div>

        <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Monthly */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              background: 'linear-gradient(135deg, #111 0%, #141414 100%)',
              border: '1px solid rgba(255,215,0,0.3)',
              borderRadius: 24, padding: '48px 40px',
              boxShadow: '0 0 60px rgba(255,215,0,0.08)',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 200, background: 'radial-gradient(ellipse, rgba(255,215,0,0.08), transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#FFD700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                Agency Plan, Monthly
              </p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: '5rem', fontWeight: 900, lineHeight: 1, color: '#FFD700' }}>$299</span>
                <span style={{ color: '#555', marginBottom: 14 }}>/month</span>
              </div>
              <p style={{ color: '#555', fontSize: '0.9375rem', marginBottom: 32 }}>Full access. Cancel anytime.</p>

              <Link href="/buy" className="btn-gold w-full py-4 text-lg" style={{ marginBottom: 32, display: 'flex' }}>
                <Zap size={18} fill="#0a0a0a" /> Start Free Month
              </Link>

              <div style={{ height: 1, background: 'rgba(255,215,0,0.1)', marginBottom: 28 }} />

              <ul style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                {INCLUDES.map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.875rem', color: '#c0c0c0' }}>
                    <CheckCircle size={14} style={{ color: '#FFD700', marginTop: 2, flexShrink: 0 }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Annual */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              background: '#0f0f0f', border: '1px solid #1f1f1f',
              borderRadius: 16, padding: '24px 32px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
            }}
          >
            <div>
              <p style={{ color: '#ffffff', fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
                Annual plan, <span style={{ color: '#FFD700' }}>$2,490/year</span>
              </p>
              <p style={{ color: '#555', fontSize: '0.875rem' }}>2 months free vs monthly. Same features.</p>
            </div>
            <Link href="/buy?plan=annual" className="btn-outline-gold" style={{ padding: '10px 24px', fontSize: '0.9375rem', whiteSpace: 'nowrap' }}>
              Get Annual Plan
            </Link>
          </motion.div>

          <p style={{ textAlign: 'center', color: '#444', fontSize: '0.875rem' }}>
            Prefer to try first?{' '}
            <Link href="/trial" style={{ color: '#FFD700', textDecoration: 'underline' }}>Start your 30-day free trial →</Link>
          </p>
        </div>
      </div>
    </section>
  )
}
