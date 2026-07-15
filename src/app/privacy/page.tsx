import type { Metadata } from 'next'
import { LegalPage, H2, P, UL } from '../legal/legal'

export const metadata: Metadata = { title: 'Privacy Policy — Prov' }

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 2026">
      <P>This Privacy Policy explains how Prov (&ldquo;Prov&rdquo;, &ldquo;we&rdquo;) collects, uses, and protects information when you use the Prov platform at prov.agency (the &ldquo;Service&rdquo;).</P>

      <H2>Information we collect</H2>
      <UL>
        <li><strong>Account data</strong> — your email address and any agency/branding details you provide.</li>
        <li><strong>Demo requests</strong> — if you request a demo, the agency name, contact name, email, and details you submit on the form.</li>
        <li><strong>Usage data</strong> — campaigns you create, outreach you send, clients and contacts you add, and activity within the Service.</li>
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

      <H2>AI features</H2>
      <P>Some features (outreach drafting, contract generation, the in-app assistant, reply classification, and performance insights) are powered by third-party large language model APIs (currently DeepSeek). When you use these features, the relevant content — for example, a reply you ask us to classify or the deal terms for a contract draft — is sent to the AI provider to generate the output, subject to that provider&apos;s API terms. We do not use your private workspace data to train our own models, and we do not sell it. If you prefer not to have specific content processed by AI, don&apos;t use the AI features for that content.</P>

      <H2>Google API data</H2>
      <P>Prov&apos;s use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" style={{ color: '#FFD700' }}>Google API Services User Data Policy</a>, including the Limited Use requirements. We use Gmail access only to send outreach you initiate and detect replies to it, and Calendar access only to show your availability. Google user data is never sold, never used for advertising, and never used to train AI models.</P>

      <H2>Cookies</H2>
      <P>We use only essential cookies — the session cookies required to keep you signed in. We do not use advertising or cross-site tracking cookies.</P>

      <H2>Sharing</H2>
      <P>We do not sell your personal data. We share data only with service providers that run the Service on our behalf — Supabase (database/auth), Stripe (payments), Resend (transactional email), DeepSeek (AI features, as described above), Google (email/calendar you connect), and Vercel (hosting) — each bound by their own terms to protect it.</P>

      <H2>Data retention & your rights</H2>
      <P>We retain your data while your account is active. You may request access, correction, export, or deletion of your data, and you may disconnect Google at any time in Settings. To exercise these rights, contact providemediabrands@gmail.com. Depending on where you live (e.g. the EU/UK under GDPR or California under the CCPA), you may have additional statutory rights, which we honor.</P>

      <H2>Security</H2>
      <P>We use industry-standard measures to protect your data, including encryption in transit and at rest via our infrastructure providers and role-based access controls within workspaces. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.</P>

      <H2>Contact</H2>
      <P>Questions about this policy: providemediabrands@gmail.com.</P>
    </LegalPage>
  )
}
