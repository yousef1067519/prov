'use client'

import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { Star } from 'lucide-react'

interface T { quote: string; name: string; role: string }

const TESTIMONIALS: T[] = [
  { quote: 'We went from 2 deals a month to 15 in six weeks. Prov did 90% of the work.', name: 'John M.', role: 'Agency Owner' },
  { quote: 'The AI email assistant closed 3 deals we would have lost. Worth it on its own.', name: 'Sarah K.', role: 'Campaign Manager' },
  { quote: 'Stop building spreadsheets. Prov replaced an intern\'s job and does it better.', name: 'Mike R.', role: 'Senior Agency Lead' },
  { quote: 'Finding sponsors used to take us two weeks. Now it takes 30 seconds.', name: 'Priya S.', role: 'IMA Director' },
  { quote: 'My team reclaimed 40 hours a week. I actually get my evenings back now.', name: 'Dana W.', role: 'Founder' },
  { quote: 'Contracts and invoices in one place. We look twice as professional to clients.', name: 'Marco R.', role: 'Managing Partner' },
]

function Card({ t }: { t: T }) {
  return (
    <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 16, padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={13} fill="#FFD700" color="#FFD700" />)}
      </div>
      <p style={{ color: '#d0d0d0', fontSize: '0.9375rem', lineHeight: 1.6 }}>&ldquo;{t.quote}&rdquo;</p>
      <div>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem' }}>{t.name}</p>
        <p style={{ color: '#555', fontSize: '0.8125rem' }}>{t.role}</p>
      </div>
    </div>
  )
}

function Column({ items, duration, reduce }: { items: T[]; duration: number; reduce: boolean }) {
  return (
    <motion.div
      animate={reduce ? undefined : { y: ['0%', '-50%'] }}
      transition={reduce ? undefined : { duration, repeat: Infinity, ease: 'linear' }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {[...items, ...items].map((t, i) => <Card key={i} t={t} />)}
    </motion.div>
  )
}

export default function SocialProofSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const reduce = useReducedMotion() ?? false

  const colA = TESTIMONIALS.slice(0, 3)
  const colB = TESTIMONIALS.slice(3, 6)
  const colC = [TESTIMONIALS[1], TESTIMONIALS[4], TESTIMONIALS[0]]

  return (
    <section className="section" ref={ref} style={{ background: '#080808' }}>
      <div className="divider-gold" style={{ marginBottom: 100 }} />
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }} className="text-center mb-16"
        >
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.025em' }}>
            Agencies love Prov
          </h2>
        </motion.div>

        {reduce ? (
          // Reduced motion: static grid, no marquee.
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {TESTIMONIALS.map((t, i) => <Card key={i} t={t} />)}
          </div>
        ) : (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            style={{
              gap: 16, height: 560, overflow: 'hidden',
              maskImage: 'linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)',
            }}
          >
            <Column items={colA} duration={26} reduce={reduce} />
            <Column items={colB} duration={32} reduce={reduce} />
            {/* third column hidden below lg via the grid; render but it only shows at lg+ */}
            <div className="hidden lg:block">
              <Column items={colC} duration={29} reduce={reduce} />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
