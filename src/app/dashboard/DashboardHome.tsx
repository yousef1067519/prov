'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, FolderKanban, Mail, FileText, BarChart3, Briefcase, ChevronRight, CheckCircle2, Clock, Megaphone, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import DashboardShell from './DashboardShell'
import FirstWinTracker from './FirstWinTracker'
import SetupChecklist from './SetupChecklist'
import MyAssignments from './MyAssignments'
import { getLocalCampaigns, mergeCampaigns } from '@/lib/localCampaigns'
import { isOnboarded, markOnboarded } from '@/lib/onboarding'

interface ActiveCampaign { id: string; name: string; niche: string; step: 1 | 2; status: string; step2Date?: string }

const QUICK = [
  { label: 'New Campaign', desc: 'Pick a niche, find creators, match sponsors', href: '/dashboard/campaign?step=0', Icon: Plus, primary: true },
  { label: 'Manage Campaigns', desc: 'View and edit existing campaigns', href: '/dashboard/campaign', Icon: FolderKanban },
  { label: 'Email Outreach', desc: 'Send emails to creators and sponsors', href: '/dashboard/campaign?step=3', Icon: Mail },
  { label: 'Generate Contracts', desc: 'Influencer and sponsor agreements', href: '/dashboard/campaign?step=4', Icon: FileText },
  { label: 'Workflows', desc: 'Guided step-by-step routines for closing deals', href: '/dashboard/workflows', Icon: Zap },
  { label: 'Analytics', desc: 'Revenue, reply rates, growth', href: '/dashboard/analytics', Icon: BarChart3 },
  { label: 'Branding', desc: 'Your agency profile and signature', href: '/dashboard/settings', Icon: Briefcase },
]

const money = (n: number) => '$' + Math.round(n).toLocaleString()

