'use client'

// Contacts — the agency's own creator/influencer rolodex. Bring over an existing
// spreadsheet (export to CSV first): the parser maps common columns (name/creator,
// handle/username, platform, niche, followers/subscribers, email, notes) and skips
// contacts you already have. Private to your workspace — not the shared 40k catalog.

import { useEffect, useRef, useState } from 'react'
import DashboardShell from './DashboardShell'
import { parseCsv, mapRows } from '@/lib/csv'
import { Users, Plus, Trash2, Upload, Loader2, X, Check, AtSign } from 'lucide-react'

interface Contact {
  id: string
  name: string
  handle: string | null
  platform: string | null
  niche: string | null
  followers: number | null
  email: string | null
  notes: string | null
}
type ParsedContact = { name: string; handle?: string; platform?: string; niche?: string; followers?: string; email?: string; notes?: string }

const ALIASES: Record<keyof ParsedContact, string[]> = {
  name: ['name', 'creator', 'influencer', 'contact', 'full name', 'creator name'],
  handle: ['handle', 'username', 'user', 'ig', 'instagram', 'tiktok', 'youtube', 'channel', '@'],
  platform: ['platform', 'network', 'channel type', 'social'],
  niche: ['niche', 'category', 'vertical', 'industry', 'topic'],
  followers: ['followers', 'subscribers', 'subs', 'audience', 'reach', 'count', 'following'],
  email: ['email', 'e-mail', 'contact email', 'email address'],
  notes: ['notes', 'note', 'description', 'comments', 'details'],
}
const POSITIONAL: (keyof ParsedContact)[] = ['name', 'handle', 'platform', 'followers', 'email', 'niche', 'notes']

const fmtFollowers = (n: number | null) => n == null ? '' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n)

const inputStyle: React.CSSProperties = { width: '100%', background: '#0f0f0f', border: '1px solid #262626', borderRadius: 8, padding: '10px 12px', color: '#f5f5f5', fontSize: '0.9rem', marginBottom: 10 }
const labelStyle: React.CSSProperties = { fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, display: 'block' }

