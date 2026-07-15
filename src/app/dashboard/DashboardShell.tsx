'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWhiteLabel } from '@/lib/whitelabel'
import ProvBot from './ProvBot'
import {
  LayoutDashboard, Search, Building2, Mail, Send, Inbox, FileText,
  Users, Receipt, BarChart3, Briefcase, Settings, LogOut, Menu, X, Command, CornerDownLeft,
  FileBarChart, Sparkles, Webhook, TrendingUp, Zap, Play, ShieldCheck, KanbanSquare, Brain,
} from 'lucide-react'

// ENTERPRISE §3 IA: Dashboard · Creators · Pipeline · Outreach · Contracts ·
// Invoices & Payments · Compliance · Reports · Team & Roles · Settings.
// Legacy NavKeys are kept so existing pages keep highlighting correctly.
export type NavKey =
  | 'dashboard' | 'search' | 'discovery' | 'sponsors' | 'clients' | 'contacts' | 'templates' | 'send' | 'track'
  | 'contracts' | 'crm' | 'invoices' | 'performance' | 'workflows' | 'analytics' | 'reports'
  | 'portal' | 'team' | 'integrations' | 'branding' | 'settings' | 'compliance'

interface NavItem { key: NavKey; label: string; href: string; Icon: typeof Search }
interface NavGroup { heading?: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  { items: [{ key: 'dashboard', label: 'Dashboard', href: '/dashboard', Icon: LayoutDashboard }] },
  {
    heading: 'Work',
    items: [
      { key: 'search', label: 'Creators', href: '/dashboard/campaign?step=0', Icon: Search },
      { key: 'discovery', label: 'Curated Discovery', href: '/dashboard/discovery', Icon: Sparkles },
      { key: 'contacts', label: 'My Contacts', href: '/dashboard/contacts', Icon: Users },
      { key: 'crm', label: 'Pipeline', href: '/dashboard/crm', Icon: KanbanSquare },
      { key: 'templates', label: 'Outreach', href: '/dashboard/templates', Icon: Mail },
      { key: 'send', label: 'Send Campaigns', href: '/dashboard/campaign?step=3', Icon: Send },
      { key: 'track', label: 'Track & Replies', href: '/dashboard/campaign?step=4', Icon: Inbox },
    ],
  },
  {
    heading: 'Business',
    items: [
      { key: 'contracts', label: 'Contracts', href: '/dashboard/contracts', Icon: FileText },
      { key: 'invoices', label: 'Invoices & Payments', href: '/dashboard/invoices', Icon: Receipt },
      { key: 'compliance', label: 'Compliance', href: '/dashboard/compliance', Icon: ShieldCheck },
      { key: 'performance', label: 'Intelligence', href: '/dashboard/performance', Icon: Brain },
      { key: 'reports', label: 'Reports', href: '/dashboard/reports', Icon: FileBarChart },
      { key: 'analytics', label: 'Analytics', href: '/dashboard/analytics', Icon: BarChart3 },
      { key: 'portal', label: 'Client Portal', href: '/dashboard/portal', Icon: Users },
    ],
  },
  {
    heading: 'Workspace',
    items: [
      { key: 'team', label: 'Team & Roles', href: '/dashboard/team', Icon: Users },
      { key: 'clients', label: 'Clients', href: '/dashboard/clients', Icon: Building2 },
      { key: 'integrations', label: 'Integrations', href: '/dashboard/integrations', Icon: Webhook },
      { key: 'branding', label: 'Branding', href: '/dashboard/settings', Icon: Briefcase },
      { key: 'settings', label: 'Settings', href: '/dashboard/settings', Icon: Settings },
    ],
  },
]

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items)

interface Props {
  active: NavKey
  email?: string
  accessType?: string
  daysLeft?: number | null
  children: React.ReactNode
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <Link href={item.href} onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderRadius: 10,
        fontSize: '0.875rem', fontWeight: active ? 700 : 500,
        color: active ? '#FFD700' : '#9a9a9a',
        background: active ? 'rgba(255,215,0,0.1)' : 'transparent',
        borderLeft: `2px solid ${active ? '#FFD700' : 'transparent'}`,
        textDecoration: 'none', transition: 'color 0.15s, background 0.15s',
      }}
    >
      <item.Icon size={17} strokeWidth={active ? 2.2 : 1.8} /> {item.label}
    </Link>
  )
}

