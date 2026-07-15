'use client'

// Admin › Blog — review AI-generated drafts, publish/unpublish, manage the topic
// queue, and trigger generation on demand. Articles are written by the daily cron
// (api/cron/blog) or the "Generate now" button; drafts by default.

import { useCallback, useEffect, useState } from 'react'
import { FileText, Loader2, Plus, Sparkles, Trash2, Eye, EyeOff, ExternalLink } from 'lucide-react'

interface Post { id: string; slug: string; title: string; published: boolean; created_at: string; published_at: string | null }
interface Topic { id: string; topic: string; status: 'queued' | 'generating' | 'done' | 'failed'; position: number; error: string | null }

const chip = (color: string): React.CSSProperties => ({
  fontSize: '0.68rem', color, border: `1px solid ${color}44`, background: `${color}11`,
  borderRadius: 99, padding: '2px 9px', whiteSpace: 'nowrap', fontWeight: 600,
})
const TOPIC_COLORS: Record<Topic['status'], string> = { queued: '#9a9aa2', generating: '#38bdf8', done: '#5dd47a', failed: '#ff6b6b' }

export default function AdminBlog() {
  const [posts, setPosts] = useState<Post[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [newTopic, setNewTopic] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/blog')
      const d = await res.json()
      if (res.ok) { setPosts(d.posts ?? []); setTopics(d.topics ?? []) }
    } catch { /* keep last state */ }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function generate(topic?: string) {
    setBusy('generate'); setMsg('')
    try {
      const res = await fetch('/api/admin/blog', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', ...(topic ? { topic } : {}) }),
      })
      const d = await res.json()
      setMsg(res.ok ? `Draft written: “${d.post.title}” — review it below, then publish.` : d.error ?? 'Generation failed')
      await load()
    } catch { setMsg('Network error') }
    setBusy(null)
  }

  async function setPublished(p: Post, publish: boolean) {
    setBusy(p.id)
    await fetch('/api/admin/blog', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, action: publish ? 'publish' : 'unpublish' }),
    }).catch(() => {})
    await load(); setBusy(null)
  }

  async function removePost(p: Post) {
    if (!window.confirm(`Delete “${p.title}”? This cannot be undone.`)) return
    setBusy(p.id)
    await fetch(`/api/admin/blog?id=${p.id}`, { method: 'DELETE' }).catch(() => {})
    await load(); setBusy(null)
  }

  async function addTopic(e: React.FormEvent) {
    e.preventDefault()
    if (!newTopic.trim()) return
    setBusy('topic')
    await fetch('/api/admin/blog', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_topic', topic: newTopic.trim() }),
    }).catch(() => {})
    setNewTopic(''); await load(); setBusy(null)
  }

  async function removeTopic(t: Topic) {
    setBusy(t.id)
    await fetch(`/api/admin/blog?topicId=${t.id}`, { method: 'DELETE' }).catch(() => {})
    await load(); setBusy(null)
  }

  if (loading) return <div style={{ color: '#666', padding: 40, textAlign: 'center' }}><Loader2 size={20} className="animate-spin" /></div>

  const queued = topics.filter(t => t.status === 'queued')

  return (
    <div style={{ display: 'grid', gap: 26, maxWidth: 980 }}>
      {msg && <div style={{ background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.25)', color: '#FFD700', borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem' }}>{msg}</div>}

      {/* Posts */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.95rem' }}>
            <FileText size={16} style={{ color: '#FFD700' }} /> Articles ({posts.length})
          </h2>
          <button onClick={() => generate()} disabled={busy === 'generate'} className="btn-gold"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 8, padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700 }}>
            {busy === 'generate' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {busy === 'generate' ? 'Writing…' : 'Generate next article'}
          </button>
        </div>
        {posts.length === 0 ? (
          <p style={{ color: '#666', fontSize: '0.85rem', border: '1px dashed #26262e', borderRadius: 10, padding: '22px 16px', textAlign: 'center' }}>
            No articles yet. Click “Generate next article” — it writes the first topic in the queue as a draft.
          </p>
        ) : (
          <div style={{ border: '1px solid #1c1c24', borderRadius: 10, overflow: 'hidden' }}>
            {posts.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: i % 2 ? '#0d0d13' : '#101017', borderBottom: i < posts.length - 1 ? '1px solid #16161e' : 'none' }}>
                <span style={chip(p.published ? '#5dd47a' : '#ffca28')}>{p.published ? 'published' : 'draft'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#f0f0f0', fontWeight: 600, fontSize: '0.87rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                  <div style={{ color: '#666', fontSize: '0.72rem', marginTop: 2 }}>/{'blog/' + p.slug} · {new Date(p.created_at).toLocaleDateString()}</div>
                </div>
                <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" title={p.published ? 'View live' : 'Preview (must be published to be visible)'}
                  style={{ color: '#777', display: 'inline-flex', padding: 6 }}><ExternalLink size={15} /></a>
                <button onClick={() => setPublished(p, !p.published)} disabled={busy === p.id}
                  title={p.published ? 'Unpublish' : 'Publish'}
                  style={{ background: 'none', border: '1px solid #2a2a34', color: p.published ? '#aaa' : '#5dd47a', borderRadius: 7, padding: '6px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {busy === p.id ? <Loader2 size={13} className="animate-spin" /> : p.published ? <EyeOff size={13} /> : <Eye size={13} />}
                  {p.published ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => removePost(p)} disabled={busy === p.id} title="Delete"
                  style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 6 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f87171')} onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Topic queue */}
      <section>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.95rem', marginBottom: 12 }}>
          <Sparkles size={16} style={{ color: '#FFD700' }} /> Topic queue ({queued.length} queued)
        </h2>
        <form onSubmit={addTopic} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <input value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="Add a topic, e.g. “How agencies negotiate usage rights”"
            style={{ flex: 1, background: '#0f0f15', border: '1px solid #26262e', borderRadius: 8, padding: '9px 12px', color: '#f0f0f0', fontSize: '0.85rem' }} />
          <button type="submit" disabled={busy === 'topic' || !newTopic.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#16161e', border: '1px solid #2a2a34', color: '#e0e0e0', borderRadius: 8, padding: '9px 14px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
            {busy === 'topic' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
          </button>
        </form>
        <div style={{ border: '1px solid #1c1c24', borderRadius: 10, overflow: 'hidden', maxHeight: 340, overflowY: 'auto' }}>
          {topics.map((t, i) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', background: i % 2 ? '#0d0d13' : '#101017', borderBottom: i < topics.length - 1 ? '1px solid #16161e' : 'none' }}>
              <span style={chip(TOPIC_COLORS[t.status])}>{t.status}</span>
              <span style={{ flex: 1, color: t.status === 'done' ? '#666' : '#d0d0d0', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.topic}</span>
              {t.error && <span title={t.error} style={{ color: '#ff6b6b', fontSize: '0.7rem' }}>error</span>}
              <button onClick={() => removeTopic(t)} disabled={busy === t.id} title="Remove topic"
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')} onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <p style={{ color: '#555', fontSize: '0.75rem', marginTop: 10 }}>
          The daily cron writes the next queued topic as a draft each morning. Review drafts here and hit Publish — or set BLOG_AUTOPUBLISH=true to skip review.
        </p>
      </section>
    </div>
  )
}