export default function DashboardHome({ email, accessType, daysLeft }: { email: string; accessType: string; daysLeft: number | null }) {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<ActiveCampaign[]>([])
  const [loaded, setLoaded] = useState(false)
  const [serverCount, setServerCount] = useState<number | null>(null)
  const [gated, setGated] = useState(false)
  const [m, setM] = useState({ campaigns: 0, contacted: 0, replies: 0, deals: 0, revenue: 0 })

  // Activation gate (per-account): a user who hasn't onboarded and has no real
  // campaigns is pushed through the guided onboarding flow. We use the SERVER
  // campaign count (not browser-local ones) so switching test logins works.
  useEffect(() => {
    if (!loaded || serverCount === null) return
    if (isOnboarded(email)) return
    if (serverCount > 0) { markOnboarded(email); return }
    setGated(true)
    router.replace('/onboarding')
  }, [loaded, serverCount, email, router])

  useEffect(() => {
    const render = (list: { id: string; name: string; niche?: string; status?: string; current_step?: number }[]) =>
      setCampaigns(list.map(c => ({
        id: c.id, name: c.name, niche: c.niche ?? 'General',
        step: (c.current_step === 2 ? 2 : 1) as 1 | 2,
        status: c.status === 'active' ? 'In progress' : c.status === 'won' ? 'Closed won' : c.status === 'draft' ? 'Draft' : 'Waiting for influencer rates',
      })))

    fetch('/api/campaigns').then(r => r.json()).then(d => {
      const api = Array.isArray(d.campaigns) ? d.campaigns : []
      setServerCount(api.length)
      render(mergeCampaigns(api, getLocalCampaigns()) as { id: string; name: string; niche?: string; status?: string }[])
    }).catch(() => { setServerCount(0); render(getLocalCampaigns()) }).finally(() => setLoaded(true))

    const onChange = () => render(getLocalCampaigns())
    window.addEventListener('campaigns-change', onChange)

    // Real, per-user metrics (Supabase RLS scopes every count to this account).
    const sb = createClient()
    Promise.all([
      sb.from('campaigns').select('*', { count: 'exact', head: true }),
      sb.from('emails_sent').select('*', { count: 'exact', head: true }).eq('recipient_type', 'creator'),
      sb.from('responses').select('*', { count: 'exact', head: true }),
      sb.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'signed'),
      sb.from('invoices').select('amount').eq('status', 'paid'),
    ]).then(([c, e, r, d, inv]) => {
      const revenue = Array.isArray(inv.data) ? inv.data.reduce((s: number, row: { amount: number }) => s + Number(row.amount), 0) : 0
      setM({ campaigns: c.count ?? 0, contacted: e.count ?? 0, replies: r.count ?? 0, deals: d.count ?? 0, revenue })
    }).catch(() => {})

    return () => window.removeEventListener('campaigns-change', onChange)
  }, [])

  const replyRate = m.contacted ? Math.round((m.replies / m.contacted) * 100) : 0
  const METRICS: [string, string, string][] = [
    ['Active campaigns', String(Math.max(m.campaigns, campaigns.length)), '#FFD700'],
    ['Influencers contacted', String(m.contacted), '#667eea'],
    ['Reply rate', `${replyRate}%`, '#38bdf8'],
    ['Deals closed', String(m.deals), '#00D084'],
    ['Revenue (paid)', money(m.revenue), '#00D084'],
  ]

  if (gated) return null // redirecting to onboarding

  return (
    <DashboardShell active="dashboard" email={email} accessType={accessType} daysLeft={daysLeft}>
      <div style={{ padding: '32px 28px', maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f5f5f5', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Dashboard</h1>
        <p style={{ color: '#666', marginTop: 4, marginBottom: 24 }}>Welcome back. Pick what you want to do, or check where your campaigns stand.</p>

        {/* Setup checklist — walks a new workspace through branding, Google,
            clients, contacts, team, and sequences before real work starts */}
        <SetupChecklist />

        {/* Tasks assigned to the signed-in member (hidden when empty) */}
        <MyAssignments email={email} />

        {/* First-win tracker — perceived progress toward the activation milestone */}
        <FirstWinTracker />

        {/* Quick actions */}
        <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>Quick actions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 36 }}>
          {QUICK.map(q => (
            <Link key={q.label} href={q.href} style={{
              textDecoration: 'none', background: q.primary ? 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(202,138,4,0.04))' : '#111',
              border: `1px solid ${q.primary ? 'rgba(255,215,0,0.35)' : '#1c1c1c'}`, borderRadius: 16, padding: '22px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, background: q.primary ? '#FFD700' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: q.primary ? '#0a0a0a' : '#FFD700' }}>
                <q.Icon size={19} />
              </span>
              <div>
                <p style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '1rem' }}>{q.label}</p>
                <p style={{ color: '#666', fontSize: '0.8125rem', marginTop: 2 }}>{q.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Active campaigns */}
        <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>Your active campaigns</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 36 }}>
          {loaded && campaigns.length === 0 && (
            <div style={{ background: '#0f0f0f', border: '1px dashed #262626', borderRadius: 16, padding: '32px', textAlign: 'center' }}>
              <p style={{ color: '#888', marginBottom: 14 }}>No campaigns yet. Start your first one to begin reaching creators.</p>
              <Link href="/dashboard/campaign?step=0" className="btn-gold" style={{ padding: '10px 20px', fontSize: '0.875rem' }}><Plus size={15} /> New Campaign</Link>
            </div>
          )}
          {campaigns.map(c => (
            <div key={c.id} style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: 16, padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ color: '#f5f5f5', fontWeight: 800, fontSize: '1.0625rem' }}>{c.name}</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#FFD700', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 6, padding: '2px 8px' }}>{c.niche}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8125rem', fontWeight: 700, color: '#00D084' }}><CheckCircle2 size={14} /> Step 1: Influencer rates</span>
                <ChevronRight size={13} style={{ color: '#333' }} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8125rem', fontWeight: 700, color: c.step === 2 ? '#FFD700' : '#555' }}>
                  {c.step === 2 ? <Megaphone size={14} /> : <Clock size={14} />} Step 2: Sponsor outreach
                </span>
              </div>
              <p style={{ color: '#888', fontSize: '0.875rem' }}>{c.status}{c.step2Date ? ` · unlocks ${c.step2Date}` : ''}</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                <Link href="/dashboard/campaign" className="btn-outline-gold" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>View campaign</Link>
                <Link href={c.step === 1 ? '/dashboard/campaign?step=3' : '/dashboard/campaign?step=3'} className="btn-gold" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
                  {c.step === 1 ? <><Mail size={14} /> Manage Step 1</> : <><Megaphone size={14} /> Email sponsors</>}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Metrics */}
        <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>At a glance</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {METRICS.map(([l, v, c]) => (
            <div key={l} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '20px' }}>
              <div style={{ color: '#666', fontSize: '0.8125rem', marginBottom: 10 }}>{l}</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: c, fontFamily: 'var(--font-display)' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  )
}
