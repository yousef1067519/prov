'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Zap } from 'lucide-react'

const EXAMPLES = [
  {
    reply: '"Interested but the budget you mentioned is too low for our usual rate."',
    who: 'Creator',
    aiSuggestion: '"I completely understand. Let\'s talk value alignment: our sponsor is offering $X plus performance bonuses. Would a 2-month trial at [adjusted rate] work? Many of our creators grew 3x during these partnerships."',
    outcome: '→ Counter-offer sent. Deal closed in 2 days.',
  },
  {
    reply: '"We need creators with higher engagement rates for this campaign."',
    who: 'Sponsor',
    aiSuggestion: '"Alex\'s 14.4% engagement rate ranks in the top 2% of Tech creators. Here\'s data from their last 3 brand deals, averaging 8.2% click-through on sponsored segments. Want me to send the full analytics report?"',
    outcome: '→ Report shared. Sponsor confirmed same day.',
  },
]

export default function AISection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="section" ref={ref} style={{ background: '#080808' }}>
      <div className="divider-gold" style={{ marginBottom: 100 }} />
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3.25rem)', fontWeight: 900, color: '#ffffff', marginBottom: 16, letterSpacing: '-0.025em' }}>
            AI that <span className="gold-text">closes deals</span> for you
          </h2>
          <p style={{ color: '#666', fontSize: '1.125rem', maxWidth: 560, margin: '0 auto' }}>
            When a creator or sponsor replies, Prov&apos;s AI reads the message, understands the objection, and drafts the perfect closing response.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginBottom: 48 }}>
          {EXAMPLES.map((ex, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 16, padding: '28px', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {/* Their reply */}
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                  {ex.who} replied:
                </p>
                <div style={{ background: '#161616', border: '1px solid #222', borderRadius: 10, padding: '14px 16px', fontSize: '0.9375rem', color: '#888', lineHeight: 1.6 }}>
                  {ex.reply}
                </div>
              </div>

              {/* AI suggestion */}
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#667eea', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={12} /> AI Suggests:
                </p>
                <div style={{ background: 'rgba(102,126,234,0.06)', border: '1px solid rgba(102,126,234,0.2)', borderRadius: 10, padding: '14px 16px', fontSize: '0.9375rem', color: '#c7d2fe', lineHeight: 1.6 }}>
                  {ex.aiSuggestion}
                </div>
              </div>

              {/* Outcome */}
              <p style={{ fontSize: '0.875rem', color: '#4ade80', fontWeight: 600, paddingTop: 4 }}>
                ✓ {ex.outcome}
              </p>

              <button style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)', color: '#FFD700', borderRadius: 8, padding: '10px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>
                Send AI Response
              </button>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{ textAlign: 'center', color: '#555', fontSize: '0.9375rem' }}
        >
          AI trained on 1,000+ closed deals. Every win makes it smarter.
        </motion.p>
      </div>
    </section>
  )
}
