'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { FileVideo, FileImage, FileText, UploadCloud, Loader2, Check, X, Download, Trash2, History, RotateCcw, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'campaign-content'

interface Item {
  id: string; title: string; description: string | null; file_path: string; file_type: string
  file_size: number; status: 'pending' | 'approved' | 'rejected'; review_comment: string | null
  version_num: number; uploaded_at: string; url: string | null
}
interface Version { id: string; version_num: number; notes: string | null; uploaded_at: string; url: string | null }

const STATUS: Record<Item['status'], { bg: string; fg: string; label: string }> = {
  pending: { bg: 'rgba(255,193,7,.14)', fg: '#ffca28', label: 'Pending' },
  approved: { bg: 'rgba(46,160,67,.16)', fg: '#5dd47a', label: 'Approved' },
  rejected: { bg: 'rgba(255,92,92,.14)', fg: '#ff6b6b', label: 'Rejected' },
}
function TypeIcon({ t }: { t: string }) {
  const c = { color: '#FFD700' }; const s = 16
  return t === 'video' ? <FileVideo size={s} style={c} /> : t === 'image' ? <FileImage size={s} style={c} /> : <FileText size={s} style={c} />
}
const fmtSize = (b: number) => b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b >= 1e3 ? `${Math.round(b / 1e3)} KB` : `${b} B`
const kind = (mime: string) => mime.startsWith('video/') ? 'video' : mime.startsWith('image/') ? 'image' : 'document'

