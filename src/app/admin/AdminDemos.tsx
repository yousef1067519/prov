'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, RefreshCw, Building2, Mail } from 'lucide-react'

type Status = 'new' | 'contacted' | 'qualified' | 'won' | 'lost'

const NEED_LABEL: Record<string, string> = {
  discovery: 'Finding & vetting creators',
  outreach: "Outreach that doesn't rely on one person's inbox",
  pipeline: 'Keeping deals organized',
  contracts: 'Contracts & getting agreements signed faster',
  invoicing: 'Invoicing & getting paid on time',
  compliance: 'FTC disclosure & compliance risk',
  memory: 'Not losing deal history when someone leaves',
  reporting: 'Client-ready reporting',
  other: 'Something else',
}

interface DemoRequest {
  id: string; agency_name: string; contact_name: string; email: string
  team_size: string | null; clients_count: string | null; monthly_deals: string | null
  priority_need: string | null; message: string | null; status: Status; created_at: string
}

const STATUS_STYLE: Record<Status, { bg: string; fg: string; label: string }> = {
  new:       { bg: 'rgba(255,193,7,.14)', fg: '#ffca28', label: 'New' },
  contacted: { bg: 'rgba(56,139,253,.16)', fg: '#6cb0ff', label: 'Contacted' },
  qualified: { bg: 'rgba(139,92,246,.16)', fg: '#a78bfa', label: 'Qualified' },
  won:       { bg: 'rgba(46,160,67,.16)', fg: '#5dd47a', label: 'Won' },
  lost:      { bg: 'rgba(255,92,92,.14)', fg: '#ff7a7a', label: 'Lost' },
}

function Badge({ children, bg, fg }: { children: React.ReactNode; bg?: string; fg: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, background: bg ?? 'transparent', color: fg }}>{children}</span>
}

const inputStyle: React.CSSProperties = {
  background: '#121218', border: '1px solid #24242e', borderRadius: 8, color: '#e8e8ee',
  fontSize: '0.8125rem', padding: '7px 10px', outline: 'none',
}

