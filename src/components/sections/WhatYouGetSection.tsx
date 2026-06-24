'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Users, Hash, Mail, RefreshCw, Globe, Shield } from 'lucide-react'

const FEATURES = [
  { icon: Users, title: '500+ verified creators', detail: '50K to 1M+ subscribers. Only creators with 50K+ views per video make the cut.', gold: true },
  { icon: Hash, title: '10 niches covered', detail: 'Tech, Beauty, Fitness, Gaming, Food, Travel, Finance, Fashion, Lifestyle, Business, Education.', gold: false },
  { icon: Mail, title: 'Verified business emails', detail: 'Every email manually verified. Zero bounces. Paste directly into your outreach tool.', gold: true },
  { icon: RefreshCw, title: 'Updated every month', detail: 'New creators added monthly. Metrics refreshed. You always have current data.', gold: false },
  { icon: Globe, title: 'All major platforms', detail: 'YouTube, TikTok, Instagram, Twitch, LinkedIn. Where creators actually are.', gold: false },
  { icon: Shield, title: 'Nothing you don\'t need', detail: 'No bloated CRM. No AI fluff. Just the database, fast search, and one-click copy.', gold: true },
]

const NICHES = ['Tech', 'Beauty', 'Fitness', 'Gaming', 'Food', 'Travel', 'Finance', 'Fashion', 'Lifestyle', 'Business', 'Education']

export default function WhatYouGetSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="section" ref={ref} style={{ background: '#0a0a0a' }}>
      <div className="divider-gold" style={{ marginBottom: 100 }} />
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="badge-gold" style={{ marginBottom: 20, display: 'inline-flex' }}>What&apos;s inside</span>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 800, color: '#f5f5f5', marginBottom: 16, letterSpacing: '-0.02em' }}>
            Everything an agency needs.<br />
            <span className="gold-text">Nothing you don&apos;t.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              style={{
                background: f.gold ? 'linear-gradient(135deg, rgba(255,215,0,0.05), rgba(255,215,0,0.02))' : '#111',
                border: f.gold ? '1px solid rgba(255,215,0,0.18)' : '1px solid #1f1f1f',
                borderRadius: 14, padding: 28,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: f.gold ? 'rgba(255,215,0,0.12)' : 'rgba(102,126,234,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <f.icon size={18} style={{ color: f.gold ? '#FFD700' : '#a78bfa' }} />
              </div>
              <h3 style={{ fontWeight: 700, color: '#f5f5f5', marginBottom: 8, fontSize: '1rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.875rem', color: '#666', lineHeight: 1.6 }}>{f.detail}</p>
            </motion.div>
          ))}
        </div>

        {/* Niche pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={{ textAlign: 'center' }}
        >
          <p style={{ fontSize: '0.8125rem', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>
            All 11 niches
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {NICHES.map(n => (
              <span key={n} style={{
                padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                background: 'rgba(255,215,0,0.06)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.15)',
              }}>{n}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
