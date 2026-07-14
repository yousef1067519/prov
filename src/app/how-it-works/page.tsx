import Link from 'next/link'
import type { Metadata } from 'next'
import {
  Search, Sparkles, Building2, Mail, Send, FileSignature, Users, Receipt,
  BarChart3, FileBarChart, Palette, Plug, ArrowRight, Check, Clock, ChevronLeft,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'How Prov works — The complete IMA platform',
  description: 'See exactly what Prov does: discover creators, match sponsors, send AI outreach from your Gmail, close deals with e-signed contracts, and report to clients — the full influencer-agency workflow in one place.',
}

const STEPS = [
  { n: '01', Icon: Search, title: 'Discover the right creators', body: 'Search a live database of influencers by niche, platform, follower and view ranges, engagement, country and language — or just describe who you want in plain English and let AI find them. Every creator has a profile with follower/engagement trends and an estimated rate.' },
  { n: '02', Icon: Building2, title: 'Match them to sponsors', body: 'Prov pairs your selected creators with relevant brands and sponsors, so you walk into every conversation with a deal already shaped — not a cold guess.' },
  { n: '03', Icon: Mail, title: 'Generate personalized outreach', body: 'Pick from proven cold-outreach strategies; Prov writes a tailored email for every creator and sponsor with their name, niche and numbers filled in. Your agency branding and signature are added automatically.' },
  { n: '04', Icon: Send, title: 'Send from your own Gmail & track', body: 'Connect your Gmail and send real emails that land in inboxes from your own address. Track opens, replies and the whole conversation, with AI-suggested responses to move deals forward.' },
  { n: '05', Icon: FileSignature, title: 'Close, sign & get paid', body: 'Generate legally-binding contracts with electronic acceptance (“reply I AGREE”), manage every deal in your CRM pipeline, send invoices, and watch revenue land in your analytics.' },
]

const FEATURES = [
  { Icon: Sparkles, title: 'AI Creator Discovery', body: 'Natural-language search that ranks the best-fit creators with match scores.' },
  { Icon: BarChart3, title: 'Performance tracking', body: 'Follower, view and engagement trends plus estimated CPM for every creator.' },
  { Icon: Building2, title: 'Sponsor matching', body: 'Pair creators with brands that actually fit their audience and niche.' },
  { Icon: Mail, title: 'Outreach + Gmail send', body: 'Multi-strategy templates, per-creator personalization, sent from your inbox.' },
  { Icon: FileSignature, title: 'Contracts & e-signature', body: 'Standard clauses + “reply I AGREE” acceptance that’s legally binding.' },
  { Icon: Users, title: 'CRM pipeline', body: 'Every brand and deal tracked from prospect to active client.' },
  { Icon: Receipt, title: 'Invoices', body: 'Bill clients and track paid, sent and overdue amounts.' },
  { Icon: FileBarChart, title: 'PDF reports', body: 'One-click campaign reports with charts, ROI and your branding.' },
  { Icon: Users, title: 'Client portals', body: 'Give clients a private link to track progress and approve content.' },
  { Icon: Palette, title: 'White labeling', body: 'Rebrand the whole platform — name, logo and colors — as your own.' },
  { Icon: BarChart3, title: 'Real analytics', body: 'Live, per-account numbers on outreach, replies, deals and revenue.' },
  { Icon: Plug, title: 'Integrations', body: 'Slack, Zapier and Google Calendar wired into your workflow.' },
]

const VALUE = [
  'Replaces hours of manual spreadsheet and prospecting work',
  'Run unlimited campaigns and contact unlimited creators',
  'Send outreach from your own Gmail for real deliverability',
  'Close deals with contracts, CRM, invoices and analytics built in',
  'Look like an enterprise agency with reports, client portals & white labeling',
]