export default function ContentPanel({ campaignId }: { campaignId: string }) {
  const supabase = createClient()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState<'all' | Item['status']>('all')
  const [error, setError] = useState('')
  const [versionsFor, setVersionsFor] = useState<string | null>(null)
  const [versions, setVersions] = useState<Version[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const newVerRef = useRef<HTMLInputElement>(null)
  const newVerTarget = useRef<string | null>(null)

  const load = useCallback(async () => {
    try { const d = await (await fetch(`/api/campaigns/${campaignId}/content`)).json(); setItems(d.content ?? []) } catch {}
    setLoading(false)
  }, [campaignId])
  useEffect(() => { load() }, [load])

  // Upload a file: get a signed URL → upload directly to Storage → record metadata.
  async function uploadFile(file: File, onRecorded: (path: string, file: File) => Promise<void>) {
    const res = await fetch('/api/content/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId, filename: file.name }) })
    const u = await res.json()
    if (!res.ok) throw new Error(u.error || 'Could not start upload')
    const { error: upErr } = await supabase.storage.from(BUCKET).uploadToSignedUrl(u.path, u.token, file)
    if (upErr) throw new Error(upErr.message)
    await onRecorded(u.path, file)
  }

  async function onPickNew(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setError(''); setUploading(true)
    try {
      await uploadFile(file, async (path, f) => {
        await fetch(`/api/campaigns/${campaignId}/content`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: f.name, file_path: path, file_type: kind(f.type), file_size: f.size }),
        })
      })
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed') }
    setUploading(false)
  }

  async function onPickVersion(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ''
    const target = newVerTarget.current
    if (!file || !target) return
    setError(''); setUploading(true)
    try {
      await uploadFile(file, async (path) => {
        await fetch(`/api/content/${target}/versions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_path: path, notes: file.name }) })
      })
      await load(); if (versionsFor === target) openVersions(target)
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed') }
    setUploading(false)
  }

  async function review(id: string, decision: 'approved' | 'rejected') {
    let comment = ''
    if (decision === 'rejected') { comment = window.prompt('Reason for rejection (required):') || ''; if (!comment.trim()) return }
    await fetch(`/api/content/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, comment }) })
    load()
  }
  async function del(id: string) {
    if (!confirm('Delete this content and all versions?')) return
    setItems(it => it.filter(i => i.id !== id))
    await fetch(`/api/content/${id}`, { method: 'DELETE' })
  }
  async function openVersions(id: string) {
    if (versionsFor === id) { setVersionsFor(null); return }
    setVersionsFor(id); setVersions([])
    try { const d = await (await fetch(`/api/content/${id}`)).json(); setVersions(d.versions ?? []) } catch {}
  }

  const shown = filter === 'all' ? items : items.filter(i => i.status === filter)

  return (
    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '18px 20px', marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <h2 style={{ color: '#e8e8e8', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <UploadCloud size={16} style={{ color: '#FFD700' }} /> Content
        </h2>
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-gold" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8125rem' }}>
          {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><UploadCloud size={14} /> Upload file</>}
        </button>
        <input ref={fileRef} type="file" onChange={onPickNew} style={{ display: 'none' }} />
        <input ref={newVerRef} type="file" onChange={onPickVersion} style={{ display: 'none' }} />
      </div>
      <p style={{ color: '#666', fontSize: '0.78rem', marginBottom: 14 }}>UGC files for this campaign — up to 50MB each. Review, version, and download.</p>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '5px 11px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
              background: filter === f ? 'rgba(255,215,0,.12)' : 'transparent', border: `1px solid ${filter === f ? 'rgba(255,215,0,.3)' : '#222'}`, color: filter === f ? '#FFD700' : '#888' }}>
            {f}
          </button>
        ))}
      </div>

      {error && <p style={{ color: '#f87171', fontSize: '0.8125rem', marginBottom: 12 }}>{error}</p>}

      {loading ? (
        <p style={{ textAlign: 'center', padding: '24px 0' }}><Loader2 size={18} className="animate-spin" style={{ margin: '0 auto', color: '#666' }} /></p>
      ) : shown.length === 0 ? (
        <p style={{ color: '#555', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>No content {filter !== 'all' ? `(${filter})` : 'yet'}. Upload a file to get started.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map(it => (
            <div key={it.id} style={{ background: '#0e0e0e', border: '1px solid #1a1a1a', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  <TypeIcon t={it.file_type} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: '#e8e8e8', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title} <span style={{ color: '#555', fontSize: '0.72rem' }}>v{it.version_num}</span></p>
                    <p style={{ color: '#666', fontSize: '0.72rem' }}>{fmtSize(it.file_size)} · {new Date(it.uploaded_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ padding: '2px 9px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, background: STATUS[it.status].bg, color: STATUS[it.status].fg }}>{STATUS[it.status].label}</span>
                  {it.url && <a href={it.url} target="_blank" rel="noopener noreferrer" title="Download" style={{ color: '#aaa', padding: 5 }}><Download size={15} /></a>}
                  <button onClick={() => openVersions(it.id)} title="Version history" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 5 }}><History size={15} /></button>
                  <button onClick={() => { newVerTarget.current = it.id; newVerRef.current?.click() }} title="Upload new version" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 5 }}><RotateCcw size={15} /></button>
                  <button onClick={() => del(it.id)} title="Delete" style={{ background: 'none', border: 'none', color: '#a55', cursor: 'pointer', padding: 5 }}><Trash2 size={15} /></button>
                </div>
              </div>

              {it.status === 'rejected' && it.review_comment && (
                <p style={{ color: '#ff8a8a', fontSize: '0.78rem', marginTop: 8, background: 'rgba(255,92,92,.06)', padding: '6px 10px', borderRadius: 7 }}>Rejected: {it.review_comment}</p>
              )}

              {it.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => review(it.id, 'approved')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, background: 'rgba(46,160,67,.12)', border: '1px solid rgba(46,160,67,.4)', color: '#5dd47a', cursor: 'pointer' }}><Check size={14} /> Approve</button>
                  <button onClick={() => review(it.id, 'rejected')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, background: 'rgba(255,92,92,.1)', border: '1px solid rgba(255,92,92,.35)', color: '#ff7a7a', cursor: 'pointer' }}><X size={14} /> Reject</button>
                </div>
              )}

              {versionsFor === it.id && (
                <div style={{ marginTop: 10, borderTop: '1px solid #1a1a1a', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {versions.length === 0 ? <p style={{ color: '#555', fontSize: '0.78rem' }}>Loading versions…</p> : versions.map(v => (
                    <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#999' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>v{v.version_num} <span style={{ color: '#555', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={10} /> {new Date(v.uploaded_at).toLocaleDateString()}</span></span>
                      {v.url && <a href={v.url} target="_blank" rel="noopener noreferrer" style={{ color: '#FFD700', display: 'flex', alignItems: 'center', gap: 4 }}><Download size={12} /> download</a>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
