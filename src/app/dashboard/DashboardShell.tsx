'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Search, Building2, Mail, Send, Inbox, FileText,
  Users, Receipt, BarChart3, Briefcase, Settings, LogOut, Menu, X,
} from 'lucide-react'

export type NavKey =
  | 'dashboard' | 'search' | 'sponsors' | 'templates' | 'send' | 'track'
  | 'contracts' | 'crm' | 'invoices' | 'analytics' | 'branding' | 'settings'

const NAV: { key: NavKey; label: string; href: string; Icon: typeof Search }[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', Icon: LayoutDashboard },
  { key: 'search', label: 'Search Creators', href: '/dashboard/campaign?step=0', Icon: Search },
  { key: 'sponsors', label: 'Match Sponsors', href: '/dashboard/campaign?step=1', Icon: Building2 },
  { key: 'templates', label: 'Email Templates', href: '/dashboard/templates', Icon: Mail },
  { key: 'send', label: 'Send Campaigns', href: '/dashboard/campaign?step=3', Icon: Send },
  { key: 'track', label: 'Track & Replies', href: '/dashboard/campaign?step=4', Icon: Inbox },
  { key: 'contracts', label: 'Contracts', href: '/dashboard/campaign?step=4', Icon: FileText },
  { key: 'crm', label: 'CRM Pipeline', href: '/dashboard/crm', Icon: Users },
  { key: 'invoices', label: 'Invoices', href: '/dashboard/invoices', Icon: Receipt },
  { key: 'analytics', label: 'Analytics', href: '/dashboard/analytics', Icon: BarChart3 },
  { key: 'branding', label: 'Branding', href: '/dashboard/settings', Icon: Briefcase },
  { key: 'settings', label: 'Settings', href: '/dashboard/settings', Icon: Settings },
]

interface Props {
  active: NavKey
  email?: string
  accessType?: string
  daysLeft?: number | null
  children: React.ReactNode
}

export default function DashboardShell({ active, email, accessType, daysLeft, children }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col transition-transform ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ background: '#0c0c12', borderRight: '1px solid #1a1a22' }}
      >
        <div style={{ padding: '20px 22px', borderBottom: '1px solid #1a1a22', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex' }}>
            <Image src="/logo.png" alt="Prov" width={96} height={38} style={{ objectFit: 'contain' }} priority />
          </Link>
          <button className="md:hidden" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => {
            const on = item.key === active
            return (
              <Link key={item.key} href={item.href} onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10,
                  fontSize: '0.875rem', fontWeight: on ? 700 : 500,
                  color: on ? '#FFD700' : '#9a9a9a',
                  background: on ? 'rgba(255,215,0,0.1)' : 'transparent',
                  borderLeft: `2px solid ${on ? '#FFD700' : 'transparent'}`,
                  textDecoration: 'none', transition: 'color 0.15s, background 0.15s',
                }}
              >
                <item.Icon size={17} strokeWidth={on ? 2.2 : 1.8} /> {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '14px 16px', borderTop: '1px solid #1a1a22' }}>
          <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '0.875rem', padding: '8px 8px' }}>
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && <div className="md:hidden" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 30 }} />}

      {/* Main column */}
      <div className="md:pl-60">
        {/* Header */}
        <header style={{ height: 56, borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(10px)', zIndex: 20 }}>
          <button className="md:hidden" onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', display: 'flex' }}><Menu size={20} /></button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {accessType === 'trial' && daysLeft != null && (
              <Link href="/buy" className="btn-gold" style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>{daysLeft}d left · Subscribe</Link>
            )}
            {email && <span style={{ fontSize: '0.8125rem', color: '#666' }}>{email}</span>}
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  )
}
