'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, Trash2, X, RefreshCw, Inbox } from 'lucide-react'

type Status = 'open' | 'in_progress' | 'resolved'
type Priority = 'low' | 'medium' | 'high'

interface Ticket {
  id: string; user_id: string; message: string; status: Status; priority: Priority
  created_at: string; updated_at: string; user_email?: string | null
}
interface Detail extends Ticket {
  metadata?: Record<string, unknown>
  user?: { email?: string; access_type?: string; created_at?: string } | null
}

const STATUS_STYLE: Record<Status, { bg: string; fg: string; label: string }> = {
  open:        { bg: 'rgba(255,193,7,.14)', fg: '#ffca28', label: 'Open' },
  in_progress: { bg: 'rgba(56,139,253,.16)', fg: '#6cb0ff', label: 'In progress' },
  resolved:    { bg: 'rgba(46,160,67,.16)', fg: '#5dd47a', label: 'Resolved' },
}
const PRIORITY_STYLE: Record<Priority, { fg: string; label: string }> = {
  low:    { fg: '#7a7a85', label: 'Low' },
  medium: { fg: '#ffca28', label: 'Medium' },
  high:   { fg: '#ff5c5c', label: 'High' },
}

function Badge({ children, bg, fg }: { children: React.ReactNode; bg?: string; fg: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, background: bg ?? 'transparent', color: fg }}>{children}</span>
}

const inputStyle: React.CSSProperties = {
  background: '#121218', border: '1px solid #24242e', borderRadius: 8, color: '#e8e8ee',
  fontSize: '0.8125rem', padding: '7px 10px', outline: 'none',
}

