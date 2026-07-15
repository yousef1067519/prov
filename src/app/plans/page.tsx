import type { Metadata } from 'next'
import Link from 'next/link'
import { Check } from 'lucide-react'

export const metadata: Metadata = { title: 'Choose your plan — Prov' }

// Plan chooser. Signed-in users without an active plan land here (from the
// dashboard/proxy gates) instead of being bounced to the marketing page.

const GROWTH = [
  ['Up to 10 client workspaces & 15 team seats', 'Run every brand you manage in one place, with per-client scoping.'],
  ['Creator discovery + your own contact imports', 'Search our vetted catalog with quality scores, or bring your own spreadsheet rolodex.'],
  ['Pipeline CRM & team-approved outreach', 'Deals move sourced → outreach → negotiating → live; everyone sends the same approved sequences from their own Gmail.'],
  ['Contracts, invoices & FTC compliance', 'Clause-based contracts, sequential finance-grade invoices, disclosure proof stored per deliverable.'],
  ['Institutional memory', 'Every completed deal becomes permanent, searchable intelligence your agency owns — it never walks out the door with a departing account manager.'],
  ['White-label reports & client portal', 'Your branding on everything clients see.'],
] as const

const ENTERPRISE = [
  ['Unlimited clients & seats', 'No workspace or team caps.'],
  ['Everything in Growth Agency', 'The full platform, at scale.'],
  ['SSO & advanced access controls', 'Enterprise sign-on plus granular, per-client role grants.'],
  ['Full audit trail & compliance exports', 'Every contract, invoice, and role change logged and exportable.'],
  ['Dedicated success manager', 'Provisioned onboarding, migration from your spreadsheets, and priority support.'],
  ['Custom integrations & data residency', 'Built around your stack and requirements.'],
] as const

function PlanCard({ name, price, tagline, rows, cta, href, highlighted, note }: {
  name: string; price: string; tagline: string
  rows: ReadonlyArray<readonly [string, string]>
  cta: string; href: string; highlighted?: boolean; note: string
}) {
  return (
    <div style={{
      flex: 1, minWidth: 300, borderRadius: 18, padding: 28,
      border: `1px solid ${highlighted ? 'rgba(255,215,0,0.35)' : '#1f1f1f'}`,
      background: highlighted ? 'linear-gradient(135deg, rgba(255,215,0,0.05), #121110 60%)' : '#101010',
    }}>
      <h2 style={{ color: '#f5f5f5', fontWeight: 800, fontSize: '1.15rem' }}>{name}</h2>
      <div style={{ color: '#FFD700', fontWeight: 800, fontSize: '2.2rem', margin: '10px 0 4px', fontFamily: 'var(--font-display)' }}>{price}</div>
      <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: 22 }}>{tagline}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 26 }}>
        {rows.map(([title, detail]) => (
          <div key={title} style={{ display: 'flex', gap: 10 }}>
            <span style={{ display: 'grid', placeContent: 'center', width: 18, height: 18, borderRadius: '50%', background: '#FFD700', color: '#0a0a0a', flexShrink: 0, marginTop: 2 }}>
              <Check size={11} strokeWidth={3} />
            </span>
            <div>
              <div style={{ color: '#e8e8e8', fontSize: '0.9rem', fontWeight: 600 }}>{title}</div>
              <div style={{ color: '#777', fontSize: '0.8rem', lineHeight: 1.55, marginTop: 2 }}>{detail}</div>
            </div>
          </div>
        ))}
      </div>
      <Link href={href} className={highlighted ? 'btn-gold' : 'btn-outline-gold'}
        style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '13px' }}>
        {cta}
      </Link>
      <p style={{ color: '#555', fontSize: '0.75rem', textAlign: 'center', marginTop: 12 }}>{note}</p>
    </div>
  )
}

const CHECKOUT_ERRORS: Record<string, string> = {
  unavailable: 'Checkout is not configured yet — the plan price is missing on the server. If you run Prov, set STRIPE_GROWTH_PRICE_ID in the deployment environment.',
  checkout: 'We couldn’t start checkout just now. Try again in a minute, or request a demo and we’ll set you up directly.',
}

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams
  const checkoutError = e ? CHECKOUT_ERRORS[e] : null
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '60px 24px 100px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <Link href="/" style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f5f5f5', textDecoration: 'none' }}>
            Pr<span style={{ color: '#FFD700' }}>o</span>v
          </Link>
        </div>
        {checkoutError && (
          <div style={{ maxWidth: 640, margin: '0 auto 26px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', color: '#f8b4b4', fontSize: '0.875rem', textAlign: 'center' }}>
            {checkoutError}
          </div>
        )}
        <h1 style={{ textAlign: 'center', color: '#fff', fontWeight: 900, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', letterSpacing: '-0.02em', marginBottom: 10 }}>
          Choose your plan
        </h1>
        <p style={{ textAlign: 'center', color: '#888', maxWidth: 560, margin: '0 auto 44px', lineHeight: 1.65 }}>
          Your account is ready — pick how you want to run Prov. The price you sign is the
          price you keep: it never increases on you. Cancel anytime.
        </p>

        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'stretch' }}>
          <PlanCard
            name="Growth Agency"
            price="$2,000/mo"
            tagline="For agencies running up to 10 client brands. Start today — no sales call required."
            rows={GROWTH}
            cta="Subscribe & start now"
            href="/api/stripe/checkout?plan=growth"
            highlighted
            note="Secure checkout via Stripe · cancel anytime · no setup fees"
          />
          <PlanCard
            name="Enterprise"
            price="Custom"
            tagline="Multi-team agencies and brand marketing orgs with custom requirements."
            rows={ENTERPRISE}
            cta="Talk to us"
            href="/demo"
            note="We reply within one business day"
          />
        </div>

        <p style={{ textAlign: 'center', color: '#555', fontSize: '0.85rem', marginTop: 34 }}>
          Not sure yet? <Link href="/demo" style={{ color: '#FFD700' }}>Request a demo</Link> and
          we&apos;ll walk through Prov on your agency&apos;s real workflow first.
        </p>
      </div>
    </div>
  )
}