/* ── Global ⚡ workflow launcher — top bar, every dashboard page ── */
interface LauncherWorkflow {
  id: string; name: string; icon: string
  steps: Array<{ enabled: boolean; estimated_time_minutes: number }>
}

function workflowMinutes(w: LauncherWorkflow) {
  return w.steps.filter(s => s.enabled).reduce((sum, s) => sum + (s.estimated_time_minutes || 0), 0)
}

function WorkflowLauncher() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [workflows, setWorkflows] = useState<LauncherWorkflow[] | null>(null)

  // Lazy-fetch on first open; table may not exist yet — treat errors as empty.
  useEffect(() => {
    if (!open || workflows !== null) return
    fetch('/api/performance/workflows')
      .then(r => r.json())
      .then(d => setWorkflows(Array.isArray(d.workflows) ? d.workflows : []))
      .catch(() => setWorkflows([]))
  }, [open, workflows])

  function run(id: string) {
    setOpen(false)
    router.push(`/dashboard/performance?workflow=${id}`)
  }

  return (
    <span style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, background: open ? 'rgba(255,215,0,0.12)' : 'rgba(255,215,0,0.06)',
          border: '1px solid rgba(255,215,0,0.25)', borderRadius: 8, padding: '6px 12px',
          color: '#FFD700', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
        }}>
        <Zap size={14} /> Workflows
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50, width: 300, background: '#111', border: '1px solid rgba(255,215,0,0.18)', borderRadius: 12, padding: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8a8a8a', padding: '6px 10px' }}>
              Run a workflow
            </p>
            {workflows === null && <p style={{ color: '#555', fontSize: '0.8125rem', padding: '10px' }}>Loading…</p>}
            {workflows?.length === 0 && (
              <p style={{ color: '#666', fontSize: '0.8125rem', padding: '4px 10px 10px', lineHeight: 1.5 }}>
                No workflows yet. Build one — a guided path through logging results, proof cards and case studies.
              </p>
            )}
            {workflows?.map(w => (
              <button key={w.id} onClick={() => run(w.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 8, padding: '9px 10px', color: '#e0e0e0', fontSize: '0.875rem', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <span style={{ fontSize: 16 }}>{w.icon}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</span>
                <span style={{ color: '#666', fontSize: '0.6875rem' }}>{w.steps.filter(s => s.enabled).length} steps · {workflowMinutes(w)}m</span>
                <Play size={12} style={{ color: '#FFD700', flexShrink: 0 }} />
              </button>
            ))}
            <div style={{ borderTop: '1px solid #1e1e1e', marginTop: 6, paddingTop: 6 }}>
              <button onClick={() => { setOpen(false); router.push('/dashboard/workflows') }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', borderRadius: 8, padding: '8px 10px', color: '#999', fontSize: '0.8125rem', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#FFD700')}
                onMouseLeave={e => (e.currentTarget.style.color = '#999')}>
                <Settings size={13} /> Manage workflows
              </button>
            </div>
          </div>
        </>
      )}
    </span>
  )
}

