import type { Metadata } from 'next'
import { LegalPage, H2, P, UL } from '../legal/legal'

export const metadata: Metadata = { title: 'Privacy Policy — Prov' }

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 2026">
      <P>This Privacy Policy explains how [Company Legal Name] (&ldquo;Prov&rdquo;, &ldquo;we&rdquo;) collects, uses, and protects information when you use the Prov platform at [yourdomain.com] (the &ldquo;Service&rdquo;).</P>

      <H2>Information we collect</H2>
      <UL>
        <li><strong>Account data</strong> — your email address and any agency/branding details you provide.</li>
        <li><strong>Usage data</strong> — campaigns you create, outreach you send, and activity within the Service.</li>
        <li><strong>Connected accounts</strong> — if you connect Google/Gmail, we store OAuth tokens to send email and read your calendar on your behalf. We do not read your inbox beyond what the granted scopes allow.</li>
        <li><strong>Creator data</strong> — publicly available information about creators (name, platform, audience metrics, and, where available, business contact email) used for discovery and outreach.</li>
        <li><strong>Payment data</strong> — handled by Stripe. We do not store card numbers.</li>
      </UL>

      <H2>How we use information</H2>
      <UL>
        <li>To operate the Service — discovery, campaigns, sending outreach from your connected email, contracts, analytics.</li>
        <li>To process subscriptions and billing through Stripe.</li>
        <li>To send you transactional messages (login codes, receipts, product notices).</li>
        <li>To improve and secure the Service.</li>
      </UL>

      <H2>Google API data</H2>
      <P>Prov&apos;s use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" style={{ color: '#FFD700' }}>Google API Services User Data Policy</a>, including the Limited Use requirements. We use Gmail access only to send outreach you initiate, and Calendar access only to show your availability. We never sell this data or use it for advertising.</P>

      <H2>Sharing</H2>
      <P>We do not sell your personal data. We share data only with service providers that run the Service on our behalf — Supabase (database/auth), Stripe (payments), Resend (transactional email), Google (email/calendar you connect), and our hosting provider — each bound to protect it.</P>

      <H2>Data retention & your rights</H2>
      <P>We retain your data while your account is active. You may request access, correction, export, or deletion of your data, and you may disconnect Google at any time in Settings. To exercise these rights, contact [contact@yourdomain.com].</P>

      <H2>Security</H2>
      <P>We use industry-standard measures to protect your data. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.</P>

      <H2>Contact</H2>
      <P>Questions about this policy: [contact@yourdomain.com], [Company Legal Name], [Mailing Address].</P>
    </LegalPage>
  )
}
