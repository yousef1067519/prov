'use client'

// ▸ what you keep — five capability rows, each paired with a small honest
// mini-visual built from the product's real objects (no screenshots, no
// fabricated data). Motion budget was spent on the hero; these stay still.

import { SectionLabel } from './LandingBits'

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }

function Chip({ children, color = '#9a9aa2' }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ ...mono, fontSize: '0.62rem', color, border: `1px solid ${color}44`, background: `${color}11`, borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}
function MiniRow({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 12px', border: '1px solid var(--lp-hairline)', borderRadius: 8, background: 'rgba(255,255,255,0.015)' }}>
      <span style={{ ...mono, fontSize: '0.72rem', color: '#c8c8ce', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{left}</span>
      {right}
    </div>
  )
}

const FEATURES: Array<{ key: string; title: string; body: string; visual: React.ReactNode }> = [
  {
    key: 'research.creators',
    title: 'Curated discovery, not a firehose',
    body: 'Vetted creators with quality scores and audience-overlap warnings — so two shortlisted creators don’t reach the same audience, and two managers don’t pitch the same creator.',
    visual: (
      <div style={{ display: 'grid', gap: 8 }}>
        <MiniRow left="@marathon.mia" right={<Chip color="#5dd47a">quality 91 · vetted</Chip>} />
        <MiniRow left="@fitfuelfred" right={<Chip color="#ffca28">62% audience overlap</Chip>} />
      </div>
    ),
  },
  {
    key: 'draft.outreach',
    title: 'Outreach your whole team sends the same way',
    body: 'Approved sequences live at the workspace level. Managers send from the same messaging, and reply and win rates feed back into your intelligence.',
    visual: (
      <div style={{ display: 'grid', gap: 8 }}>
        <MiniRow left="warm-intro.v3 · 2 steps" right={<Chip color="#5dd47a">approved</Chip>} />
        <MiniRow left="cold-angle.v4 · 2 steps" right={<Chip>draft</Chip>} />
      </div>
    ),
  },
  {
    key: 'generate.contract',
    title: 'Contracts that survive a lawyer’s read',
    body: 'Editable clause blocks — deliverables, usage rights, FTC disclosure, kill fees — merged with the deal’s terms, versioned and approved internally before they’re sent.',
    visual: (
      <div style={{ display: 'grid', gap: 8 }}>
        <MiniRow left="06. FTC disclosure — first line of caption" right={<Chip color="#5dd47a">merged</Chip>} />
        <MiniRow left="08. Kill fee — 50% / 100% schedule" right={<Chip color="#5dd47a">merged</Chip>} />
      </div>
    ),
  },
  {
    key: 'track.deal',
    title: 'Invoices and compliance a CFO will trust',
    body: 'Sequential invoice numbers, exact cent math, your branding on every PDF — and disclosure proof stored per deliverable, so live-but-unverified deals are flagged before a regulator finds them.',
    visual: (
      <div style={{ display: 'grid', gap: 8 }}>
        <MiniRow left="INV-00041 · due Aug 11" right={<Chip>sent</Chip>} />
        <MiniRow left="YT integration · live 3 days" right={<Chip color="#ff6b6b">missing disclosure</Chip>} />
      </div>
    ),
  },
  {
    key: 'log.performance',
    title: 'Institutional memory that outlasts any hire',
    body: 'Every completed deal becomes a permanent, searchable record — which sponsors respond, which brands lowball, what actually converted. Owned by your agency, forever.',
    visual: (
      <div style={{ display: 'grid', gap: 8 }}>
        <MiniRow left={<>▸ “beauty creators under $5k, rated 4+”</>} right={<Chip>query</Chip>} />
        <MiniRow left="18 matching deal records · 3 repeat sponsors" />
      </div>
    ),
  },
]

export default function FeatureRows() {
  return (
    <section id="features" style={{ padding: '90px 24px', borderTop: '1px solid var(--lp-hairline)' }}>
      <div style={{ maxWidth: 1020, margin: '0 auto' }}>
        <SectionLabel>what your agency keeps</SectionLabel>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3.4vw, 2.2rem)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 54, maxWidth: 620 }}>
          Built for what established agencies actually lack.
        </h2>

        <div style={{ display: 'grid', gap: 64 }}>
          {FEATURES.map((f, i) => (
            <div key={f.key} className="lp-feature-row" style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center',
              direction: i % 2 ? 'rtl' : 'ltr',
            }}>
              <div style={{ direction: 'ltr' }}>
                <div className="lp-mono" style={{ fontSize: '0.7rem', color: '#ffd700', marginBottom: 10 }}>{f.key}</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: '#f0f0f0', marginBottom: 10, letterSpacing: '-0.01em' }}>{f.title}</h3>
                <p style={{ color: '#8a8a92', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: 460 }}>{f.body}</p>
              </div>
              <div className="lp-card" style={{ direction: 'ltr', padding: 18 }}>{f.visual}</div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 820px) {
          .lp-feature-row { grid-template-columns: 1fr !important; gap: 20px !important; direction: ltr !important; }
        }
      `}</style>
    </section>
  )
}
