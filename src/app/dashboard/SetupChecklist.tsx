'use client'

// "Get set up" — a step-by-step checklist shown on the dashboard until the
// workspace is configured: branding → Google → clients → contacts → team →
// outreach sequences. Steps check off from real data, so a teammate opening the
// dashboard sees the same progress. Dismissible; auto-hides when complete.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Rocket, Check, ChevronRight, X } from 'lucide-react'

type StatusKey = 'branding' | 'google' | 'clients' | 'contacts' | 'team' | 'sequences'
type Status = Record<StatusKey, boolean>

const STEPS: Array<{ key: StatusKey; title: string; desc: string; href: string; cta: string }> = [
  { key: 'branding', title: 'Add your agency branding', desc: 'Your name, agency name, and logo — used on emails, contracts, invoices, and reports.', href: '/dashboard/settings', cta: 'Set up branding' },
  { key: 'google', title: 'Connect Google', desc: 'Outreach sends from your own Gmail and replies are detected automatically.', href: '/dashboard/integrations', cta: 'Connect Gmail' },
  { key: 'clients', title: 'Add the clients you work with', desc: 'The brands you run campaigns for — add them or import your spreadsheet.', href: '/dashboard/clients', cta: 'Add clients' },
  { key: 'contacts', title: 'Bring over your creator contacts', desc: 'Import your existing rolodex (CSV) or paste profile URLs — our 40k catalog is the bonus on top.', href: '/dashboard/contacts', cta: 'Import contacts' },
  { key: 'team', title: 'Invite your team', desc: 'Teammates inherit the workspace — branding, clients, contacts, and sequences included.', href: '/dashboard/team', cta: 'Invite teammates' },
  { key: 'sequences', title: 'Create an outreach sequence', desc: 'Write your own template (AI can sharpen it) so the whole team sends the same way.', href: '/dashboard/templates', cta: 'Create sequence' },
]

const HIDE_KEY = 'prov_setup_hidden'

export default function SetupChecklist() {
  const [status, setStatus] = useState<Status | null>(null)
  const [hidden, setHidden] = useState(true) // start hidden to avoid flash

  useEffect(() => {
    try { if (localStorage.getItem(HIDE_KEY) === '1') return } catch { /* show */ }
    fetch('/api/onboarding/status')
      .then(r => r.json())
      .then(d => { if (d.status) { setStatus(d.status); setHidden(false) } })
      .catch(() => {})
  }, [])

  if (hidden || !status) return null
  const done = STEPS.filter(s => status[s.key]).length
  if (done === STEPS.length) return null // fully set up — get out of the way

  function dismiss() {
    setHidden(true)
    try { localStorage.setItem(HIDE_KEY, '1') } catch { /* session-only */ }
  }

  return (
    <div className="card-dark" style={{ padding: 20, marginBottom: 24, border: '1px solid rgba(255,215,0,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Rocket size={17} style={{ color: '#FFD700' }} />
        <span style={{ color: '#f0f0f0', fontWeight: 800, fontSize: '1rem' }}>Get your workspace set up</span>
        <span style={{ color: '#666', fontSize: '0.8rem' }}>{done}/{STEPS.length} done</span>
        <button onClick={dismiss} title="Hide (you can finish setup anytime from Settings)"
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4 }}>
          <X size={16} />
        </button>
      </div>
      {/* progress bar */}
      <div style={{ height: 4, background: '#1a1a1a', borderRadius: 99, margin: '10px 0 16px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(done / STEPS.length) * 100}%`, background: '#FFD700', borderRadius: 99, transition: 'width .3s' }} />
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {STEPS.map((s, i) => {
          const isDone = status[s.key]
          return (
            <Link key={s.key} href={s.href} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: isDone ? 'transparent' : '#0d0d0d', border: `1px solid ${isDone ? '#1a1a1a' : '#222'}`, borderRadius: 10, opacity: isDone ? 0.55 : 1 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
                  background: isDone ? '#00D084' : 'rgba(255,215,0,0.1)', border: isDone ? 'none' : '1px solid rgba(255,215,0,0.35)',
                  color: isDone ? '#0a0a0a' : '#FFD700', fontSize: '0.72rem', fontWeight: 800,
                }}>
                  {isDone ? <Check size={13} strokeWidth={3} /> : i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: isDone ? '#888' : '#f0f0f0', fontWeight: 600, fontSize: '0.875rem', textDecoration: isDone ? 'line-through' : 'none' }}>{s.title}</div>
                  {!isDone && <div style={{ color: '#777', fontSize: '0.78rem', marginTop: 2 }}>{s.desc}</div>}
                </div>
                {!isDone && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#FFD700', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {s.cta} <ChevronRight size={13} />
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
