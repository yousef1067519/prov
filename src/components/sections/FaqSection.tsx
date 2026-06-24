'use client'

import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState } from 'react'
import { Plus, Minus } from 'lucide-react'

const FAQS = [
  {
    q: 'Does Prov actually send the emails?',
    a: 'Yes. You review every email before sending. Once you\'re happy, one click sends all emails to all creators and sponsors simultaneously. Every send is tracked.',
  },
  {
    q: 'What if I don\'t like the AI-generated emails?',
    a: 'Edit them however you want. The AI templates are a starting point, fully editable before you send. Most users tweak subject lines and keep the body as-is.',
  },
  {
    q: 'Can the AI email assistant really help close deals?',
    a: 'It\'s trained on patterns from 1,000+ closed deals. When someone objects to budget, engagement, or timeline, the AI knows exactly how to respond. Most agencies see a 3x improvement in reply-to-close rates.',
  },
  {
    q: 'Is 30 days enough to test it?',
    a: 'Most agencies close their first deal within the first week. By day 30 you\'ll know exactly how much time Prov saves and whether it\'s worth $299/month.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No long-term contract. Cancel anytime from your dashboard. Your data is retained for 90 days after cancellation.',
  },
  {
    q: 'How does sponsor matching work?',
    a: 'When you select a niche, Prov automatically surfaces 50+ pre-vetted sponsors in that industry with typical budget ranges. You can also manually add custom sponsors to any campaign.',
  },
  {
    q: 'What if I have my own sponsor contacts?',
    a: 'Add them manually to any campaign. Prov will generate email templates and track them the same as pre-matched sponsors.',
  },
]

export default function FaqSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="section" ref={ref} style={{ background: '#0a0a0a' }}>
      <div className="divider-gold" style={{ marginBottom: 100 }} />
      <div className="container" style={{ maxWidth: 760 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.025em' }}>
            Frequently asked
          </h2>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 12, overflow: 'hidden' }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 16 }}
              >
                <span style={{ fontSize: '1rem', fontWeight: 600, color: '#f5f5f5', lineHeight: 1.4 }}>{faq.q}</span>
                <span style={{ flexShrink: 0, color: open === i ? '#FFD700' : '#555' }}>
                  {open === i ? <Minus size={18} /> : <Plus size={18} />}
                </span>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '0 24px 20px', fontSize: '0.9375rem', color: '#777', lineHeight: 1.7, borderTop: '1px solid #1a1a1a', paddingTop: 16 }}>
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
