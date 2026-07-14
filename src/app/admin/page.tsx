import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { getAdmin } from '@/lib/admin'
import AdminShell from './AdminShell'

// Server-side RBAC gate. getAdmin() returns the email only for an allow-listed admin
// (or 'dev-admin' when DEV_BYPASS_AUTH=true). Everyone else gets the access-restricted screen —
// the admin UI never even renders for non-admins.
export default async function AdminPage() {
  const admin = await getAdmin()

  if (!admin) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f3f3f3', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 18px', display: 'grid', placeItems: 'center', background: 'rgba(255,92,92,.1)', color: '#ff6b6b' }}>
            <ShieldAlert size={26} />
          </div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 8 }}>Access restricted</h1>
          <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 22 }}>
            This area is for administrators only. If you should have access, ask an owner to add your email to the admin allowlist.
          </p>
          <Link href="/dashboard" style={{ display: 'inline-block', background: '#FFD700', color: '#0a0a0a', fontWeight: 700, fontSize: '0.875rem', padding: '10px 20px', borderRadius: 10, textDecoration: 'none' }}>
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return <AdminShell adminEmail={admin} />
}
