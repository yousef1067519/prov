'use client'

import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import Link from 'next/link'

// dark-gradient-pricing (from prompt) — recolored to the Prov dark/gold theme.

interface BenefitProps { text: string; checked: boolean }

function Benefit({ text, checked }: BenefitProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{
        display: 'grid', placeContent: 'center', width: 18, height: 18, borderRadius: '50%',
        background: checked ? '#FFD700' : 'rgba(255,255,255,0.06)',
        color: checked ? '#0a0a0a' : '#555',
      }}>
        {checked ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
      </span>
      <span style={{ fontSize: '0.875rem', color: checked ? '#cfcfcf' : '#666' }}>{text}</span>
    </div>
  )
}

export interface PricingCardProps {
  tier: string
  price: string
  bestFor: string
  CTA: string
  ctaHref?: string
  highlighted?: boolean
  benefits: BenefitProps[]
}

export function PricingCard({ tier, price, bestFor, CTA, ctaHref = '#', highlighted, benefits }: PricingCardProps) {
  return (
    <motion.div
      initial={{ filter: 'blur(2px)', opacity: 0.6 }}
      whileInView={{ filter: 'blur(0px)', opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: 'easeInOut', delay: 0.15 }}
      style={{ height: '100%' }}
    >
      <div style={{
        position: 'relative', height: '100%', width: '100%', overflow: 'hidden',
        borderRadius: 18, padding: 24,
        border: `1px solid ${highlighted ? 'rgba(255,215,0,0.35)' : '#1f1f1f'}`,
        background: highlighted
          ? 'linear-gradient(135deg, rgba(255,215,0,0.06), #121110 60%)'
          : 'linear-gradient(135deg, rgba(20,20,20,0.5), rgba(15,15,15,0.85))',
        boxShadow: highlighted ? '0 0 50px rgba(202,138,4,0.08)' : 'none',
      }}>
        {highlighted && (
          <span style={{ position: 'absolute', top: 16, right: 16, fontSize: 11, fontWeight: 700, color: '#0a0a0a', background: '#FFD700', borderRadius: 6, padding: '3px 9px' }}>Popular</span>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid #1f1f1f', paddingBottom: 24 }}>
          <span style={{ marginBottom: 18, color: '#e8e8e8', fontWeight: 600, letterSpacing: '0.02em' }}>{tier}</span>
          <span style={{ marginBottom: 10, fontSize: '2.75rem', fontWeight: 800, color: '#FFD700', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{price}</span>
          <span style={{ color: '#888', textAlign: 'center', fontSize: '0.875rem' }}>{bestFor}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '32px 0' }}>
          {benefits.map((b, i) => <Benefit key={i} {...b} />)}
        </div>
        <Link href={ctaHref} className={highlighted ? 'btn-gold' : 'btn-outline-gold'} style={{ width: '100%', display: 'flex', padding: '12px' }}>
          {CTA}
        </Link>
      </div>
    </motion.div>
  )
}
