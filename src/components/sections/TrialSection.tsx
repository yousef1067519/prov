'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, Shield } from 'lucide-react'
import Link from 'next/link'

// ENTERPRISE (§8.1): was the free-trial email capture; now the pilot CTA.
export default function TrialSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="trial" className="section" ref={ref} style={{ background: '#080808' }}>
      <div className="divider-gold" style={{ marginBottom: 100 }} />
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ maxWidth: 680, margin: '0 auto' }}
        >
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.05) 0%, rgba(255,215,0,0.02) 100%)',
            border: '1px solid rgba(255,215,0,0.2)',
            borderRadius: 24, padding: '56px 48px', textAlign: 'center',
          }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, color: '#ffffff', marginBottom: 16, letterSpacing: '-0.025em' }}>
              Pilot Prov on <span className="gold-text">your real workflow</span>
            </h2>
            <p style={{ color: '#666', fontSize: '1.125rem', marginBottom: 40 }}>
              30-minute demo with our team, then a guided pilot inside your own
              workspace — your clients, your deals, your data.
            </p>

            <Link href="/demo" className="btn-gold" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
              Request a demo <ArrowRight size={18} />
            </Link>

            <p style={{ fontSize: '0.8125rem', color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '20px 0 28px' }}>
              <Shield size={12} style={{ color: '#FFD700' }} />
              Workspace provisioned within two business days of a qualified demo
            </p>

            <div style={{
              background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.1)',
              borderRadius: 10, padding: '16px 20px',
            }}>
              <p style={{ fontSize: '0.875rem', color: '#666', lineHeight: 1.6 }}>
                <span style={{ color: '#FFD700', fontWeight: 700 }}>Your deal history stays yours, forever.</span>
                {' '}Every completed deal becomes agency-owned intelligence — it doesn&apos;t walk out the door when an employee does.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
