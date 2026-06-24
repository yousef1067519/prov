'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Star } from 'lucide-react'

const TESTIMONIALS = [
  {
    quote: 'We went from 2 deals/month to 15 deals/month in 6 weeks. Prov did 90% of the work.',
    name: 'John M.',
    role: 'Agency Owner',
    rating: 5,
  },
  {
    quote: 'The AI email assistant closed 3 deals we would\'ve lost. That alone is worth the price.',
    name: 'Sarah K.',
    role: 'Campaign Manager',
    rating: 5,
  },
  {
    quote: 'Stop building spreadsheets. Prov replaced an entire intern\'s job and does it better.',
    name: 'Mike R.',
    role: 'Senior Agency Lead',
    rating: 5,
  },
  {
    quote: 'Finding sponsors used to take us 2 weeks. Now it takes 30 seconds. Insane.',
    name: 'Priya S.',
    role: 'IMA Director',
    rating: 5,
  },
]

export default function SocialProofSection() {
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
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.025em' }}>
            Agencies love Prov
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{
                background: '#0f0f0f', border: '1px solid #1a1a1a',
                borderRadius: 16, padding: '28px',
                display: 'flex', flexDirection: 'column', gap: 16,
              }}
            >
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} size={14} fill="#FFD700" color="#FFD700" />
                ))}
              </div>
              <p style={{ color: '#d0d0d0', fontSize: '1rem', lineHeight: 1.7, flex: 1 }}>
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <p style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.9375rem' }}>{t.name}</p>
                <p style={{ color: '#555', fontSize: '0.875rem' }}>{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
