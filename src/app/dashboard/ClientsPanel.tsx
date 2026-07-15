'use client'

// Clients — the agency's own client/brand roster. Add clients one at a time, or bring
// over an existing spreadsheet (export it to CSV first). Import maps common column names
// automatically and skips clients you already have, so re-importing is safe.

import { useEffect, useRef, useState } from 'react'
import DashboardShell from './DashboardShell'
import { parseCsv, mapRows } from '@/lib/csv'
import { Building2, Plus, Trash2, Upload, Loader2, X, Check, Mail, Tag, User } from 'lucide-react'

interface Client {
  id: string
  name: string
  industry: string | null
  contact_name: string | null
  contact_email: string | null
  notes: string | null
  created_at?: string
}

type ParsedClient = { name: string; industry?: string; contact_name?: string; contact_email?: string; notes?: string }

// Flexible header → field aliases so people's own column names just work.
const ALIASES: Record<keyof ParsedClient, string[]> = {
  name: ['name', 'client', 'client name', 'company', 'company name', 'brand', 'account'],
  industry: ['industry', 'sector', 'category', 'vertical', 'niche'],
  contact_name: ['contact', 'contact name', 'contact person', 'poc', 'primary contact', 'person'],
  contact_email: ['email', 'contact email', 'e-mail', 'email address'],
  notes: ['notes', 'note', 'description', 'comments', 'details'],
}
const POSITIONAL: (keyof ParsedClient)[] = ['name', 'industry', 'contact_name', 'contact_email', 'notes']

// --- UI --------------------------------------------------------------------
const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0f0f0f', border: '1px solid #262626', borderRadius: 8,
  padding: '10px 12px', color: '#f5f5f5', fontSize: '0.9rem', marginBottom: 10,
}
const labelStyle: React.CSSProperties = { fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, display: 'block' }

