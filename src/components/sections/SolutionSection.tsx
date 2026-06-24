'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Send, Sparkles } from 'lucide-react'

const STEPS = [
  {
    num: '01',
    title: 'Pick Your Niche',
    desc: 'Select from 11 niches. Instantly see 50+ verified creators with real subscriber counts, engagement rates, and business emails.',
    preview: (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['Tech', 'Gaming', 'Finance', 'Beauty', 'Fitness'].map(n => (
          <span key={n} style={{ background: n === 'Tech' ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${n === 'Tech' ? 'rgba(255,215,0,0.4)' : '#222'}`, color: n === 'Tech' ? '#FFD700' : '#555', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600 }}>{n}</span>
        ))}
      </div>
    ),
  },
  {
    num: '02',
    title: 'Select Your Creators',
    desc: 'Checkbox each creator. Filter by platform, subscriber range, engagement rate, and country. One click adds all to your campaign.',
    preview: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {['Alex Martin Pro · 711K subs · 14.4%', 'Jake Allen Academy · 989K subs · 11.0%', 'Chris Taylor Central · 772K subs · 11.1%'].map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: i === 0 ? 'rgba(255,215,0,0.06)' : 'transparent', borderRadius: 8, padding: '6px 10px' }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${i === 0 ? '#FFD700' : '#333'}`, background: i === 0 ? '#FFD700' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {i === 0 && <span style={{ color: '#000', fontSize: 10, fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ color: i === 0 ? '#f0f0f0' : '#555', fontSize: 12 }}>{c}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: '03',
    title: 'Auto-Match Sponsors',
    desc: 'System instantly suggests 20+ matching sponsors for your niche. See typical budgets, past campaigns. Add or bring your own.',
    preview: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[['Nvidia', '$10K–$100K'], ['Squarespace', '$2K–$15K'], ['NordVPN', '$3K–$30K']].map(([name, budget]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', border: '1px solid #1a1a1a', borderRadius: 8, padding: '8px 12px' }}>
            <span style={{ color: '#d0d0d0', fontSize: 13, fontWeight: 600 }}>{name}</span>
            <span style={{ color: '#FFD700', fontSize: 12 }}>{budget}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: '04',
    title: 'Generate Email Templates',
    desc: 'AI creates 3 ready-to-send emails: pitch to creator, pitch to sponsor, and a 5-day follow-up. Edit or send as-is.',
    preview: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {['Email to creator', 'Email to sponsor', 'Follow-up (day 5)'].map((e, i) => (
          <div key={i} style={{ background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.1)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#888', fontSize: 12 }}>{e}</span>
            <span style={{ color: '#FFD700', fontSize: 11, fontWeight: 600 }}>Ready</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: '05',
    title: 'Send to Everyone',
    desc: 'One button sends all emails to all creators and all sponsors simultaneously. Every send is tracked automatically.',
    preview: (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ background: 'linear-gradient(135deg, #FFD700, #FFC700)', borderRadius: 10, padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: 8, color: '#000', fontWeight: 800, fontSize: 14 }}>
          <Send size={14} /> Send all emails
        </div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 16 }}>
          {[['12', 'Creators'], ['8', 'Sponsors']].map(([n, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ color: '#FFD700', fontWeight: 800, fontSize: 20 }}>{n}</div>
              <div style={{ color: '#444', fontSize: 11 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    num: '06',
    title: 'AI Helps You Respond',
    desc: 'When a reply comes in, AI reads it and suggests the perfect closing response. Edit or send with one click.',
    preview: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ background: '#0f0f0f', border: '1px solid #1f1f1f', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#666' }}>
          <span style={{ color: '#888' }}>Sponsor reply:</span> &ldquo;We need more engagement data...&rdquo;
        </div>
        <div style={{ background: 'rgba(102,126,234,0.08)', border: '1px solid rgba(102,126,234,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#a5b4fc' }}>
          <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Sparkles size={11} /> AI suggests:</span> &ldquo;Here&apos;s how to respond and close this...&rdquo;
        </div>
      </div>
    ),
  },
  {
    num: '07',
    title: 'Close the Deal',
    desc: 'Track every deal through the pipeline. Prospects → Interested → Negotiating → Closed. Export campaign reports in one click.',
    preview: (
      <div style={{ display: 'flex', gap: 6 }}>
        {[['Prospects', '24', '#333'], ['Interested', '8', '#667eea'], ['Negotiating', '3', '#FFD700'], ['Won', '2', '#4ade80']].map(([label, n, color]) => (
          <div key={label as string} style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: `1px solid ${color}22`, borderRadius: 8, padding: '8px 4px' }}>
            <div style={{ color: color as string, fontWeight: 800, fontSize: 18 }}>{n}</div>
            <div style={{ color: '#444', fontSize: 10, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
    ),
  },
]

export default function SolutionSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="how-it-works" className="section" ref={ref} style={{ background: '#0a0a0a' }}>
      <div className="divider-gold" style={{ marginBottom: 100 }} />
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="badge-gold" style={{ marginBottom: 20, display: 'inline-flex' }}>How It Works</span>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3.25rem)', fontWeight: 900, color: '#ffffff', marginBottom: 16, letterSpacing: '-0.025em' }}>
            Your complete IMA workflow.<br />
            <span className="gold-text">Automated.</span>
          </h2>
          <p style={{ color: '#666', fontSize: '1.125rem' }}>
            7 steps. 80 hours saved. Infinite deals closed.
          </p>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
                background: '#0f0f0f', border: '1px solid #1a1a1a',
                borderRadius: 16, overflow: 'hidden',
              }}
            >
              <div style={{ padding: '32px 36px', borderRight: '1px solid #1a1a1a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FFD700', letterSpacing: '0.15em' }}>{step.num}</span>
                  <div style={{ height: 1, flex: 1, background: 'rgba(255,215,0,0.15)' }} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: 10, letterSpacing: '-0.01em' }}>
                  {step.title}
                </h3>
                <p style={{ color: '#666', fontSize: '0.9375rem', lineHeight: 1.65 }}>{step.desc}</p>
              </div>
              <div style={{ padding: '32px 36px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ width: '100%' }}>{step.preview}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
