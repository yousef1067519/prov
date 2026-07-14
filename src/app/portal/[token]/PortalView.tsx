'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, X, Clock, Send, Download, MessageSquare, Loader2, CheckCircle2, FileText } from 'lucide-react'
import type { PortalPayload, Approval, PortalMessage } from '@/lib/portalData'
import { generateCampaignReport, type ReportData } from '@/lib/pdf-generator'

const money = (n: number) => '$' + Math.round(n).toLocaleString()
const ovr = (token: string) => `prov_portal_${token}`

export default function PortalView({ token }: { token: string }) {
  const [data, setData] = useState<PortalPayload | null>(null)
  const [error, setError] = useState('')
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [draft, setDraft] = useState('')
  const [commenting, setCommenting] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [downloading, setDownloading] = useState(false)
  const threadEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/portal/${token}`)
        const d = await res.json()
        if (!d.portal) { setError(d.error || 'Portal not found.'); return }
        const p: PortalPayload = d.portal
        // Merge any local overrides (so demo approvals/messages persist on this device).
        let ovApprovals = p.approvals, ovMessages = p.messages
        try {
          const saved = JSON.parse(localStorage.getItem(ovr(token)) || 'null')
          if (saved) { ovApprovals = saved.approvals ?? ovApprovals; ovMessages = saved.messages ?? ovMessages }
        } catch {}
        setData(p); setApprovals(ovApprovals); setMessages(ovMessages)
      } catch { setError('Could not load portal.') }
    })()
  }, [token])

  function persist(nextApprovals: Approval[], nextMessages: PortalMessage[]) {
    try { localStorage.setItem(ovr(token), JSON.stringify({ approvals: nextApprovals, messages: nextMessages })) } catch {}
  }

  async function decide(a: Approval, status: Approval['status'], comments?: string) {
    const next = approvals.map(x => x.id === a.id ? { ...x, status, comments } : x)
    setApprovals(next); persist(next, messages); setCommenting(null); setComment('')
    fetch('/api/portal/approvals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, approvalId: a.id, status, comments }) }).catch(() => {})
  }

  async function sendMessage() {
    const text = draft.trim()
    if (!text) return
    const msg: PortalMessage = { id: 'm' + Date.now(), sender: 'client', message: text, created_at: new Date().toISOString() }
    const next = [...messages, msg]
    setMessages(next); persist(approvals, next); setDraft('')
    setTimeout(() => threadEnd.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    fetch('/api/portal/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, message: text, sender: 'client', campaignId: data?.campaign.id }) }).catch(() => {})
  }

  async function downloadReport() {
    if (!data) return
    setDownloading(true)
    const m = data.metrics
    const report: ReportData = {
      campaign: data.campaign,
      creatorsContacted: data.progress.creatorsSelected, influencersConfirmed: data.progress.influencersConfirmed, sponsorsMatched: data.progress.sponsorsContacted,
      emails: { sent: m.emailsSent, opened: Math.round(m.emailsSent * m.openRate / 100), clicked: Math.round(m.emailsSent * m.openRate / 100 * 0.4), openRate: m.openRate, clickRate: Math.round(m.openRate * 0.4 * 10) / 10 },
      replies: { count: m.replies, conversion: m.replies ? Math.round((m.dealsClosed / m.replies) * 1000) / 10 : 0 },
      deals: { count: m.dealsClosed, revenue: m.revenue },
      roi: m.revenue ? Math.round(((m.revenue - m.emailsSent * 3) / (m.emailsSent * 3)) * 100) : 0,
      charts: {
        openByType: [{ label: 'Creators', sent: data.progress.creatorsSelected, opened: Math.round(data.progress.creatorsSelected * m.openRate / 100) }, { label: 'Sponsors', sent: data.progress.sponsorsContacted, opened: Math.round(data.progress.sponsorsContacted * m.openRate / 100) }],
        replyOverTime: [{ label: 'Wk 1', value: Math.round(m.replies * 0.2) }, { label: 'Wk 2', value: Math.round(m.replies * 0.4) }, { label: 'Wk 3', value: Math.round(m.replies * 0.3) }, { label: 'Wk 4', value: Math.round(m.replies * 0.1) }],
        revenueBySponsor: m.revenue ? [{ label: data.client.name, value: m.revenue }] : [],
        funnel: [{ label: 'Contacted', value: m.emailsSent }, { label: 'Opened', value: Math.round(m.emailsSent * m.openRate / 100) }, { label: 'Replied', value: m.replies }, { label: 'Deals', value: m.dealsClosed }],
      },
      topInfluencers: [], topSponsors: [],
    }
    try { await generateCampaignReport(report, { brand_name: data.agency.brand, agency_name: data.agency.name }) } catch {}
    setDownloading(false)
  }

  if (error) return <Shell><div style={{ textAlign: 'center', padding: '80px 0', color: '#888' }}><FileText size={40} style={{ opacity: 0.4, marginBottom: 12 }} /><p>{error}</p></div></Shell>
  if (!data) return <Shell><div style={{ textAlign: 'center', padding: '80px 0', color: '#555' }}>Loading your campaign…</div></Shell>

  const pendingCount = approvals.filter(a => a.status === 'pending').length

  return (
    <Shell brand={data.agency.brand}>
      {data.demo && (
        <div style={{ background: 'rgba(102,126,234,0.1)', border: '1px solid rgba(102,126,234,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: '0.8125rem', color: '#b8c0e8' }}>
          This is a live preview of the client portal. Approvals and messages you make here are saved on this device.
        </div>
      )}

      {/* Campaign header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: '#888', fontSize: '0.8125rem' }}>{data.client.name}</p>
        <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.75rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{data.campaign.name}</h1>
        <p style={{ color: '#666', fontSize: '0.875rem', marginTop: 4 }}>{data.campaign.niche} · Started {new Date(data.campaign.created_at).toLocaleDateString()}</p>
      </div>

      {/* Progress */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: '#f0f0f0', fontWeight: 700 }}>{data.progress.stepLabel}</span>
          <span style={{ color: '#888', fontSize: '0.8125rem' }}>Step {data.progress.stepIndex} of {data.progress.totalSteps}</span>
        </div>
        <div style={{ height: 8, background: '#1a1a1a', borderRadius: 4, overflow: 'hidden', marginBottom: 18 }}>
          <div style={{ height: '100%', width: `${(data.progress.stepIndex / data.progress.totalSteps) * 100}%`, background: 'linear-gradient(90deg,#FFD700,#CA8A04)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, textAlign: 'center' }}>
          {[['Creators selected', data.progress.creatorsSelected], ['Influencers confirmed', data.progress.influencersConfirmed], ['Sponsors contacted', data.progress.sponsorsContacted]].map(([l, v]) => (
            <div key={l as string}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFD700', fontFamily: 'var(--font-display)' }}>{v as number}</div>
              <div style={{ fontSize: '0.75rem', color: '#777' }}>{l as string}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, margin: '16px 0' }}>
        {[['Emails sent', String(data.metrics.emailsSent), '#667eea'], ['Open rate', data.metrics.openRate + '%', '#38bdf8'], ['Replies', String(data.metrics.replies), '#FFD700'], ['Deals', String(data.metrics.dealsClosed), '#00D084'], ['Revenue', money(data.metrics.revenue), '#00D084']].map(([l, v, c]) => (
          <div key={l} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.7rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: c, fontFamily: 'var(--font-display)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Content approvals */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ color: '#f0f0f0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={17} style={{ color: '#FFD700' }} /> Content approvals</span>
          {pendingCount > 0 && <span style={{ background: 'rgba(255,215,0,0.12)', color: '#FFD700', borderRadius: 999, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700 }}>{pendingCount} pending</span>}
        </div>
        {approvals.length === 0 && <p style={{ color: '#555', fontSize: '0.875rem', textAlign: 'center', padding: '20px 0' }}>Nothing to review yet.</p>}
        {approvals.map(a => (
          <div key={a.id} style={{ padding: '14px 0', borderTop: '1px solid #1a1a1a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#e8e8e8', fontWeight: 600, fontSize: '0.9375rem' }}>{a.title}</p>
                {a.preview && <p style={{ color: '#888', fontSize: '0.8125rem', marginTop: 4, lineHeight: 1.5 }}>{a.preview}</p>}
                {a.comments && <p style={{ color: '#f59e0b', fontSize: '0.8125rem', marginTop: 6 }}>Your note: {a.comments}</p>}
              </div>
              <StatusBadge status={a.status} />
            </div>
            {a.status === 'pending' && commenting !== a.id && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => decide(a, 'approved')} style={btn('#00D084')}><Check size={14} /> Approve</button>
                <button onClick={() => setCommenting(a.id)} style={btn('#f59e0b', true)}><X size={14} /> Request changes</button>
              </div>
            )}
            {commenting === a.id && (
              <div style={{ marginTop: 12 }}>
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="What changes would you like?" rows={2}
                  style={{ width: '100%', background: '#0d0d0d', border: '1px solid #222', borderRadius: 8, color: '#e8e8e8', fontSize: '0.875rem', padding: '10px', resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => decide(a, 'changes_requested', comment.trim() || undefined)} style={btn('#f59e0b')}>Submit</button>
                  <button onClick={() => { setCommenting(null); setComment('') }} style={btn('#888', true)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>

      {/* Report */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: '#f0f0f0', fontWeight: 700 }}>Campaign report</p>
            <p style={{ color: '#777', fontSize: '0.8125rem', marginTop: 2 }}>Download a full PDF with metrics, charts and ROI.</p>
          </div>
          <button onClick={downloadReport} disabled={downloading} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px' }}>
            {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download PDF
          </button>
        </div>
      </Card>

      {/* Messages */}
      <Card>
        <p style={{ color: '#f0f0f0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><MessageSquare size={17} style={{ color: '#FFD700' }} /> Message your agency</p>
        <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {messages.map(m => (
            <div key={m.id} style={{ alignSelf: m.sender === 'client' ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
              <div style={{ background: m.sender === 'client' ? 'rgba(255,215,0,0.12)' : '#161616', border: `1px solid ${m.sender === 'client' ? 'rgba(255,215,0,0.25)' : '#222'}`, borderRadius: 12, padding: '10px 14px', color: '#e8e8e8', fontSize: '0.875rem', lineHeight: 1.5 }}>{m.message}</div>
              <p style={{ fontSize: '0.6875rem', color: '#555', marginTop: 3, textAlign: m.sender === 'client' ? 'right' : 'left' }}>{m.sender === 'client' ? 'You' : data.agency.name} · {new Date(m.created_at).toLocaleDateString()}</p>
            </div>
          ))}
          <div ref={threadEnd} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message…"
            style={{ flex: 1, background: '#0d0d0d', border: '1px solid #222', borderRadius: 10, color: '#e8e8e8', fontSize: '0.875rem', padding: '11px 14px', outline: 'none' }} />
          <button onClick={sendMessage} className="btn-gold" style={{ padding: '0 16px', display: 'flex', alignItems: 'center' }}><Send size={15} /></button>
        </div>
      </Card>
    </Shell>
  )
}

function Shell({ children, brand = 'Prov' }: { children: React.ReactNode; brand?: string }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <header style={{ borderBottom: '1px solid #1a1a1a', padding: '16px 24px', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 900, fontSize: '1.125rem', color: '#FFD700', fontFamily: 'var(--font-display)' }}>{brand}</span>
          <span style={{ color: '#555', fontSize: '0.8125rem' }}>· Client Portal</span>
        </div>
      </header>
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px 60px' }}>{children}</main>
    </div>
  )
}
function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 16, padding: '20px', marginBottom: 16 }}>{children}</div>
}
function StatusBadge({ status }: { status: Approval['status'] }) {
  const map = { approved: ['#00D084', 'Approved', Check], changes_requested: ['#f59e0b', 'Changes requested', Clock], pending: ['#888', 'Pending', Clock] } as const
  const [c, label, Icon] = map[status]
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: c, fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}><Icon size={13} /> {label}</span>
}
function btn(color: string, outline = false): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
    background: outline ? 'transparent' : `${color}22`, border: `1px solid ${color}${outline ? '44' : '66'}`, color }
}
