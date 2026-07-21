'use client'

// ▸ what you keep — five capability cards. Redesigned from the old alternating
// mini-visual rows (too busy) into a clean icon-card grid that matches the hero
// robot's minimal dark/gold aesthetic. Headlines unchanged.

import { Search, Send, ScrollText, ShieldCheck, Brain } from 'lucide-react'
import { SectionLabel } from './LandingBits'

const FEATURES: Array<{ key: string; title: string; body: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }> = [
  {
    key: 'research.creators',
    title: 'Curated discovery, not a firehose',
    body: 'Vetted creators with quality scores and audience-overlap warnings — so two shortlisted creators don’t reach the same audience, and two managers don’t pitch the same creator.',
    Icon: Search,
  },
  {
    key: 'draft.outreach',
    title: 'Outreach your whole team sends the same way',
    body: 'Approved sequences live at the workspace level. Managers send from the same messaging, and reply and win rates feed back into your intelligence.',
    Icon: Send,
  },
  {
    key: 'generate.contract',
    title: 'Contracts that survive a lawyer’s read',
    body: 'Editable clause blocks — deliverables, usage rights, FTC disclosure, kill fees — merged with the deal’s terms, versioned and approved internally before they’re sent.',
    Icon: ScrollText,
  },
  {
    key: 'track.deal',
    title: 'Invoices and compliance a CFO will trust',
    body: 'Sequential invoice numbers, exact cent math, your branding on every PDF — and disclosure proof stored per deliverable, so live-but-unverified deals are flagged before a regulator finds them.',
    Icon: ShieldCheck,
  },
  {
    key: 'log.performance',
    title: 'Institutional memory that outlasts any hire',
    body: 'Every completed deal becomes a permanent, searchable record — which sponsors respond, which brands lowball, what actually converted. Owned by your agency, forever.',
    Icon: Brain,
  },
]

// `items` overrides the card text per vertical (icons assigned in order); the
// default five cards are the generic IMA-flavored set.
export default function FeatureRows({ items }: { items?: Array<{ title: string; body: string }> } = {}) {
  const cards = items
    ? items.map((it, i) => ({ key: `v.${i}`, title: it.title, body: it.body, Icon: FEATURES[i % FEATURES.length].Icon }))
    : FEATURES
  return (
    <section id="features" style={{ padding: '90px 24px', borderTop: '1px solid var(--lp-hairline)' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <SectionLabel>what your agency keeps</SectionLabel>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3.4vw, 2.2rem)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 48, maxWidth: 620 }}>
          Built for what established agencies actually lack.
        </h2>

        <div className="lp-feature-grid">
          {cards.map(({ key, title, body, Icon }) => (
            <div key={key} className="lp-feature-card">
              <div className="lp-feature-icon">
                <Icon size={20} strokeWidth={1.75} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.12rem', fontWeight: 700, color: '#f0f0f0', margin: '16px 0 8px', letterSpacing: '-0.01em' }}>{title}</h3>
              <p style={{ color: '#8a8a92', fontSize: '0.9rem', lineHeight: 1.65 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .lp-feature-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        /* Make the last two cards center-fill the second row nicely */
        .lp-feature-card {
          border: 1px solid var(--lp-hairline);
          border-radius: 14px;
          padding: 24px;
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0));
          transition: border-color .2s ease, transform .2s ease, background .2s ease;
        }
        .lp-feature-card:hover {
          border-color: rgba(255,215,0,0.28);
          transform: translateY(-2px);
          background: linear-gradient(180deg, rgba(255,215,0,0.04), rgba(255,255,255,0));
        }
        .lp-feature-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px; height: 40px;
          border-radius: 10px;
          color: #FFD700;
          background: rgba(255,215,0,0.08);
          border: 1px solid rgba(255,215,0,0.18);
        }
        @media (max-width: 900px) {
          .lp-feature-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .lp-feature-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  )
}
