'use client'

import Link from 'next/link'
import { Hero } from '@/components/ui/hero-1'
import ProvIntroOverlay from '@/components/prov-intro-overlay'

export default function HeroSection() {
  return (
    <div style={{ position: 'relative' }}>
      {/* The real hero (hero-1 prompt component, recolored) */}
      <Hero
        eyebrow="The only end-to-end IMA automation tool"
        eyebrowHref="/how-it-works"
        title={<>Agency Founder, Stop Working Like a <span className="gold-text">Data Clerk.</span></>}
        subtitle="Prov automates discovery, sponsor matching, outreach, and deal-closing AI. You stay the founder, not the data clerk."
        ctaLabel="Request a demo"
        ctaHref="/demo"
      />

      {/* The intro animation plays on top, then fades to reveal the hero */}
      <ProvIntroOverlay />

      {/* Log in — stays above everything, always clickable */}
      <Link href="/login"
        style={{ position: 'absolute', top: 20, right: 20, zIndex: 70, fontSize: 13, fontWeight: 600, color: '#cfcfcf', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '8px 16px', textDecoration: 'none', backdropFilter: 'blur(8px)' }}>
        Log in
      </Link>
    </div>
  )
}
