'use client'

// Assignments — the manager's view on the Team page. Create tasks, assign them to
// members, watch status, and talk in a per-task comment thread. Members see their
// own queue on the dashboard ("My assignments") and can mark their work done.

import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, Loader2, Plus, Trash2, MessageSquare, ChevronDown, Send } from 'lucide-react'

interface TaskComment { by: string; text: string; at: string }
export interface Task {
  id: string
  title: string
  notes: string | null
  status: 'open' | 'in_progress' | 'done'
  assignee_email: string | null
  due_date: string | null
  comments: TaskComment[]
  created_by_email: string | null
  created_at: string
}

const STATUS_META: Record<Task['status'], { label: string; color: string }> = {
  open: { label: 'Open', color: '#ffca28' },
  in_progress: { label: 'In progress', color: '#38bdf8' },
  done: { label: 'Done', color: '#00D084' },
}
const NEXT_STATUS: Record<Task['status'], Task['status']> = { open: 'in_progress', in_progress: 'done', done: 'open' }

const inputStyle: React.CSSProperties = {
  background: '#121218', border: '1px solid #24242e', borderRadius: 8, color: '#e8e8ee',
  fontSize: '0.8125rem', padding: '8px 10px', outline: 'none',
}

function TaskRow({ t, me, canManage, onChanged, onDeleted }: {
  t: Task; me: string | null; canManage: boolean
  onChanged: (t: Task) => void; onDeleted: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const meta = STATUS_META[t.status]
  const mine = !!me && (t.assignee_email ?? '').toLowerCase() === me.toLowerCase()
  const canMove = canManage || mine

  async function patch(body: Record<string, unknown>) {
    setBusy(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, ...body }),
      })
      const d = await res.json()
      if (res.ok) onChanged(d.task)
    } catch { /* keep state */ }
    setBusy(false)
  }

  async function remove() {
    if (!window.confirm(`Delete "${t.title}"?`)) return
    setBusy(true)
    const res = await fetch(`/api/tasks?id=${t.id}`, { method: 'DELETE' }).catch(() => null)
    if (res?.ok) onDeleted(t.id)
    setBusy(false)
  }

  return (
    <div style={{ background: '#0d0d13', border: '1px solid #1c1c24', borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px' }}>
        <button onClick={() => canMove && patch({ status: NEXT_STATUS[t.status] })} disabled={busy || !canMove}
          title={canMove ? `Mark ${STATUS_META[NEXT_STATUS[t.status]].label.toLowerCase()}` : 'Only the assignee or a manager can change status'}
          style={{ fontSize: '0.68rem', fontWeight: 700, color: meta.color, border: `1px solid ${meta.color}44`, background: `${meta.color}11`, borderRadius: 99, padding: '3px 10px', whiteSpace: 'nowrap', cursor: canMove ? 'pointer' : 'default' }}>
          {busy ? '…' : meta.label}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: t.status === 'done' ? '#666' : '#e8e8ee', fontWeight: 600, fontSize: '0.86rem', textDecoration: t.status === 'done' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
          <div style={{ color: '#666', fontSize: '0.72rem', marginTop: 2 }}>
            {t.assignee_email ? `→ ${t.assignee_email}` : 'Unassigned'}
            {t.due_date && ` · due ${new Date(t.due_date + 'T00:00:00').toLocaleDateString()}`}
            {t.comments.length > 0 && ` · ${t.comments.length} comment${t.comments.length === 1 ? '' : 's'}`}
          </div>
        </div>
        <button onClick={() => setOpen(o => !o)} title="Comments & details"
          style={{ background: 'none', border: 'none', color: '#8a8a96', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 6 }}>
          <MessageSquare size={14} />
          <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>
        {canManage && (
          <button onClick={remove} disabled={busy} title="Delete"
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 6 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')} onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {open && (
        <div style={{ borderTop: '1px solid #16161e', padding: '12px 14px' }}>
          {t.notes && <p style={{ color: '#a8a8b2', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{t.notes}</p>}
          {t.comments.length > 0 && (
            <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              {t.comments.map((c, i) => (
                <div key={i} style={{ background: '#121219', border: '1px solid #20202a', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#FFD700', marginBottom: 3 }}>{c.by} · {new Date(c.at).toLocaleString()}</div>
                  <div style={{ fontSize: '0.82rem', color: '#d5d5dc', whiteSpace: 'pre-wrap' }}>{c.text}</div>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={e => { e.preventDefault(); if (comment.trim()) { patch({ comment }); setComment('') } }} style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="Write a comment…" value={comment} onChange={e => setComment(e.target.value)} maxLength={1000} />
            <button type="submit" disabled={busy || !comment.trim()}
              style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#FFD700', borderColor: 'rgba(255,215,0,.3)' }}>
              <Send size={13} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function TeamAssignments({ memberEmails }: { memberEmails: string[] }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [me, setMe] = useState<string | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', notes: '', assignee_email: '', due_date: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      const d = await res.json()
      if (res.ok) { setTasks(d.tasks ?? []); setMe(d.me ?? null); setCanManage(!!d.canManage) }
    } catch { /* keep */ }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setErr('Give the task a title.'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok) { setErr(d.error ?? 'Could not create the task.'); setSaving(false); return }
      setTasks(prev => [d.task, ...prev])
      setForm({ title: '', notes: '', assignee_email: '', due_date: '' })
      setShowAdd(false)
    } catch { setErr('Network error — try again.') }
    setSaving(false)
  }

  const openCount = tasks.filter(t => t.status !== 'done').length

  return (
    <div className="card-dark" style={{ padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ color: '#e8e8e8', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardList size={16} style={{ color: '#FFD700' }} /> Assignments
          {openCount > 0 && <span style={{ color: '#666', fontWeight: 500, fontSize: '0.8rem' }}>{openCount} open</span>}
        </h2>
        {canManage && (
          <button onClick={() => setShowAdd(v => !v)} className="btn-gold"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, padding: '7px 13px', fontSize: '0.8rem', fontWeight: 700 }}>
            <Plus size={14} /> Assign a task
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={create} style={{ background: '#0d0d13', border: '1px solid #1c1c24', borderRadius: 10, padding: 14, marginBottom: 14, display: 'grid', gap: 10 }}>
          <input style={inputStyle} placeholder="What needs to get done? *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus maxLength={200} />
          <textarea style={{ ...inputStyle, minHeight: 54, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Details (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} maxLength={2000} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select style={{ ...inputStyle, flex: 1, minWidth: 180 }} value={form.assignee_email} onChange={e => setForm({ ...form, assignee_email: e.target.value })}>
              <option value="">Assign to…</option>
              {[...new Set([...(me ? [me] : []), ...memberEmails])].map(m => (
                <option key={m} value={m}>{me && m.toLowerCase() === me.toLowerCase() ? `${m} (me)` : m}</option>
              ))}
            </select>
            <input type="date" style={inputStyle} value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            <button type="submit" disabled={saving} className="btn-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 700 }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Assign
            </button>
          </div>
          {err && <p style={{ color: '#f87171', fontSize: '0.8rem' }}>{err}</p>}
        </form>
      )}

      {loading ? (
        <div style={{ color: '#666', textAlign: 'center', padding: '24px 0' }}><Loader2 size={18} className="animate-spin" /></div>
      ) : tasks.length === 0 ? (
        <p style={{ color: '#555', fontSize: '0.85rem', textAlign: 'center', padding: '18px 0' }}>
          No assignments yet{canManage ? ' — assign the first task to a teammate.' : '.'}
        </p>
      ) : (
        tasks.map(t => (
          <TaskRow key={t.id} t={t} me={me} canManage={canManage}
            onChanged={u => setTasks(prev => prev.map(x => x.id === u.id ? u : x))}
            onDeleted={id => setTasks(prev => prev.filter(x => x.id !== id))} />
        ))
      )}
    </div>
  )
}
