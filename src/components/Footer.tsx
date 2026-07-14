'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid #1a1a1a', background: '#0a0a0a', padding: '56px 0 32px' }}>
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div style={{ marginBottom: 12 }}>
              <Image src="/logo.png" alt="Prov" width={90} height={36} style={{ objectFit: 'contain' }} />
            </div>
            <p style={{ color: '#555', fontSize: '0.9375rem', maxWidth: 320, lineHeight: 1.7 }}>
              The creator database built for influencer marketing agencies. 500+ verified contacts across 11 niches.
            </p>
          </div>
          <div>
            <p style={{ color: '#333', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Product</p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['Dashboard', '/dashboard'], ['Pricing', '#pricing'], ['Security', '/security'], ['Request a demo', '/demo']].map(([l, h]) => (
                <li key={l}><Link href={h} style={{ color: '#555', fontSize: '0.9375rem', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f5f5f5')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#555')}>{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p style={{ color: '#333', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Company</p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['About', '#'], ['FAQ', '#faq'], ['Contact', 'mailto:providemediabrands@gmail.com']].map(([l, h]) => (
                <li key={l}><Link href={h} style={{ color: '#555', fontSize: '0.9375rem', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f5f5f5')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#555')}>{l}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 28, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <p style={{ color: '#333', fontSize: '0.8125rem' }}>© {new Date().getFullYear()} Prov. All rights reserved.</p>
          <div style={{ display: 'flex', gap: 24 }}>
            {[['Privacy Policy', '/privacy'], ['Terms of Service', '/terms']].map(([t, href]) => (
              <Link key={t} href={href} style={{ color: '#333', fontSize: '0.8125rem', textDecoration: 'none' }}>{t}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
