'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

// Marketing nav: real destinations only (no dead Docs/About links).
const LINKS: Array<[string, string]> = [
  ['Product', '#features'],
  ['How it works', '#pipeline'],
  ['Pricing', '#pricing'],
  ['Security', '/security'],
]

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: scrolled ? 'rgba(10,10,12,0.85)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: `1px solid ${scrolled ? 'var(--lp-hairline)' : 'transparent'}`,
      transition: 'background .25s, border-color .25s',
    }}>
      <nav style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 26, padding: '14px 24px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Prov" width={26} height={26} style={{ borderRadius: 6 }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff', fontSize: '1.05rem', letterSpacing: '-0.01em' }}>Prov</span>
        </Link>
        <div className="lp-nav-links" style={{ display: 'flex', gap: 22, marginLeft: 10 }}>
          {LINKS.map(([label, href]) => (
            <Link key={label} href={href} style={{ color: '#9a9aa2', fontSize: '0.875rem', textDecoration: 'none' }}>
              {label}
            </Link>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/login" style={{ color: '#9a9aa2', fontSize: '0.875rem', textDecoration: 'none' }}>Sign in</Link>
          <Link href="/demo" className="btn-gold" style={{ padding: '9px 16px', fontSize: '0.85rem' }}>
            Request demo <ArrowRight size={14} />
          </Link>
        </div>
      </nav>
      <style>{`
        @media (max-width: 760px) { .lp-nav-links { display: none !important; } }
      `}</style>
    </header>
  )
}
