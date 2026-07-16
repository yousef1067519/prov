'use client'

// "My assignments" — the member's view of tasks assigned to them, on the main
// dashboard. Mark done inline; full thread and details live on the Team page.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, Check, ChevronRight, Loader2, Bell } from 'lucide-react'
import type { Task } from './TeamAssignments'

const SEEN_KEY = 'prov_seen_tasks'

export default function MyAssignments({ email }: { email?: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [newCount, setNewCount] = useState(0)

  useEffect(() => {
    fetch('/api/tasks?mine=1')
      .then(r => r.json())
      .then(d => {
        const open = (d.tasks ?? []).filter((t: Task) => t.status !== 'done')
        setTasks(open); setLoaded(true)
        // Flag assignments this member hasn't seen before (per-account localStorage).
        try {
          const key = `${SEEN_KEY}:${(email || d.me || 'anon').toLowerCase()}`
          const seen = new Set<string>(JSON.parse(localStorage.getItem(key) || '[]'))
          const fresh = open.filter((t: Task) => !seen.has(t.id))
          setNewCount(fresh.length)
          // Mark everything currently open as seen so the badge clears next visit.
          localStorage.setItem(key, JSON.stringify(open.map((t: Task) => t.id)))
        } catch { /* no-op */ }
      })
      .catch(() => setLoaded(true))
  }, [email])

  async function markDone(t: Task) {
    setBusy(t.id)
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, status: 'done' }),
      })
      if (res.ok) setTasks(prev => prev.filter(x => x.id !== t.id))
    } catch { /* keep */ }
    setBusy(null)
  }

  if (!loaded || tasks.length === 0) return null // nothing assigned — stay out of the way

  return (
    <div className="card-dark" style={{ padding: 20, marginBottom: 24, border: newCount > 0 ? '1px solid rgba(255,215,0,0.4)' : undefined }}>
      {newCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 8, padding: '9px 13px', marginBottom: 14, color: '#FFD700', fontSize: '0.85rem', fontWeight: 600 }}>
          <Bell size={15} /> You have {newCount} new assignment{newCount === 1 ? '' : 's'} from your manager
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
        <ClipboardList size={16} style={{ color: '#FFD700' }} />
        <span style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '0.9375rem' }}>My assignments</span>
        <span style={{ color: '#666', fontSize: '0.8rem' }}>{tasks.length} open</span>
        <Link href="/dashboard/team" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, color: '#888', fontSize: '0.78rem', textDecoration: 'none' }}>
          View all <ChevronRight size={13} />
        </Link>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {tasks.slice(0, 5).map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: 10 }}>
            <button onClick={() => markDone(t)} disabled={busy === t.id} title="Mark done"
              style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'none', border: '1.5px solid #333', color: 'transparent', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#00D084'; e.currentTarget.style.color = '#00D084' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = 'transparent' }}>
              {busy === t.id ? <Loader2 size={12} className="animate-spin" style={{ color: '#00D084' }} /> : <Check size={12} strokeWidth={3} />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#e8e8e8', fontWeight: 600, fontSize: '0.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
              <div style={{ color: '#666', fontSize: '0.72rem', marginTop: 1 }}>
                from {t.created_by_email ?? 'your manager'}
                {t.due_date && ` · due ${new Date(t.due_date + 'T00:00:00').toLocaleDateString()}`}
                {t.comments.length > 0 && ` · ${t.comments.length} comment${t.comments.length === 1 ? '' : 's'}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
