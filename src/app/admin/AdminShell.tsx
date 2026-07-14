'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Ticket, Building2, BarChart3, Settings, ArrowLeft, ShieldCheck } from 'lucide-react'
import AdminInbox from './AdminInbox'
import AdminDemos from './AdminDemos'

type Tab = 'tickets' | 'demos'
const NAV: Array<{ key: Tab | 'analytics' | 'settings'; label: string; Icon: typeof Ticket; soon?: boolean }> = [
  { key: 'tickets', label: 'Tickets', Icon: Ticket },
  { key: 'demos', label: 'Demo requests', Icon: Building2 },
  { key: 'analytics', label: 'Analytics', Icon: BarChart3, soon: true },
  { key: 'settings', label: 'Settings', Icon: Settings, soon: true },
]
const TITLE: Record<Tab, string> = { tickets: 'Support Tickets', demos: 'Demo Requests' }

export default function AdminShell({ adminEmail }: { adminEmail: string }) {
  const [tab, setTab] = useState<Tab>('tickets')

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f3f3f3' }}>
      {/* Sidebar */}
      <aside className="hidden md:flex" style={{ position: 'fixed', insetBlock: 0, left: 0, width: 232, flexDirection: 'column', background: '#0c0c12', borderRight: '1px solid #1a1a22' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #1a1a22', display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(255,215,0,.12)', color: '#FFD700' }}>
            <ShieldCheck size={17} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Admin</span>
        </div>
        <nav style={{ flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV.map(n => {
            const active = n.key === tab
            return (
              <div key={n.key}
                onClick={() => !n.soon && setTab(n.key as Tab)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11, padding: '9px 13px', borderRadius: 9, fontSize: '0.875rem',
                  fontWeight: active ? 700 : 500, color: active ? '#FFD700' : n.soon ? '#4a4a55' : '#9a9a9a',
                  background: active ? 'rgba(255,215,0,.1)' : 'transparent', borderLeft: `2px solid ${active ? '#FFD700' : 'transparent'}`,
                  cursor: n.soon ? 'default' : 'pointer',
                }}>
                <n.Icon size={16} /> {n.label}
                {n.soon && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#3a3a44' }}>soon</span>}
              </div>
            )
          })}
        </nav>
        <div style={{ padding: '14px 16px', borderTop: '1px solid #1a1a22' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#777', fontSize: '0.8125rem', textDecoration: 'none' }}>
            <ArrowLeft size={15} /> Back to app
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="md:pl-[232px]">
        <header style={{ height: 56, borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', position: 'sticky', top: 0, background: 'rgba(10,10,10,.92)', backdropFilter: 'blur(10px)', zIndex: 20 }}>
          <h1 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{TITLE[tab]}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#777' }}>
            <ShieldCheck size={14} style={{ color: '#FFD700' }} /> {adminEmail}
          </div>
        </header>
        <main style={{ padding: '22px' }}>
          {tab === 'tickets' ? <AdminInbox /> : <AdminDemos />}
        </main>
      </div>
    </div>
  )
}
