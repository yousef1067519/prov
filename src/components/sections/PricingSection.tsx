'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { PricingCard } from '@/components/ui/dark-gradient-pricing'
import RedeemCode from '@/components/RedeemCode'

// ENTERPRISE (§7): sales-led tiers, configurable — not hardcoded checkout prices.
// The numbers here are positioning copy; actual contracts are set in the sales
// process. The transparent-pricing promise stays: the price you sign is the
// price you keep.
const TIERS = {
  starter: {
    name: 'Starter',
    price: '$75/mo',
    bestFor: 'Testing the waters — 300 outreach credits a day',
  },
  premium: {
    name: 'Premium',
    price: '$300/mo',
    bestFor: 'Independent influencer marketers — 1,500 credits a day',
  },
  growth: {
    name: 'Growth Agency',
    price: '$2,000/mo',
    bestFor: 'Agencies running up to 10 client brands — uncapped',
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    bestFor: 'Multi-team agencies & brand marketing orgs',
  },
}

export default function PricingSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="pricing" className="section" ref={ref} style={{ background: '#0a0a0a' }}>
      <div className="divider-gold" style={{ marginBottom: 100 }} />
      <div className="container" style={{ maxWidth: 1080 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }} className="text-center mb-14"
        >
          <span className="badge-gold" style={{ marginBottom: 20, display: 'inline-flex' }}>Pricing</span>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 900, color: '#fff', marginBottom: 16, letterSpacing: '-0.025em' }}>
            Priced against headcount, not software.
          </h2>
          <p style={{ color: '#666', fontSize: '1.125rem', maxWidth: 640, margin: '0 auto' }}>
            Each account manager runs 2–3× more creator relationships on Prov. Comparable
            enterprise platforms run $2,500–$12,000+/month. The price you sign is the price
            you keep — it never increases on you.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: 18, alignItems: 'stretch', maxWidth: 1200, margin: '0 auto' }}>
          <PricingCard
            tier={TIERS.starter.name}
            price={TIERS.starter.price}
            bestFor={TIERS.starter.bestFor}
            CTA="Start free trial"
            ctaHref="/signup"
            benefits={[
              { text: '300 outreach credits / day (resets daily)', checked: true },
              { text: '1 seat · your own book of deals', checked: true },
              { text: 'Contracts & invoicing included', checked: true },
              { text: 'Client workspaces', checked: false },
              { text: 'Team seats & approval flows', checked: false },
            ]}
          />
          <PricingCard
            tier={TIERS.premium.name}
            price={TIERS.premium.price}
            bestFor={TIERS.premium.bestFor}
            CTA="Start free trial"
            ctaHref="/signup"
            benefits={[
              { text: '1,500 outreach credits / day (resets daily)', checked: true },
              { text: '1 seat · up to 3 client workspaces', checked: true },
              { text: 'Pipeline CRM + outreach from your Gmail', checked: true },
              { text: 'Contracts, invoicing & FTC compliance', checked: true },
              { text: 'Institutional memory (deal intelligence)', checked: true },
            ]}
          />
          <PricingCard
            tier={TIERS.growth.name}
            price={TIERS.growth.price}
            bestFor={TIERS.growth.bestFor}
            CTA="Subscribe"
            ctaHref="/api/stripe/checkout?plan=growth"
            highlighted
            secondaryCTA="or request a demo first →"
            secondaryHref="/demo"
            benefits={[
              { text: 'Up to 10 client workspaces & 15 seats', checked: true },
              { text: 'Institutional memory (deal intelligence)', checked: true },
              { text: 'Pipeline CRM + team-approved outreach', checked: true },
              { text: 'Contracts, invoicing & FTC compliance', checked: true },
              { text: 'White-label client reports', checked: true },
              { text: 'SSO & custom data controls', checked: false },
            ]}
          />
          <PricingCard
            tier={TIERS.enterprise.name}
            price={TIERS.enterprise.price}
            bestFor={TIERS.enterprise.bestFor}
            CTA="Talk to us"
            ctaHref="/demo"
            benefits={[
              { text: 'Unlimited clients & seats', checked: true },
              { text: 'Everything in Growth Agency', checked: true },
              { text: 'SSO + role-based access controls', checked: true },
              { text: 'Full audit trail & compliance exports', checked: true },
              { text: 'Dedicated success manager & onboarding', checked: true },
              { text: 'Custom integrations & data residency', checked: true },
            ]}
          />
        </div>

        <RedeemCode />

        <p style={{ textAlign: 'center', color: '#444', fontSize: '0.875rem', marginTop: 24 }}>
          Every account starts with 25 free outreach credits — no card required. Cancel anytime. No setup fees.
        </p>
      </div>
    </section>
  )
}
