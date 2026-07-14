'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, StickyNote, Loader2, Trash2, Pencil, Check, X, Clock } from 'lucide-react'
import DashboardShell from './DashboardShell'
import ContentPanel from './ContentPanel'

interface Campaign { id: string; name?: string; niche?: string; status?: string; created_at?: string }
interface Note { id: string; note: string; author_email: string | null; created_at: string; updated_at: string }

const card: React.CSSProperties = { background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '18px 20px' }

export default function CampaignDetail({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const loadNotes = useCallback(async () => {
    try { const d = await (await fetch(`/api/campaigns/${campaignId}/notes`)).json(); setNotes(d.notes ?? []) } catch {}
  }, [campaignId])

  useEffect(() => {
    (async () => {
      try {
        const d = await (await fetch('/api/campaigns')).json()
        const found = (d.campaigns ?? []).find((c: Campaign) => c.id === campaignId)
        setCampaign(found ?? { id: campaignId })
      } catch { setCampaign({ id: campaignId }) }
      await loadNotes()
      setLoading(false)
    })()
  }, [campaignId, loadNotes])

  async function addNote() {
    const text = draft.trim(); if (!text) return
    setAdding(true)
    try {
      await fetch(`/api/campaigns/${campaignId}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: text }) })
      setDraft(''); loadNotes()
    } finally { setAdding(false) }
  }
  async function saveEdit(id: string) {
    const text = editText.trim(); if (!text) return
    await fetch(`/api/campaigns/${campaignId}/notes`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ noteId: id, note: text }) })
    setEditId(null); loadNotes()
  }
  async function del(id: string) {
    setNotes(ns => ns.filter(n => n.id !== id))
    await fetch(`/api/campaigns/${campaignId}/notes?noteId=${id}`, { method: 'DELETE' })
  }

  return (
    <DashboardShell active="crm">
      <div style={{ padding: '24px 28px', maxWidth: 820, margin: '0 auto' }}>
        <Link href="/dashboard/crm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#777', fontSize: '0.8125rem', textDecoration: 'none', marginBottom: 16 }}>
          <ArrowLeft size={15} /> Back
        </Link>

        {/* Campaign header */}
        <div style={{ ...card, marginBottom: 20 }}>
          <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.35rem', fontFamily: 'var(--font-display)' }}>{campaign?.name || 'Campaign'}</h1>
          <p style={{ color: '#666', fontSize: '0.85rem', marginTop: 4 }}>
            {(campaign?.niche || 'General')}{campaign?.status ? ` · ${campaign.status}` : ''}{campaign?.created_at ? ` · started ${new Date(campaign.created_at).toLocaleDateString()}` : ''}
          </p>
        </div>

        {/* Internal notes */}
        <div style={card}>
          <h2 style={{ color: '#e8e8e8', fontWeight: 700, fontSize: '0.95rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <StickyNote size={16} style={{ color: '#FFD700' }} /> Internal notes
          </h2>
          <p style={{ color: '#666', fontSize: '0.78rem', marginBottom: 14 }}>Private to your team — never shown to clients or creators.</p>

          {/* Composer */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <textarea value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }}
              placeholder="Add an internal note… (⌘/Ctrl+Enter to save)" rows={2}
              style={{ flex: 1, resize: 'vertical', background: '#0d0d0d', border: '1px solid #222', borderRadius: 8, color: '#e8e8e8', fontSize: '0.875rem', padding: '10px 12px', outline: 'none', fontFamily: 'inherit' }} />
            <button onClick={addNote} disabled={adding || !draft.trim()} className="btn-gold" style={{ padding: '0 18px', alignSelf: 'stretch', display: 'flex', alignItems: 'center', gap: 7 }}>
              {adding ? <Loader2 size={15} className="animate-spin" /> : 'Add'}
            </button>
          </div>

          {loading ? (
            <p style={{ color: '#555', textAlign: 'center', padding: '20px 0' }}><Loader2 size={18} className="animate-spin" style={{ margin: '0 auto' }} /></p>
          ) : notes.length === 0 ? (
            <p style={{ color: '#555', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>No notes yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notes.map(n => (
                <div key={n.id} style={{ background: '#0e0e0e', border: '1px solid #1a1a1a', borderRadius: 10, padding: '12px 14px' }}>
                  {editId === n.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2}
                        style={{ flex: 1, resize: 'vertical', background: '#0d0d0d', border: '1px solid #222', borderRadius: 8, color: '#e8e8e8', fontSize: '0.875rem', padding: '8px 10px', outline: 'none', fontFamily: 'inherit' }} />
                      <button onClick={() => saveEdit(n.id)} title="Save" style={{ background: 'rgba(0,208,132,.12)', border: '1px solid rgba(0,208,132,.4)', color: '#00D084', borderRadius: 8, padding: '0 10px', cursor: 'pointer' }}><Check size={15} /></button>
                      <button onClick={() => setEditId(null)} title="Cancel" style={{ background: 'none', border: '1px solid #222', color: '#888', borderRadius: 8, padding: '0 10px', cursor: 'pointer' }}><X size={15} /></button>
                    </div>
                  ) : (
                    <>
                      <p style={{ color: '#dcdce2', fontSize: '0.875rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{n.note}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                        <span style={{ color: '#555', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                          {n.author_email || 'You'} · <Clock size={10} /> {new Date(n.created_at).toLocaleString()}{n.updated_at !== n.created_at ? ' (edited)' : ''}
                        </span>
                        <span style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => { setEditId(n.id); setEditText(n.note) }} title="Edit" style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 4 }}><Pencil size={13} /></button>
                          <button onClick={() => del(n.id)} title="Delete" style={{ background: 'none', border: 'none', color: '#a55', cursor: 'pointer', padding: 4 }}><Trash2 size={13} /></button>
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <ContentPanel campaignId={campaignId} />
      </div>
    </DashboardShell>
  )
}
