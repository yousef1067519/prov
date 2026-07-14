import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

// Shared shell + typography for the legal pages.
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#d0d0d0' }}>
      <header style={{ borderBottom: '1px solid #161616', padding: '16px 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#cfcfcf', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
            <ChevronLeft size={16} /> Prov
          </Link>
          <div style={{ display: 'flex', gap: 16, fontSize: '0.8125rem' }}>
            <Link href="/privacy" style={{ color: '#888', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/terms" style={{ color: '#888', textDecoration: 'none' }}>Terms</Link>
          </div>
        </div>
      </header>
      <main className="container" style={{ maxWidth: 760, padding: '48px 24px 80px' }}>
        <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '2rem', letterSpacing: '-0.02em', marginBottom: 6 }}>{title}</h1>
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: 36 }}>Last updated {updated}</p>
        <div className="legal-body" style={{ fontSize: '0.9375rem', lineHeight: 1.75 }}>{children}</div>
        <p style={{ color: '#555', fontSize: '0.8125rem', marginTop: 48, paddingTop: 20, borderTop: '1px solid #161616' }}>
          This document is a starting template and not legal advice. Have it reviewed by a lawyer for your jurisdiction before launch.
        </p>
      </main>
    </div>
  )
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '1.125rem', margin: '32px 0 10px' }}>{children}</h2>
}
export function P({ children }: { children: React.ReactNode }) {
  return <p style={{ marginBottom: 14 }}>{children}</p>
}
export function UL({ children }: { children: React.ReactNode }) {
  return <ul style={{ margin: '0 0 14px', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</ul>
}
