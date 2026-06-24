'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState, useTransition } from 'react'
import { ArrowRight, Shield, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function TrialSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      setError('')
      router.push(`/trial?email=${encodeURIComponent(email)}`)
    })
  }

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
              Try Prov free for <span className="gold-text">30 days</span>
            </h2>
            <p style={{ color: '#666', fontSize: '1.125rem', marginBottom: 40 }}>
              All features. No credit card. No limits.<br />
              Full access from day one.
            </p>

            <form onSubmit={handleSubmit} style={{ maxWidth: 440, margin: '0 auto 36px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#f87171' }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  className="input-dark"
                  placeholder="your@agency.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{ flex: 1 }}
                />
                <button type="submit" disabled={isPending} className="btn-gold" style={{ whiteSpace: 'nowrap', padding: '0 20px' }}>
                  {isPending ? <Loader2 size={18} className="animate-spin" /> : <>Start <ArrowRight size={16} /></>}
                </button>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Shield size={12} style={{ color: '#FFD700' }} />
                One trial per IP address · Email verification required
              </p>
            </form>

            <div style={{
              background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.1)',
              borderRadius: 10, padding: '16px 20px',
            }}>
              <p style={{ fontSize: '0.875rem', color: '#666', lineHeight: 1.6 }}>
                <span style={{ color: '#FFD700', fontWeight: 700 }}>Most agencies close 5+ deals in their first month.</span>
                {' '}30 days goes fast. The sooner you start, the sooner you start closing.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