export default function AdminInbox() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState<Detail | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (priority) params.set('priority', priority)
    if (q.trim()) params.set('q', q.trim())
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    try {
      const res = await fetch(`/api/admin/tickets?${params}`)
      const data = await res.json()
      setTickets(Array.isArray(data.tickets) ? data.tickets : [])
    } catch { setTickets([]) }
    setLoading(false)
  }, [status, priority, q, from, to])

  // Refetch on filter changes; debounce the free-text search.
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t) }, [load, q])

  async function openTicket(id: string) {
    setSelected({ id } as Detail) // open drawer immediately with a spinner
    try {
      const res = await fetch(`/api/admin/tickets/${id}`)
      const data = await res.json()
      if (data.ticket) setSelected(data.ticket)
    } catch { /* keep skeleton */ }
  }

  async function patch(id: string, body: Partial<Pick<Ticket, 'status' | 'priority'>>) {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.ticket) {
        setSelected(s => (s ? { ...s, ...data.ticket } : s))
        setTickets(ts => ts.map(t => (t.id === id ? { ...t, ...data.ticket } : t)))
      }
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this ticket permanently?')) return
    await fetch(`/api/admin/tickets/${id}`, { method: 'DELETE' })
    setTickets(ts => ts.filter(t => t.id !== id))
    setSelected(null)
  }

  const fmtDate = (s?: string) => (s ? new Date(s).toLocaleString() : '—')

  return (
    <div style={{ maxWidth: 1080 }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 9, color: '#555' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search message…"
            style={{ ...inputStyle, width: '100%', paddingLeft: 32 }} />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} title="From" style={inputStyle} />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} title="To" style={inputStyle} />
        <button onClick={load} title="Refresh" style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#aaa' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #1c1c24', borderRadius: 12, overflow: 'hidden', background: '#0d0d13' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '92px 90px 1fr 160px 150px', gap: 0, padding: '10px 16px', borderBottom: '1px solid #1c1c24', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#55555f' }}>
          <span>Priority</span><span>Status</span><span>Message</span><span>User</span><span>Created</span>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}><Loader2 size={22} className="animate-spin" style={{ margin: '0 auto' }} /></div>
        ) : tickets.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center', color: '#5a5a64' }}>
            <Inbox size={30} style={{ margin: '0 auto 12px', opacity: .6 }} />
            <p style={{ fontWeight: 600 }}>No tickets</p>
            <p style={{ fontSize: '0.82rem', marginTop: 4 }}>Escalations from ProvBot and the support form will appear here.</p>
          </div>
        ) : tickets.map(t => (
          <button key={t.id} onClick={() => openTicket(t.id)}
            style={{ display: 'grid', gridTemplateColumns: '92px 90px 1fr 160px 150px', gap: 0, alignItems: 'center', width: '100%', textAlign: 'left', padding: '13px 16px', borderBottom: '1px solid #15151c', background: 'transparent', cursor: 'pointer', color: '#cfcfd6' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.025)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span><Badge fg={PRIORITY_STYLE[t.priority].fg}>● {PRIORITY_STYLE[t.priority].label}</Badge></span>
            <span><Badge bg={STATUS_STYLE[t.status].bg} fg={STATUS_STYLE[t.status].fg}>{STATUS_STYLE[t.status].label}</Badge></span>
            <span style={{ fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 14 }}>{t.message}</span>
            <span style={{ fontSize: '0.78rem', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 10 }}>{t.user_email ?? '—'}</span>
            <span style={{ fontSize: '0.76rem', color: '#777' }}>{new Date(t.created_at).toLocaleDateString()}</span>
          </button>
        ))}
      </div>

      {tickets.length > 0 && <p style={{ marginTop: 10, fontSize: '0.76rem', color: '#55555f' }}>{tickets.length} ticket{tickets.length === 1 ? '' : 's'}</p>}

      {/* Detail drawer */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(2px)' }} />
          <aside className="w-full sm:w-[440px]" style={{ position: 'fixed', top: 0, bottom: 0, right: 0, zIndex: 49, background: '#0c0c12', borderLeft: '1px solid #1f1f29', display: 'flex', flexDirection: 'column', boxShadow: '0 0 60px rgba(0,0,0,.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid #1a1a22' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Ticket detail</div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#8a8a96', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
              {!selected.message ? (
                <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={20} className="animate-spin" style={{ margin: '0 auto', color: '#666' }} /></div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <Badge bg={STATUS_STYLE[selected.status].bg} fg={STATUS_STYLE[selected.status].fg}>{STATUS_STYLE[selected.status].label}</Badge>
                    <Badge fg={PRIORITY_STYLE[selected.priority].fg}>● {PRIORITY_STYLE[selected.priority].label} priority</Badge>
                  </div>

                  <label style={labelStyle}>Message</label>
                  <div style={{ background: '#121219', border: '1px solid #20202a', borderRadius: 10, padding: '12px 14px', fontSize: '0.86rem', lineHeight: 1.55, color: '#dcdce2', whiteSpace: 'pre-wrap', marginBottom: 18 }}>{selected.message}</div>

                  <label style={labelStyle}>Submitted by</label>
                  <div style={{ fontSize: '0.83rem', color: '#bdbdc6', marginBottom: 4 }}>{selected.user?.email ?? selected.user_email ?? '—'}</div>
                  <div style={{ fontSize: '0.74rem', color: '#666', marginBottom: 18 }}>
                    Plan: {selected.user?.access_type ?? '—'} · User ID: {selected.user_id?.slice(0, 8)}…
                  </div>

                  <label style={labelStyle}>Created / Updated</label>
                  <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: 20 }}>{fmtDate(selected.created_at)} · upd {fmtDate(selected.updated_at)}</div>

                  {/* Controls */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Status</label>
                      <select value={selected.status} disabled={saving} onChange={e => patch(selected.id, { status: e.target.value as Status })} style={{ ...inputStyle, width: '100%' }}>
                        <option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Priority</label>
                      <select value={selected.priority} disabled={saving} onChange={e => patch(selected.id, { priority: e.target.value as Priority })} style={{ ...inputStyle, width: '100%' }}>
                        <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            {selected.message && (
              <div style={{ padding: '14px 18px', borderTop: '1px solid #1a1a22', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.74rem', color: saving ? '#FFD700' : '#55555f' }}>{saving ? 'Saving…' : 'Changes save automatically'}</span>
                <button onClick={() => remove(selected.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,92,92,.1)', border: '1px solid rgba(255,92,92,.3)', color: '#ff7a7a', borderRadius: 8, padding: '7px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#55555f', marginBottom: 6 }
