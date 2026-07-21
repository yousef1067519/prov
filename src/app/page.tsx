import LandingNav from '@/components/landing/LandingNav'
import AgencyIntro from '@/components/AgencyIntro'
import { SplineScene } from '@/components/ui/spline'
import AgentGraph from '@/components/landing/AgentGraph'
import FeatureRows from '@/components/landing/FeatureRows'
import { SectionLabel, HeroInput, StatCard, FAQItem, CtaBand } from '@/components/landing/LandingBits'
import PricingSection from '@/components/sections/PricingSection'
import Footer from '@/components/Footer'

// Landing rebuilt in the pipeline aesthetic (ENTERPRISE §2/§8.10 + redesign
// brief): dark terminal-inflected surfaces, mono status labels, Prov gold
// accents, sales-led CTAs. The cinematic animated hero and fake social proof
// sections were retired with the self-serve funnel.

// Product-true numbers only — no invented social proof.
const STATS: Array<{ value: number; suffix?: string; label: string }> = [
  { value: 7, label: 'pipeline stages run end to end, from brief intake to banked intelligence' },
  { value: 12, label: 'contract clause blocks, from FTC disclosure to kill fees — editable, versioned, merged from the deal' },
  { value: 5, label: 'access roles enforced in the database, down to which clients each viewer can see' },
  { value: 100, suffix: '%', label: 'of completed deals written to intelligence your agency owns, forever' },
]

// PLACEHOLDERS — real quotes only, per the no-fabricated-testimonials rule.
// Fill with { quote, handle, source } from pilot agencies; renders only when filled.
const TESTIMONIALS: Array<{ quote: string; handle: string; source: string }> = []

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'What does Prov actually do?',
    a: 'Prov runs the creator-sponsorship pipeline for influencer marketing agencies: curated creator discovery, sponsor matching, team-approved outreach, contract generation, invoicing, FTC compliance tracking, and deal tracking. Every completed deal is written to a permanent intelligence record your agency can search.',
  },
  {
    q: 'Who is it for?',
    a: 'Established agencies and brand marketing teams — typically 5 to 50 people managing multiple client brands. If your process lives in spreadsheets, inboxes, and one senior employee’s head, Prov is built for exactly that.',
  },
  {
    q: 'How is access controlled?',
    a: 'Five roles — owner, admin, account manager, analyst, and client viewer — enforced with row-level security in the database, not just hidden in the interface. Client viewers only ever see the clients they’re granted. Contract, invoice, compliance, and role changes are all written to an audit log.',
  },
  {
    q: 'How does pricing work?',
    a: 'Sales-led, in two tiers: Growth Agency and Enterprise (custom). You get the exact price in writing before you commit, and it never increases on you — that promise has been part of Prov from the start.',
  },
  {
    q: 'Who owns our data?',
    a: 'You do. Deal records, contracts, and intelligence belong to your agency; full export is available at any time, and nothing is retained after a contracted offboarding. We don’t sell your data or train models on your private records.',
  },
  {
    q: 'Does Prov replace account managers?',
    a: 'No — it multiplies them. Each account manager runs two to three times more creator relationships because research, drafting, paperwork, and record-keeping are standardized and automated. Judgment stays human.',
  },
]

export default function HomePage() {
  return (
    <>
      <AgencyIntro />
      <LandingNav />
      <main style={{ background: 'var(--lp-bg)' }}>
        {/* ── Hero ── */}
        <section style={{ padding: '150px 24px 90px', position: 'relative', overflow: 'hidden' }}>
          {/* single restrained glow, not a cinematic sequence */}
          <div aria-hidden style={{ position: 'absolute', top: -260, left: '50%', transform: 'translateX(-50%)', width: 900, height: 500, background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.07), transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)', gap: 56, alignItems: 'center' }} className="lp-hero-grid">
            <div>
              <div className="lp-label" style={{ marginBottom: 20 }}>▸ live pipeline</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.1rem, 4.8vw, 3.4rem)', fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.08, marginBottom: 20 }}>
                The fastest path from brief to booked creator.
              </h1>
              <p style={{ color: '#8a8a92', fontSize: '1.05rem', lineHeight: 1.65, maxWidth: 520, marginBottom: 30 }}>
                Prov runs your sponsorship pipeline — research, outreach, contracts,
                compliance — and turns every completed deal into intelligence your
                agency owns. Not another inbox. An operating system for deals.
              </p>
              <HeroInput />
            </div>
            {/* Interactive 3D robot — replaces the pipeline panel as the hero visual */}
            <div style={{ position: 'relative', height: 520, width: '100%' }} className="lp-hero-robot">
              <SplineScene
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="h-full w-full"
              />
            </div>
          </div>
          <style>{`
            @media (max-width: 960px) { .lp-hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; } }
          `}</style>
        </section>

        {/* ── How prov works: agent graph ── */}
        <section id="pipeline" style={{ padding: '90px 24px', borderTop: '1px solid var(--lp-hairline)' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <SectionLabel>how prov works</SectionLabel>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3.4vw, 2.2rem)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 10 }}>
              One brief in. One banked deal out.
            </h2>
            <p style={{ color: '#8a8a92', fontSize: '0.98rem', maxWidth: 560, marginBottom: 44, lineHeight: 1.65 }}>
              Seven stages, each with a specialist behind it. Hover a node to see
              what it does — this is the product’s real execution order, not a metaphor.
            </p>
            <AgentGraph />
          </div>
        </section>

        {/* ── Feature rows ── */}
        <FeatureRows />

        {/* ── By the numbers (product facts, not vanity metrics) ── */}
        <section style={{ padding: '90px 24px', borderTop: '1px solid var(--lp-hairline)' }}>
          <div style={{ maxWidth: 1020, margin: '0 auto' }}>
            <SectionLabel>by the numbers</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {STATS.map(s => <StatCard key={s.label} {...s} />)}
            </div>
          </div>
        </section>

        {/* ── Testimonials: renders only when real quotes exist ── */}
        {TESTIMONIALS.length > 0 && (
          <section style={{ padding: '90px 24px', borderTop: '1px solid var(--lp-hairline)' }}>
            <div style={{ maxWidth: 1020, margin: '0 auto' }}>
              <SectionLabel>built with agencies</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                {TESTIMONIALS.map(t => (
                  <figure key={t.handle} className="lp-card" style={{ padding: 24, margin: 0 }}>
                    <blockquote style={{ color: '#d8d8de', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>&ldquo;{t.quote}&rdquo;</blockquote>
                    <figcaption className="lp-mono" style={{ marginTop: 14, fontSize: '0.72rem', color: '#ffd700' }}>
                      {t.handle} <span style={{ color: '#55555c' }}>· {t.source}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Pricing (enterprise tiers, sales-led) ── */}
        <PricingSection />

        {/* ── FAQ ── */}
        <section style={{ padding: '90px 24px', borderTop: '1px solid var(--lp-hairline)' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <SectionLabel>questions</SectionLabel>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 28 }}>
              Asked by every agency we talk to.
            </h2>
            <div style={{ borderTop: '1px solid var(--lp-hairline)' }}>
              {FAQS.map(f => <FAQItem key={f.q} {...f} />)}
            </div>
          </div>
        </section>

        <CtaBand />
      </main>
      <Footer />
    </>
  )
}