export default function AdminDemos() {
  const [requests, setRequests] = useState<DemoRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<DemoRequest | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (q.trim()) params.set('q', q.trim())
    try {
      const res = await fetch(`/api/admin/demos?${params}`)
      const data = await res.json()
      setRequests(Array.isArray(data.requests) ? data.requests : [])
    } catch { setRequests([]) }
    setLoading(false)
  }, [status, q])

  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t) }, [load, q])

  async function patch(id: string, next: Status) {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/demos/${id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: next }),
      })
      const data = await res.json()
      if (data.request) {
        setRequests(rs => rs.map(r => (r.id === id ? { ...r, ...data.request } : r)))
        setSelected(s => (s && s.id === id ? { ...s, ...data.request } : s))
      }
    } finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 1080 }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 9, color: '#555' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search agency, name, email…"
            style={{ ...inputStyle, width: '100%', paddingLeft: 32 }} />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
          <option value="">All statuses</option>
          {(Object.keys(STATUS_STYLE) as Status[]).map(s => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
        </select>
        <button onClick={load} title="Refresh" style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#aaa' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #1c1c24', borderRadius: 12, overflow: 'hidden', background: '#0d0d13' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 90px 150px', gap: 0, padding: '10px 16px', borderBottom: '1px solid #1c1c24', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#55555f' }}>
          <span>Agency / contact</span><span>Team &amp; clients</span><span>Status</span><span>Submitted</span>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}><Loader2 size={22} className="animate-spin" style={{ margin: '0 auto' }} /></div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center', color: '#5a5a64' }}>
            <Building2 size={30} style={{ margin: '0 auto 12px', opacity: .6 }} />
            <p style={{ fontWeight: 600 }}>No demo requests</p>
            <p style={{ fontSize: '0.82rem', marginTop: 4 }}>Submissions from /demo will appear here.</p>
          </div>
        ) : requests.map(r => (
          <button key={r.id} onClick={() => setSelected(r)}
            style={{ display: 'grid', gridTemplateColumns: '1fr 160px 90px 150px', gap: 0, alignItems: 'center', width: '100%', textAlign: 'left', padding: '13px 16px', borderBottom: '1px solid #15151c', background: 'transparent', cursor: 'pointer', color: '#cfcfd6' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.025)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 14 }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#e8e8ee' }}>{r.agency_name}</span>
              <span style={{ display: 'block', fontSize: '0.76rem', color: '#888' }}>{r.contact_name} · {r.email}</span>
              {r.priority_need && (
                <span style={{ display: 'inline-block', marginTop: 4 }}>
                  <Badge bg="rgba(255,215,0,.12)" fg="#FFD700">{NEED_LABEL[r.priority_need] ?? r.priority_need}</Badge>
                </span>
              )}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#888' }}>{r.team_size ?? '—'} team · {r.clients_count ?? '—'} clients</span>
            <span><Badge bg={STATUS_STYLE[r.status].bg} fg={STATUS_STYLE[r.status].fg}>{STATUS_STYLE[r.status].label}</Badge></span>
            <span style={{ fontSize: '0.76rem', color: '#777' }}>{new Date(r.created_at).toLocaleDateString()}</span>
          </button>
        ))}
      </div>

      {requests.length > 0 && <p style={{ marginTop: 10, fontSize: '0.76rem', color: '#55555f' }}>{requests.length} request{requests.length === 1 ? '' : 's'}</p>}

      {/* Detail drawer */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(2px)' }} />
          <aside className="w-full sm:w-[440px]" style={{ position: 'fixed', top: 0, bottom: 0, right: 0, zIndex: 49, background: '#0c0c12', borderLeft: '1px solid #1f1f29', display: 'flex', flexDirection: 'column', boxShadow: '0 0 60px rgba(0,0,0,.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid #1a1a22' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selected.agency_name}</div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#8a8a96', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
              <label style={labelStyle}>Contact</label>
              <div style={{ fontSize: '0.86rem', color: '#dcdce2', marginBottom: 4 }}>{selected.contact_name}</div>
              <a href={`mailto:${selected.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#FFD700', textDecoration: 'none', marginBottom: 18 }}>
                <Mail size={13} /> {selected.email}
              </a>

              <label style={labelStyle}>Team size / clients / deals per month</label>
              <div style={{ fontSize: '0.83rem', color: '#bdbdc6', marginBottom: 18 }}>
                {selected.team_size ?? '—'} · {selected.clients_count ?? '—'} · {selected.monthly_deals ?? '—'}
              </div>

              {selected.priority_need && (
                <>
                  <label style={labelStyle}>What they need most</label>
                  <div style={{ marginBottom: 18 }}>
                    <Badge bg="rgba(255,215,0,.12)" fg="#FFD700">{NEED_LABEL[selected.priority_need] ?? selected.priority_need}</Badge>
                  </div>
                </>
              )}

              {selected.message && (
                <>
                  <label style={labelStyle}>Current workflow</label>
                  <div style={{ background: '#121219', border: '1px solid #20202a', borderRadius: 10, padding: '12px 14px', fontSize: '0.86rem', lineHeight: 1.55, color: '#dcdce2', whiteSpace: 'pre-wrap', marginBottom: 18 }}>{selected.message}</div>
                </>
              )}

              <label style={labelStyle}>Submitted</label>
              <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: 20 }}>{new Date(selected.created_at).toLocaleString()}</div>

              <label style={labelStyle}>Status</label>
              <select value={selected.status} disabled={saving} onChange={e => patch(selected.id, e.target.value as Status)} style={{ ...inputStyle, width: '100%' }}>
                {(Object.keys(STATUS_STYLE) as Status[]).map(s => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
              </select>
            </div>

            <div style={{ padding: '14px 18px', borderTop: '1px solid #1a1a22' }}>
              <span style={{ fontSize: '0.74rem', color: saving ? '#FFD700' : '#55555f' }}>{saving ? 'Saving…' : 'Changes save automatically'}</span>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#55555f', marginBottom: 6 }
