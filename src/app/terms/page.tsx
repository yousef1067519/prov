import type { Metadata } from 'next'
import { LegalPage, H2, P, UL } from '../legal/legal'

export const metadata: Metadata = { title: 'Terms of Service — Prov' }

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 2026">
      <P>These Terms govern your use of the Prov platform at prov.agency (the &ldquo;Service&rdquo;), operated by Prov. By creating an account or using the Service you agree to these Terms.</P>

      <H2>The Service</H2>
      <P>Prov helps influencer-marketing agencies discover creators, match sponsors, send outreach from their own connected email, manage deals, and generate contracts, invoices, and reports. Features may change over time as the Service evolves.</P>

      <H2>Subscriptions & billing</H2>
      <UL>
        <li>Access is provided under the plan and price agreed when your account is provisioned or as shown at checkout, and is billed through Stripe.</li>
        <li>Your price does not increase during your committed term.</li>
        <li>You can cancel anytime via the billing portal; access continues until the end of the paid period. Fees already paid are non-refundable except where required by law.</li>
      </UL>

      <H2>Acceptable use — outreach & anti-spam</H2>
      <P>You are solely responsible for the messages you send through the Service and for complying with all applicable laws, including the CAN-SPAM Act, GDPR/ePrivacy, CASL, and similar regulations. You agree to:</P>
      <UL>
        <li>Only contact recipients where you have a lawful basis to do so.</li>
        <li>Include accurate sender information and a working way to opt out, and honor opt-out requests promptly.</li>
        <li>Not send unlawful, deceptive, harassing, or bulk unsolicited email that violates your email provider&apos;s policies.</li>
      </UL>
      <P>You send outreach from your own connected email account and are subject to that provider&apos;s sending limits and terms. We may suspend accounts that abuse the Service or generate spam complaints.</P>

      <H2>Your content & data</H2>
      <P>You retain ownership of your campaigns, branding, clients, contacts, and deal records. You grant us a limited license to process this content solely to provide the Service. You are responsible for the accuracy and lawful use of any creator or contact data you import or generate, including having the right to upload it.</P>

      <H2>AI-generated content & contracts</H2>
      <P>Parts of the Service use AI to draft content — outreach emails, contract documents, insights, and assistant replies. AI output can be inaccurate or incomplete. Contract templates and AI-generated documents are provided for convenience and are <strong>not legal advice</strong>; review them with a qualified professional before signing or relying on them. You are responsible for any content you approve and send.</P>

      <H2>Disclaimers & liability</H2>
      <P>The Service is provided &ldquo;as is&rdquo; without warranties of any kind. To the maximum extent permitted by law, Prov is not liable for indirect, incidental, or consequential damages — including lost deals, lost revenue, or regulatory penalties arising from your campaigns — and our total liability is limited to the amount you paid us in the 12 months preceding the claim.</P>

      <H2>Termination</H2>
      <P>You may stop using the Service at any time and may request an export of your data. We may suspend or terminate access for violation of these Terms or misuse of the Service.</P>

      <H2>Changes</H2>
      <P>We may update these Terms; material changes will be communicated by email or in the app. Continued use after changes means you accept them.</P>

      <H2>Contact</H2>
      <P>Prov — providemediabrands@gmail.com.</P>
    </LegalPage>
  )
}
