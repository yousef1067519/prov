'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { PlayCircle, GraduationCap, BookOpen, ExternalLink } from 'lucide-react'

// Free value between CTAs — give before asking again. Real, free resources an
// IMA founder can use today, whether or not they ever pay us.
const RESOURCES = [
  {
    Icon: PlayCircle,
    tag: 'Free full course',
    title: 'Alex Hormozi — $100M Leads (complete course)',
    desc: 'The entire client-acquisition playbook, free on YouTube. If you only watch one thing before starting your agency, watch this.',
    href: 'https://www.youtube.com/playlist?list=PL8zQ_vWLDsA7AfjwunV37tKDG0xYafMsi',
  },
  {
    Icon: GraduationCap,
    tag: 'Free full course',
    title: 'Eric Nowoslawski — Outbound Cold Email Course',
    desc: 'From the guy sending 1.5M cold emails a month. Hooks, deliverability, follow-up cadence — the exact craft your agency runs on.',
    href: 'https://www.youtube.com/playlist?list=PLN4tvwwU-SPOfe8uoh3BXJcQ9UJPwP6xH',
  },
  {
    Icon: BookOpen,
    tag: 'Watch on YouTube',
    title: 'Abu Lahya — A Halal Way to Make 6 Figures',
    desc: 'The video that put the IMA model on the map. If you are still deciding whether to start an agency, start here.',
    href: 'https://youtu.be/Hx-pgUPX-eo',
  },
]

export default function FreeValueSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="section" ref={ref} style={{ background: '#0a0a0a' }}>
      <div className="container" style={{ maxWidth: 1000 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center"
          style={{ marginBottom: 48 }}
        >
          <span className="badge-gold" style={{ marginBottom: 20, display: 'inline-flex' }}>Free value — no signup needed</span>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: 12 }}>
            Not ready yet? Level up for free first.
          </h2>
          <p style={{ color: '#666', fontSize: '1.0625rem', maxWidth: 560, margin: '0 auto' }}>
            Whether you use Prov or not, these will make you a better agency founder. Come back when you&apos;re ready to automate.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {RESOURCES.map((r, i) => (
            <motion.a
              key={r.title}
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{
                display: 'block', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 16,
                padding: '26px 24px', textDecoration: 'none', transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.35)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1a1a1a')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(255,215,0,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <r.Icon size={20} style={{ color: '#FFD700' }} />
                </span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#CA8A04' }}>{r.tag}</span>
              </div>
              <h3 style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '1.0625rem', marginBottom: 8, lineHeight: 1.35 }}>{r.title}</h3>
              <p style={{ color: '#777', fontSize: '0.875rem', lineHeight: 1.65, marginBottom: 14 }}>{r.desc}</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#FFD700', fontSize: '0.8125rem', fontWeight: 600 }}>
                Open free <ExternalLink size={13} />
              </span>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  )
}