export default function ClientsPanel() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', industry: '', contact_name: '', contact_email: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<ParsedClient[] | null>(null)
  const [importMsg, setImportMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/clients')
      const d = await res.json()
      setClients(d.clients ?? [])
    } catch { /* leave empty */ }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function addClient(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Client name is required.'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Could not add client.'); setSaving(false); return }
      setForm({ name: '', industry: '', contact_name: '', contact_email: '', notes: '' })
      setShowAdd(false)
      await load()
    } catch { setError('Network error — try again.') }
    setSaving(false)
  }

  async function remove(c: Client) {
    if (!window.confirm(`Remove "${c.name}" from your clients?`)) return
    setClients(prev => prev.filter(x => x.id !== c.id))
    await fetch(`/api/clients?id=${c.id}`, { method: 'DELETE' }).catch(() => {})
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportMsg('')
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = mapRows<ParsedClient>(parseCsv(String(reader.result ?? '')), ALIASES, POSITIONAL, 'name')
      if (!parsed.length) { setImportMsg('No client rows found — make sure the file has a column with client/company names.'); setPreview(null) }
      else setPreview(parsed)
    }
    reader.readAsText(file)
    e.target.value = '' // allow re-selecting the same file
  }

  async function confirmImport() {
    if (!preview?.length) return
    setImporting(true); setImportMsg('')
    try {
      const res = await fetch('/api/clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clients: preview }),
      })
      const d = await res.json()
      if (!res.ok) { setImportMsg(d.error ?? 'Import failed.'); setImporting(false); return }
      setImportMsg(`Imported ${d.imported} client${d.imported === 1 ? '' : 's'}${d.skipped ? ` · skipped ${d.skipped} already in your list` : ''}.`)
      setPreview(null)
      await load()
    } catch { setImportMsg('Network error — try again.') }
    setImporting(false)
  }

  return (
    <DashboardShell active="clients">
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.6rem', fontWeight: 800, color: '#f5f5f5' }}>
              <Building2 size={22} style={{ color: '#FFD700' }} /> Clients
            </h1>
            <p style={{ color: '#888', fontSize: '0.9rem', marginTop: 6 }}>
              The clients and brands your agency works with. Add them here or bring over your existing spreadsheet.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => fileRef.current?.click()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#161616', border: '1px solid #2a2a2a', color: '#e5e5e5', borderRadius: 8, padding: '9px 15px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              <Upload size={15} /> Import spreadsheet
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: 'none' }} />
            <button onClick={() => { setShowAdd(v => !v); setError('') }} className="btn-gold"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 8, padding: '9px 15px', fontSize: '0.85rem', fontWeight: 700 }}>
              <Plus size={16} /> Add client
            </button>
          </div>
        </div>

        {importMsg && (
          <div style={{ background: 'rgba(0,208,132,0.08)', border: '1px solid rgba(0,208,132,0.3)', color: '#4ade80', borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', margin: '14px 0' }}>{importMsg}</div>
        )}

        {/* CSV import preview */}
        {preview && (
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20, margin: '16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong style={{ color: '#f5f5f5' }}>Ready to import {preview.length} client{preview.length === 1 ? '' : 's'}</strong>
              <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #1f1f1f', borderRadius: 8, marginBottom: 14 }}>
              {preview.slice(0, 50).map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '7px 12px', borderBottom: '1px solid #171717', fontSize: '0.82rem', color: '#ccc' }}>
                  <span style={{ color: '#f5f5f5', fontWeight: 600, minWidth: 160 }}>{c.name}</span>
                  <span style={{ color: '#888' }}>{[c.industry, c.contact_name, c.contact_email].filter(Boolean).join(' · ')}</span>
                </div>
              ))}
              {preview.length > 50 && <div style={{ padding: '7px 12px', fontSize: '0.8rem', color: '#666' }}>+ {preview.length - 50} more…</div>}
            </div>
            <button onClick={confirmImport} disabled={importing} className="btn-gold"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 8, padding: '10px 18px', fontWeight: 700 }}>
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Import {preview.length} client{preview.length === 1 ? '' : 's'}
            </button>
          </div>
        )}

        {/* Add form */}
        {showAdd && (
          <form onSubmit={addClient} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20, margin: '16px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Client / brand name *</label>
                <input style={inputStyle} placeholder="Acme Skincare" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Industry</label>
                <input style={inputStyle} placeholder="Beauty" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Contact name</label>
                <input style={inputStyle} placeholder="Jane Doe" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Contact email</label>
                <input style={inputStyle} placeholder="jane@acme.com" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
              </div>
            </div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Retainer since 2024, prefers TikTok creators…" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            {error && <p style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: 10 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} className="btn-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 8, padding: '9px 18px', fontWeight: 700 }}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save client
              </button>
              <button type="button" onClick={() => { setShowAdd(false); setError('') }} style={{ background: 'none', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 8, padding: '9px 18px', fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        )}

        {/* List */}
        <div style={{ marginTop: 20 }}>
          {loading ? (
            <div style={{ color: '#666', padding: '40px 0', textAlign: 'center' }}><Loader2 size={20} className="animate-spin" /></div>
          ) : clients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 20px', border: '1px dashed #2a2a2a', borderRadius: 12, color: '#777' }}>
              <Building2 size={30} style={{ color: '#3a3a3a', marginBottom: 12 }} />
              <p style={{ fontSize: '1rem', color: '#bbb', marginBottom: 6 }}>No clients yet</p>
              <p style={{ fontSize: '0.85rem', marginBottom: 18 }}>Add the clients you work with, or import your existing spreadsheet (save it as CSV first).</p>
              <div style={{ display: 'inline-flex', gap: 10 }}>
                <button onClick={() => fileRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#161616', border: '1px solid #2a2a2a', color: '#e5e5e5', borderRadius: 8, padding: '9px 15px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}><Upload size={15} /> Import spreadsheet</button>
                <button onClick={() => setShowAdd(true)} className="btn-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 8, padding: '9px 15px', fontSize: '0.85rem', fontWeight: 700 }}><Plus size={16} /> Add client</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 10 }}>{clients.length} client{clients.length === 1 ? '' : 's'}</div>
              <div style={{ border: '1px solid #1f1f1f', borderRadius: 12, overflow: 'hidden' }}>
                {clients.map((c, i) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', background: i % 2 ? '#0e0e0e' : '#121212', borderBottom: i < clients.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,215,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#FFD700', fontWeight: 700, fontSize: '0.9rem' }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#f5f5f5', fontWeight: 600, fontSize: '0.92rem' }}>{c.name}</div>
                      <div style={{ display: 'flex', gap: 14, marginTop: 2, flexWrap: 'wrap' }}>
                        {c.industry && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#888', fontSize: '0.78rem' }}><Tag size={12} /> {c.industry}</span>}
                        {c.contact_name && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#888', fontSize: '0.78rem' }}><User size={12} /> {c.contact_name}</span>}
                        {c.contact_email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#888', fontSize: '0.78rem' }}><Mail size={12} /> {c.contact_email}</span>}
                      </div>
                    </div>
                    <button onClick={() => remove(c)} title="Remove client" style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 6, flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f87171')} onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <p style={{ color: '#555', fontSize: '0.78rem', marginTop: 20 }}>
          Importing from Excel/Google Sheets? Export or download it as <strong style={{ color: '#888' }}>CSV</strong> first, then use “Import spreadsheet.” We match columns like name, industry, contact, and email automatically.
        </p>
      </div>
    </DashboardShell>
  )
}
