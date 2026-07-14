'use client'

import { useEffect, useRef, useState } from 'react'
import { Users, Copy, Check, Plus, ExternalLink, Trash2, Eye, Loader2 } from 'lucide-react'
import DashboardShell from './DashboardShell'

interface ContentItem { id: string; title: string; preview: string; status?: string }
interface PortalConfig { token: string; clientName: string; clientEmail: string; content: ContentItem[] }
interface Campaign { id: string; name: string; niche?: string }

export default function ClientPortalPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [configs, setConfigs] = useState<Record<string, PortalConfig>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState('')
  const [origin, setOrigin] = useState('')
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  async function load() {
    try {
      const res = await fetch('/api/portal/admin')
      const d = await res.json()
      setCampaigns(d.campaigns ?? [])
      setConfigs(d.configs ?? {})
    } catch { /* leave empty */ }
    setLoading(false)
  }
  useEffect(() => { setOrigin(window.location.origin); load() }, [])

  async function api(body: Record<string, unknown>) {
    const res = await fetch('/api/portal/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return res.json().catch(() => ({}))
  }
  // Debounce background saves for text fields so we don't POST on every keystroke.
  function debounce(key: string, fn: () => void) {
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(fn, 500)
  }

  async function enable(c: Campaign) {
    setBusy(c.id)
    const d = await api({ action: 'enable', campaignId: c.id })
    if (d.token) setConfigs(p => ({ ...p, [c.id]: { token: d.token, clientName: '', clientEmail: '', content: [] } }))
    setBusy('')
  }
  async function disable(id: string) {
    setBusy(id)
    await api({ action: 'disable', campaignId: id })
    setConfigs(p => { const n = { ...p }; delete n[id]; return n })
    setBusy('')
  }
  function setDetails(id: string, patch: Partial<PortalConfig>) {
    setConfigs(p => ({ ...p, [id]: { ...p[id], ...patch } }))
    debounce(`d-${id}`, () => {
      const cfg = { ...configs[id], ...patch }
      api({ action: 'details', campaignId: id, clientName: cfg.clientName, clientEmail: cfg.clientEmail })
    })
  }
  async function addContent(id: string) {
    const d = await api({ action: 'content_add', campaignId: id, title: '', preview: '' })
    if (d.id) setConfigs(p => ({ ...p, [id]: { ...p[id], content: [...p[id].content, { id: d.id, title: '', preview: '', status: 'pending' }] } }))
  }
  function updateContent(id: string, cid: string, patch: Partial<ContentItem>) {
    setConfigs(p => ({ ...p, [id]: { ...p[id], content: p[id].content.map(x => x.id === cid ? { ...x, ...patch } : x) } }))
    debounce(`c-${cid}`, () => {
      const item = { ...configs[id].content.find(x => x.id === cid), ...patch } as ContentItem
      api({ action: 'content_update', campaignId: id, contentId: cid, title: item.title, preview: item.preview })
    })
  }
  async function removeContent(id: string, cid: string) {
    setConfigs(p => ({ ...p, [id]: { ...p[id], content: p[id].content.filter(x => x.id !== cid) } }))
    await api({ action: 'content_remove', campaignId: id, contentId: cid })
  }

  function copyLink(token: string) {
    navigator.clipboard?.writeText(`${origin}/portal/${token}`).then(() => { setCopied(token); setTimeout(() => setCopied(''), 2000) })
  }

  return (
    <DashboardShell active="portal">
      <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Users size={22} style={{ color: '#FFD700' }} />
          <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Client Portal</h1>
        </div>
        <p style={{ color: '#666', marginTop: 4, marginBottom: 20 }}>Give each client a private link to track progress, approve content, message you, and download reports — no login required.</p>

        <div style={{ background: 'rgba(102,126,234,0.08)', border: '1px solid rgba(102,126,234,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.8125rem', color: '#b8c0e8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span>Want to see what clients see? Open the live demo portal.</span>
          <a href="/portal/demo" target="_blank" style={{ color: '#FFD700', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', fontWeight: 600 }}><Eye size={14} /> View demo</a>
        </div>

        {loading ? <p style={{ color: '#555', padding: 30 }}>Loading…</p> : campaigns.length === 0 ? (
          <div style={{ background: '#0f0f0f', border: '1px dashed #262626', borderRadius: 14, padding: '40px', textAlign: 'center', color: '#777' }}>
            Create a campaign first — then you can give its client a private portal here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {campaigns.map(c => {
              const cfg = configs[c.id]
              return (
                <div key={c.id} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ color: '#f0f0f0', fontWeight: 700 }}>{c.name}</p>
                      <p style={{ color: '#666', fontSize: '0.8125rem', marginTop: 2 }}>{c.niche || 'General'}</p>
                    </div>
                    {!cfg
                      ? <button onClick={() => enable(c)} disabled={busy === c.id} className="btn-gold" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>{busy === c.id ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Enable portal</button>
                      : <button onClick={() => disable(c.id)} disabled={busy === c.id} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#888', padding: '7px 12px', fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Trash2 size={13} /> Disable</button>}
                  </div>

                  {cfg && (
                    <div style={{ marginTop: 16, borderTop: '1px solid #1a1a1a', paddingTop: 16 }}>
                      {/* Share link */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 220, background: '#0d0d0d', border: '1px solid #222', borderRadius: 8, padding: '9px 12px', color: '#9aa6e8', fontSize: '0.8125rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {origin}/portal/{cfg.token}
                        </div>
                        <button onClick={() => copyLink(cfg.token)} style={{ background: copied === cfg.token ? 'rgba(0,208,132,0.12)' : 'rgba(255,215,0,0.1)', border: `1px solid ${copied === cfg.token ? 'rgba(0,208,132,0.4)' : 'rgba(255,215,0,0.3)'}`, borderRadius: 8, color: copied === cfg.token ? '#00D084' : '#FFD700', padding: '0 14px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {copied === cfg.token ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                        </button>
                        <a href={`/portal/${cfg.token}`} target="_blank" style={{ background: 'transparent', border: '1px solid #222', borderRadius: 8, color: '#aaa', padding: '9px 12px', fontSize: '0.8125rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}><ExternalLink size={13} /> Open</a>
                      </div>

                      {/* Client details */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                        <input value={cfg.clientName} onChange={e => setDetails(c.id, { clientName: e.target.value })} placeholder="Client name" style={inp} />
                        <input value={cfg.clientEmail} onChange={e => setDetails(c.id, { clientEmail: e.target.value })} placeholder="Client email" style={inp} />
                      </div>

                      {/* Content for approval */}
                      <p style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Content for approval</p>
                      {cfg.content.map(item => (
                        <div key={item.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <input value={item.title} onChange={e => updateContent(c.id, item.id, { title: e.target.value })} placeholder="Title (e.g. Marques Lee — Integration script)" style={inp} />
                            <textarea value={item.preview} onChange={e => updateContent(c.id, item.id, { preview: e.target.value })} placeholder="Short description the client will review" rows={2} style={{ ...inp, resize: 'vertical' }} />
                          </div>
                          <button onClick={() => removeContent(c.id, item.id)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 6 }}><Trash2 size={15} /></button>
                        </div>
                      ))}
                      <button onClick={() => addContent(c.id)} style={{ background: 'none', border: '1px dashed #2a2a2a', borderRadius: 8, color: '#888', padding: '8px 14px', fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Add content item</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}

const inp: React.CSSProperties = { width: '100%', background: '#0d0d0d', border: '1px solid #222', borderRadius: 8, color: '#e8e8e8', fontSize: '0.875rem', padding: '10px 12px', outline: 'none' }
