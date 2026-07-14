import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { Shield, Lock, Users, FileSearch, Database, KeyRound } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Security — Prov',
  description: 'How Prov handles your agency’s data: access control, audit trails, and tenant isolation.',
}

// §8.10: the page enterprise buyers actually read. Every claim on this page
// must be literally true of the running system — no aspirational compliance
// badges, no certifications we don't hold.
const SECTIONS = [
  {
    Icon: Database,
    title: 'Tenant isolation at the database layer',
    body: 'Every row of agency data is scoped to your workspace with Postgres Row Level Security. Isolation is enforced by the database itself — not by application code or UI filtering — so a query from one workspace can never return another workspace’s deals, contracts, invoices, or intelligence records.',
  },
  {
    Icon: Users,
    title: 'Role-based access control',
    body: 'Five roles — Owner, Admin, Account Manager, Analyst, and Client-Viewer — with permissions enforced at the API and database layers. Client-Viewers are additionally scoped to specific clients: they cannot see any other client’s data in your workspace, even by constructing requests manually.',
  },
  {
    Icon: FileSearch,
    title: 'Audit trail',
    body: 'Contract approvals, invoice actions, compliance verifications, and role changes are written to an append-only audit log with the actor, action, entity, and timestamp. Finance and compliance reviews get a factual record of who did what, when.',
  },
  {
    Icon: Lock,
    title: 'Encryption',
    body: 'Data is encrypted in transit (TLS) and at rest (AES-256) on our infrastructure provider, Supabase (built on AWS). Uploaded documents — executed contracts, W-9s, disclosure proofs — live in private storage buckets accessible only through short-lived signed URLs.',
  },
  {
    Icon: KeyRound,
    title: 'Authentication & provisioning',
    body: 'Accounts are provisioned by our team during onboarding — there is no open self-serve signup surface. Email-code login avoids password-reuse risk. SSO is available on Enterprise agreements.',
  },
  {
    Icon: Shield,
    title: 'Your data is yours',
    body: 'Deal intelligence, contracts, and performance records belong to your agency. We don’t sell your data, train models on your private records, or retain them after a contracted offboarding. Full export is available at any time.',
  },
]

export default function SecurityPage() {
  return (
    <>
      <Nav />
      <main style={{ minHeight: '80vh', padding: '140px 24px 100px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <span className="badge-gold" style={{ marginBottom: 20, display: 'inline-flex' }}>Security</span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 14 }}>
            Built to pass your review
          </h1>
          <p style={{ color: '#888', fontSize: '1.05rem', marginBottom: 48, lineHeight: 1.6, maxWidth: 640 }}>
            Prov holds your agency&apos;s contracts, payments, and client relationships.
            Here is exactly how that data is protected — in plain language, with no
            claims we can&apos;t stand behind.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
            {SECTIONS.map(({ Icon, title, body }) => (
              <div key={title} className="card-dark" style={{ padding: 26 }}>
                <Icon size={20} style={{ color: '#FFD700', marginBottom: 12 }} />
                <h2 style={{ color: '#f0f0f0', fontSize: '1.05rem', fontWeight: 700, marginBottom: 8 }}>{title}</h2>
                <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
          </div>

          <div className="card-gold-border" style={{ padding: 28, marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>Security questionnaire?</h2>
              <p style={{ color: '#888', fontSize: '0.9rem' }}>We answer vendor-review and data-processing questionnaires as part of every enterprise evaluation.</p>
            </div>
            <Link href="/demo" className="btn-gold" style={{ whiteSpace: 'nowrap' }}>Talk to us</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