export default function HowItWorksPage() {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#f5f5f5' }}>
      {/* Top bar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #161616' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#cfcfcf', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
            <ChevronLeft size={16} /> Back to Prov
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/login" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>Log in</Link>
            <Link href="/demo" className="btn-gold" style={{ padding: '8px 16px', fontSize: '0.8125rem' }}>Request a demo</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="section" style={{ paddingTop: 72, paddingBottom: 24, textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <span className="badge-gold" style={{ marginBottom: 22, display: 'inline-flex' }}>The complete IMA platform</span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 18 }}>
            Everything an influencer agency does,<br /><span className="gold-text">in one platform.</span>
          </h1>
          <p style={{ color: '#888', fontSize: '1.125rem', lineHeight: 1.6, maxWidth: 620, margin: '0 auto' }}>
            Prov takes you from “who do I even contact?” to a signed, paid deal — discovery, outreach, contracts and reporting, all automated. Here’s exactly what you’re paying for.
          </p>
        </div>
      </section>

      {/* Workflow */}
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container" style={{ maxWidth: 880 }}>
          <div className="divider-gold" style={{ marginBottom: 48 }} />
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 8, textAlign: 'center' }}>
            The workflow, end to end
          </h2>
          <p style={{ color: '#666', textAlign: 'center', marginBottom: 44 }}>Five steps. Every one automated by Prov.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {STEPS.map(s => (
              <div key={s.n} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 16, padding: '26px 28px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <s.Icon size={20} style={{ color: '#FFD700' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FFD700', letterSpacing: '0.12em' }}>{s.n}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1875rem', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.01em' }}>{s.title}</h3>
                  <p style={{ color: '#888', fontSize: '0.9375rem', lineHeight: 1.7 }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Everything included */}
      <section className="section" style={{ paddingTop: 56 }}>
        <div className="container">
          <div className="divider-gold" style={{ marginBottom: 48 }} />
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 8, textAlign: 'center' }}>
            Everything included
          </h2>
          <p style={{ color: '#666', textAlign: 'center', marginBottom: 44 }}>One subscription. Every tool an agency needs.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,215,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <f.Icon size={18} style={{ color: '#FFD700' }} />
                </div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 6 }}>{f.title}</h3>
                <p style={{ color: '#777', fontSize: '0.8125rem', lineHeight: 1.6 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you're paying for */}
      <section className="section" style={{ paddingTop: 56, paddingBottom: 90 }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="divider-gold" style={{ marginBottom: 48 }} />
          <div style={{ background: 'linear-gradient(160deg, #121212, #0d0d0d)', border: '1px solid #1f1f1f', borderRadius: 20, padding: '40px 36px', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 8 }}>What you’re paying for</h2>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, margin: '18px 0 6px' }}>
              <span style={{ fontSize: '3rem', fontWeight: 900, color: '#FFD700', fontFamily: 'var(--font-display)', lineHeight: 1 }}>$299</span>
              <span style={{ color: '#777' }}>/ month</span>
            </div>
            <p style={{ color: '#888', fontSize: '0.9375rem', marginBottom: 26, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} style={{ color: '#FFD700' }} /> Start with a free month — no charge until it ends.
            </p>

            <div style={{ textAlign: 'left', maxWidth: 520, margin: '0 auto 30px' }}>
              {VALUE.map(v => (
                <div key={v} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0' }}>
                  <Check size={16} style={{ color: '#00D084', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ color: '#cfcfcf', fontSize: '0.9375rem' }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/demo" className="btn-gold" style={{ padding: '13px 26px', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Request a demo <ArrowRight size={18} />
              </Link>
              <Link href="/buy" className="btn-outline-gold" style={{ padding: '13px 26px', fontSize: '1rem' }}>
                Subscribe now
              </Link>
            </div>
          </div>

          <p style={{ textAlign: 'center', color: '#555', fontSize: '0.8125rem', marginTop: 24 }}>
            Questions? <Link href="/" style={{ color: '#888' }}>Back to the homepage</Link>
          </p>
        </div>
      </section>
    </div>
  )
}