/* ── ⌘K command palette (recolored to Prov dark/gold) ── */
interface PaletteItem { key: string; label: string; href: string; Icon: typeof Search }

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [workflowItems, setWorkflowItems] = useState<PaletteItem[]>([])

  // Workflows are runnable straight from the palette ("Run workflow: …").
  useEffect(() => {
    fetch('/api/performance/workflows')
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d.workflows)) return
        setWorkflowItems(d.workflows.map((w: { id: string; name: string }) => ({
          key: `wf-${w.id}`,
          label: `Run workflow: ${w.name}`,
          href: `/dashboard/performance?workflow=${w.id}`,
          Icon: Zap,
        })))
      })
      .catch(() => {})
  }, [])

  const ql = q.trim().toLowerCase()
  const allItems: PaletteItem[] = [...ALL_ITEMS, ...workflowItems]
  const results = ql ? allItems.filter(i => i.label.toLowerCase().includes(ql)) : allItems

  function go(href: string) { router.push(href); onClose() }

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, margin: '0 16px', background: '#111', border: '1px solid rgba(255,215,0,0.18)', borderRadius: 14, boxShadow: '0 30px 90px rgba(0,0,0,0.7)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', borderBottom: '1px solid #1c1c1c' }}>
          <Search size={17} style={{ color: '#666', flexShrink: 0 }} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && results[0]) go(results[0].href); if (e.key === 'Escape') onClose() }}
            placeholder="Jump to a page…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f0f0f0', fontSize: '0.9375rem', padding: '15px 0' }} />
          <kbd style={{ fontSize: 10, color: '#666', border: '1px solid #2a2a2a', borderRadius: 4, padding: '2px 6px', fontFamily: 'monospace' }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: 8 }}>
          {results.length === 0 && <p style={{ color: '#555', fontSize: '0.875rem', textAlign: 'center', padding: '24px 0' }}>No matches</p>}
          {results.map((item, i) => (
            <button key={item.key} onClick={() => go(item.href)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', background: i === 0 && ql ? 'rgba(255,215,0,0.08)' : 'transparent', border: 'none', borderRadius: 9, padding: '10px 12px', color: '#d0d0d0', fontSize: '0.9375rem', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = i === 0 && ql ? 'rgba(255,215,0,0.08)' : 'transparent')}>
              <item.Icon size={16} style={{ color: '#FFD700' }} /> {item.label}
              {i === 0 && ql && <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#666' }}><CornerDownLeft size={12} /> Enter</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DashboardShell({ active, email, accessType, daysLeft, children }: Props) {
  const router = useRouter()
  const wl = useWhiteLabel()
  const [open, setOpen] = useState(false)
  const [cmd, setCmd] = useState(false)

  // Claim any pending team invite for this account on first load (joins the workspace).
  useEffect(() => { fetch('/api/team/accept', { method: 'POST' }).catch(() => {}) }, [])

  // ⌘K / Ctrl+K opens the command palette anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd(c => !c) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #1a1a22', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            {wl.enabled ? (
              wl.logo
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={wl.logo} alt={wl.name} style={{ height: 30, width: 'auto', maxWidth: 130, objectFit: 'contain' }} />
                : <span style={{ fontWeight: 900, fontSize: '1.125rem', color: wl.primary, fontFamily: 'var(--font-display)' }}>{wl.name}</span>
            ) : (
              <Image src="/logo.png" alt="Prov" width={96} height={38} style={{ objectFit: 'contain' }} priority />
            )}
          </Link>
          <button className="md:hidden" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {/* Command palette trigger */}
        <div style={{ padding: '12px 12px 4px' }}>
          <button onClick={() => setCmd(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid #1f1f28', borderRadius: 8, padding: '8px 10px', color: '#666', fontSize: '0.8125rem', cursor: 'pointer' }}>
            <Search size={14} /> Jump to…
            <kbd style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, color: '#555', border: '1px solid #2a2a33', borderRadius: 4, padding: '1px 5px' }}><Command size={9} />K</kbd>
          </button>
        </div>

        {/* ProvBot assistant trigger */}
        <div style={{ padding: '6px 12px 4px' }}>
          <button onClick={() => window.dispatchEvent(new Event('provbot:open'))}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 8, padding: '9px 10px', color: '#FFD700', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer' }}>
            <Sparkles size={15} /> Ask ProvBot
          </button>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: group.heading ? 12 : 0 }}>
              {group.heading && (
                <span style={{ padding: '0 14px 4px', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4a55' }}>{group.heading}</span>
              )}
              {group.items.map(item => <NavLink key={item.key} item={item} active={item.key === active} onClick={() => setOpen(false)} />)}
            </div>
          ))}
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
        <header style={{ height: 56, borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(10px)', zIndex: 20 }}>
          <button className="md:hidden" onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', display: 'flex' }}><Menu size={20} /></button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <WorkflowLauncher />
            {email && <span style={{ fontSize: '0.8125rem', color: '#666' }}>{email}</span>}
          </div>
        </header>

        <main>{children}</main>
      </div>

      {cmd && <CommandPalette onClose={() => setCmd(false)} />}

      {/* ProvBot AI assistant — left-docked chat drawer + launcher */}
      <ProvBot />
    </div>
  )
}