export default function ContactsPanel() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', handle: '', platform: '', niche: '', followers: '', email: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<ParsedContact[] | null>(null)
  const [importMsg, setImportMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try { const res = await fetch('/api/contacts'); const d = await res.json(); setContacts(d.contacts ?? []) }
    catch { /* leave empty */ }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function addContact(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() && !form.handle.trim()) { setError('A name or handle is required.'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Could not add contact.'); setSaving(false); return }
      setForm({ name: '', handle: '', platform: '', niche: '', followers: '', email: '', notes: '' })
      setShowAdd(false)
      await load()
    } catch { setError('Network error — try again.') }
    setSaving(false)
  }

  async function remove(c: Contact) {
    if (!window.confirm(`Remove "${c.name}" from your contacts?`)) return
    setContacts(prev => prev.filter(x => x.id !== c.id))
    await fetch(`/api/contacts?id=${c.id}`, { method: 'DELETE' }).catch(() => {})
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportMsg('')
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = mapRows<ParsedContact>(parseCsv(String(reader.result ?? '')), ALIASES, POSITIONAL, 'name')
      if (!parsed.length) { setImportMsg('No contacts found — make sure the file has a column with creator names or handles.'); setPreview(null) }
      else setPreview(parsed)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function confirmImport() {
    if (!preview?.length) return
    setImporting(true); setImportMsg('')
    try {
      const res = await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contacts: preview }) })
      const d = await res.json()
      if (!res.ok) { setImportMsg(d.error ?? 'Import failed.'); setImporting(false); return }
      setImportMsg(`Imported ${d.imported.toLocaleString()} contact${d.imported === 1 ? '' : 's'}${d.skipped ? ` · skipped ${d.skipped.toLocaleString()} already in your list` : ''}.`)
      setPreview(null)
      await load()
    } catch { setImportMsg('Network error — try again.') }
    setImporting(false)
  }

  return (
    <DashboardShell active="contacts">
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.6rem', fontWeight: 800, color: '#f5f5f5' }}>
              <Users size={22} style={{ color: '#FFD700' }} /> Contacts
            </h1>
            <p style={{ color: '#888', fontSize: '0.9rem', marginTop: 6, maxWidth: 560 }}>
              Your own creator rolodex. Bring over the relationships you already have — our 40k discovery catalog is just a bonus on top of your list.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => fileRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#161616', border: '1px solid #2a2a2a', color: '#e5e5e5', borderRadius: 8, padding: '9px 15px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              <Upload size={15} /> Import spreadsheet
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: 'none' }} />
            <button onClick={() => { setShowAdd(v => !v); setError('') }} className="btn-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 8, padding: '9px 15px', fontSize: '0.85rem', fontWeight: 700 }}>
              <Plus size={16} /> Add contact
            </button>
          </div>
        </div>

        {importMsg && <div style={{ background: 'rgba(0,208,132,0.08)', border: '1px solid rgba(0,208,132,0.3)', color: '#4ade80', borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', margin: '14px 0' }}>{importMsg}</div>}

        {preview && (
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20, margin: '16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong style={{ color: '#f5f5f5' }}>Ready to import {preview.length.toLocaleString()} contact{preview.length === 1 ? '' : 's'}</strong>
              <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #1f1f1f', borderRadius: 8, marginBottom: 14 }}>
              {preview.slice(0, 50).map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '7px 12px', borderBottom: '1px solid #171717', fontSize: '0.82rem', color: '#ccc' }}>
                  <span style={{ color: '#f5f5f5', fontWeight: 600, minWidth: 150 }}>{c.name}</span>
                  <span style={{ color: '#888' }}>{[c.handle && '@' + c.handle.replace(/^@/, ''), c.platform, c.followers, c.email].filter(Boolean).join(' · ')}</span>
                </div>
              ))}
              {preview.length > 50 && <div style={{ padding: '7px 12px', fontSize: '0.8rem', color: '#666' }}>+ {(preview.length - 50).toLocaleString()} more…</div>}
            </div>
            <button onClick={confirmImport} disabled={importing} className="btn-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 8, padding: '10px 18px', fontWeight: 700 }}>
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Import {preview.length.toLocaleString()}
            </button>
          </div>
        )}

        {showAdd && (
          <form onSubmit={addContact} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20, margin: '16px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div><label style={labelStyle}>Name *</label><input style={inputStyle} placeholder="Marathon Mia" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
              <div><label style={labelStyle}>Handle</label><input style={inputStyle} placeholder="@marathon.mia" value={form.handle} onChange={e => setForm({ ...form, handle: e.target.value })} /></div>
              <div><label style={labelStyle}>Platform</label><input style={inputStyle} placeholder="Instagram" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} /></div>
              <div><label style={labelStyle}>Followers</label><input style={inputStyle} placeholder="120000" value={form.followers} onChange={e => setForm({ ...form, followers: e.target.value })} /></div>
              <div><label style={labelStyle}>Niche</label><input style={inputStyle} placeholder="Fitness" value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })} /></div>
              <div><label style={labelStyle}>Email</label><input style={inputStyle} placeholder="mia@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 54, resize: 'vertical' }} placeholder="Worked on 2 campaigns, great engagement…" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            {error && <p style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: 10 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} className="btn-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 8, padding: '9px 18px', fontWeight: 700 }}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save contact
              </button>
              <button type="button" onClick={() => { setShowAdd(false); setError('') }} style={{ background: 'none', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 8, padding: '9px 18px', fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        )}

        <div style={{ marginTop: 20 }}>
          {loading ? (
            <div style={{ color: '#666', padding: '40px 0', textAlign: 'center' }}><Loader2 size={20} className="animate-spin" /></div>
          ) : contacts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 20px', border: '1px dashed #2a2a2a', borderRadius: 12, color: '#777' }}>
              <Users size={30} style={{ color: '#3a3a3a', marginBottom: 12 }} />
              <p style={{ fontSize: '1rem', color: '#bbb', marginBottom: 6 }}>No contacts yet</p>
              <p style={{ fontSize: '0.85rem', marginBottom: 18 }}>Import the creator list you already have (export your sheet as CSV first), or add one by hand.</p>
              <div style={{ display: 'inline-flex', gap: 10 }}>
                <button onClick={() => fileRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#161616', border: '1px solid #2a2a2a', color: '#e5e5e5', borderRadius: 8, padding: '9px 15px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}><Upload size={15} /> Import spreadsheet</button>
                <button onClick={() => setShowAdd(true)} className="btn-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 8, padding: '9px 15px', fontSize: '0.85rem', fontWeight: 700 }}><Plus size={16} /> Add contact</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 10 }}>{contacts.length.toLocaleString()} contact{contacts.length === 1 ? '' : 's'}</div>
              <div style={{ border: '1px solid #1f1f1f', borderRadius: 12, overflow: 'hidden' }}>
                {contacts.slice(0, 500).map((c, i) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: i % 2 ? '#0e0e0e' : '#121212', borderBottom: i < Math.min(contacts.length, 500) - 1 ? '1px solid #1a1a1a' : 'none' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,215,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#FFD700', fontWeight: 700, fontSize: '0.9rem' }}>{c.name.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.92rem' }}>{c.name}</div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 2, flexWrap: 'wrap' }}>
                        {c.handle && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#888', fontSize: '0.78rem' }}><AtSign size={11} />{c.handle}</span>}
                        {c.platform && <span style={{ color: '#888', fontSize: '0.78rem' }}>{c.platform}</span>}
                        {c.followers != null && <span style={{ color: '#FFD700', fontSize: '0.78rem' }}>{fmtFollowers(c.followers)}</span>}
                        {c.niche && <span style={{ color: '#888', fontSize: '0.78rem' }}>{c.niche}</span>}
                        {c.email && <span style={{ color: '#666', fontSize: '0.78rem' }}>{c.email}</span>}
                      </div>
                    </div>
                    <button onClick={() => remove(c)} title="Remove contact" style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 6, flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f87171')} onMouseLeave={e => (e.currentTarget.style.color = '#555')}><Trash2 size={16} /></button>
                  </div>
                ))}
                {contacts.length > 500 && <div style={{ padding: '10px 16px', fontSize: '0.8rem', color: '#666', background: '#0e0e0e' }}>Showing first 500 of {contacts.length.toLocaleString()}.</div>}
              </div>
            </>
          )}
        </div>

        <p style={{ color: '#555', fontSize: '0.78rem', marginTop: 20 }}>
          Importing from Excel/Google Sheets? Export as <strong style={{ color: '#888' }}>CSV</strong> first. We auto-match columns like name, handle/username, platform, followers/subscribers, niche, and email — your column order doesn’t have to match ours.
        </p>
      </div>
    </DashboardShell>
  )
}
