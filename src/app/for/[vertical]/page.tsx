import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check } from 'lucide-react'
import { VERTICALS, verticalBySlug } from '@/lib/verticals'

// ICP expansion (GTM plan §PHASE 3): one landing page per vertical, driven by
// the shared verticals config. These exist to TEST DEMAND — outreach for a
// vertical points here; if that vertical books demos, its module gets built.

export function generateStaticParams() {
  return Object.values(VERTICALS).map(v => ({ vertical: v.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ vertical: string }> }): Promise<Metadata> {
  const { vertical } = await params
  const v = verticalBySlug(vertical)
  if (!v) return { title: 'Prov' }
  return { title: `${v.headline} — Prov`, description: v.subheadline }
}

export default async function VerticalLanding({ params }: { params: Promise<{ vertical: string }> }) {
  const { vertical } = await params
  const v = verticalBySlug(vertical)
  if (!v) notFound()

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '60px 24px 100px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f5f5f5', textDecoration: 'none' }}>
            Pr<span style={{ color: '#FFD700' }}>o</span>v
          </Link>
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{
            display: 'inline-block', padding: '6px 14px', borderRadius: 999, marginBottom: 22,
            border: '1px solid rgba(255,215,0,0.35)', color: '#FFD700', fontSize: '0.75rem',
            fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            {v.label}
          </span>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.8rem, 5vw, 3rem)', letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 18 }}>
            {v.headline}
          </h1>
          <p style={{ color: '#999', fontSize: '1.1rem', maxWidth: 620, margin: '0 auto 30px', lineHeight: 1.65 }}>
            {v.subheadline}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/demo" className="btn-gold" style={{ padding: '14px 28px' }}>
              Book a 15-min walkthrough
            </Link>
            <Link href="/plans" className="btn-outline-gold" style={{ padding: '14px 28px' }}>
              See pricing
            </Link>
          </div>
        </div>

        {/* Pains */}
        <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.3rem', textAlign: 'center', marginBottom: 24 }}>
          Sound familiar?
        </h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 64 }}>
          {v.pains.map(p => (
            <div key={p.title} style={{ flex: 1, minWidth: 260, background: '#101010', border: '1px solid #1f1f1f', borderRadius: 14, padding: 22 }}>
              <div style={{ color: '#e8e8e8', fontWeight: 700, marginBottom: 8 }}>{p.title}</div>
              <div style={{ color: '#777', fontSize: '0.875rem', lineHeight: 1.6 }}>{p.detail}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.3rem', textAlign: 'center', marginBottom: 24 }}>
          What Prov replaces it with
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640, margin: '0 auto 64px' }}>
          {v.features.map(f => (
            <div key={f.title} style={{ display: 'flex', gap: 14, background: '#101010', border: '1px solid #1f1f1f', borderRadius: 14, padding: '18px 20px' }}>
              <span style={{ display: 'grid', placeContent: 'center', width: 22, height: 22, borderRadius: '50%', background: '#FFD700', color: '#0a0a0a', flexShrink: 0, marginTop: 2 }}>
                <Check size={13} strokeWidth={3} />
              </span>
              <div>
                <div style={{ color: '#e8e8e8', fontWeight: 700, fontSize: '0.95rem' }}>{f.title}</div>
                <div style={{ color: '#777', fontSize: '0.85rem', lineHeight: 1.6, marginTop: 3 }}>{f.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Close */}
        <div style={{
          textAlign: 'center', borderRadius: 18, padding: '40px 28px',
          border: '1px solid rgba(255,215,0,0.25)',
          background: 'linear-gradient(135deg, rgba(255,215,0,0.05), #121110 60%)',
        }}>
          <h2 style={{ color: '#fff', fontWeight: 900, fontSize: '1.5rem', marginBottom: 10 }}>
            See it on your real workflow.
          </h2>
          <p style={{ color: '#888', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.6 }}>
            15 minutes, your {v.dealNoun}s, not a canned demo. If it doesn&apos;t fit how you work, you&apos;ll know fast.
          </p>
          <Link href="/demo" className="btn-gold" style={{ padding: '14px 32px' }}>
            Book a walkthrough
          </Link>
        </div>
      </div>
    </div>
  )
}
