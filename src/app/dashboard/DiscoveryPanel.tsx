'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Sparkles, Search, Loader2, Plus, Check, ArrowRight, Users, Eye, Activity, History, Clock } from 'lucide-react'
import DashboardShell from './DashboardShell'
import type { ScoredCreator, DiscoveryFilters } from '@/lib/discovery'

interface PastSearch { id: string; query: string; filters: DiscoveryFilters; result_count: number; results: ScoredCreator[]; created_at: string }

const EXAMPLES = [
  'Tech creators in the US with 50k-500k followers',
  'Fitness creators averaging over 100k views',
  'Gaming creators in the UK with high engagement',
  'Business creators with 1M+ followers in Canada',
]

const fmt = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n)
const PICKS_KEY = 'prov_discovery_picks'

function scoreColor(s: number) { return s >= 90 ? '#00D084' : s >= 78 ? '#FFD700' : '#667eea' }

export default function DiscoveryPanel() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ScoredCreator[] | null>(null)
  const [filters, setFilters] = useState<DiscoveryFilters>({})
  const [parsedBy, setParsedBy] = useState<'ai' | 'local'>('local')
  const [picks, setPicks] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try { return new Set(JSON.parse(localStorage.getItem(PICKS_KEY) || '[]')) } catch { return new Set() }
  })
  const [error, setError] = useState('')
  const [past, setPast] = useState<PastSearch[]>([])

  const loadPast = useCallback(async () => {
    try {
      const res = await fetch('/api/discovery/search')
      const d = await res.json()
      if (Array.isArray(d.searches)) setPast(d.searches)
    } catch { /* history is non-critical */ }
  }, [])
  useEffect(() => { loadPast() }, [loadPast])

  async function search(q: string) {
    const text = q.trim()
    if (!text) return
    setLoading(true); setError(''); setResults(null)
    try {
      const res = await fetch('/api/discovery/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: text }) })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setResults(d.results); setFilters(d.filters); setParsedBy(d.parsedBy)
      loadPast() // refresh history with the search just saved
    } catch (e) { setError(e instanceof Error ? e.message : 'Search failed.') }
    setLoading(false)
  }

  // Re-open a saved search instantly from stored DB results (no re-query).
  function openPast(s: PastSearch) {
    setQuery(s.query); setFilters(s.filters || {}); setResults(s.results || []); setParsedBy('ai'); setError('')
  }

  function togglePick(id: string) {
    setPicks(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      try { localStorage.setItem(PICKS_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  const filterChips = Object.entries(filters).flatMap(([k, v]) =>
    v == null ? [] : [`${k.replace(/_/g, ' ')}: ${Array.isArray(v) ? v.join(', ') : k.includes('followers') || k.includes('views') ? fmt(Number(v)) : v}`])

  return (
    <DashboardShell active="discovery">
      <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Sparkles size={22} style={{ color: '#FFD700' }} />
          <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>AI Creator Discovery</h1>
        </div>
        <p style={{ color: '#666', marginTop: 4, marginBottom: 22 }}>Describe the creators you want in plain English. Prov parses it into filters and ranks the best matches.</p>

        {/* Search */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#111', border: '1px solid #222', borderRadius: 12, padding: '0 14px' }}>
            <Search size={18} style={{ color: '#666', flexShrink: 0 }} />
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search(query)}
              placeholder="e.g. Tech creators in the US with 100k+ followers and 5%+ engagement"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f0f0f0', fontSize: '0.9375rem', padding: '15px 0' }} />
          </div>
          <button onClick={() => search(query)} disabled={loading || !query.trim()} className="btn-gold" style={{ padding: '0 22px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Search
          </button>
        </div>

        {/* Examples */}
        {!results && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => { setQuery(ex); search(ex) }}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1f1f1f', borderRadius: 999, padding: '7px 14px', color: '#9a9a9a', fontSize: '0.8125rem', cursor: 'pointer' }}>
                {ex}
              </button>
            ))}
          </div>
        )}

        {/* Recent searches (from DB) */}
        {!results && past.length > 0 && (
          <div style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, color: '#666', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <History size={13} /> Recent searches
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {past.slice(0, 6).map(s => (
                <button key={s.id} onClick={() => openPast(s)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.02)', border: '1px solid #1a1a1a', borderRadius: 10, padding: '11px 14px', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,215,0,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <Search size={14} style={{ color: '#FFD700', flexShrink: 0 }} />
                    <span style={{ color: '#ccc', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.query}</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, color: '#555', fontSize: '0.75rem' }}>
                    {s.result_count} results
                    <Clock size={11} /> {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: '0.8125rem', color: '#f87171' }}>{error}</div>}

        {/* Parsed filters + picks bar */}
        {results && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {results.length} matches · parsed by {parsedBy === 'ai' ? 'Claude' : 'Prov'}
              </span>
              {filterChips.map(ch => (
                <span key={ch} style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 6, padding: '3px 9px', fontSize: '0.75rem', color: '#FFD700', textTransform: 'capitalize' }}>{ch}</span>
              ))}
              {filterChips.length === 0 && <span style={{ fontSize: '0.75rem', color: '#666' }}>No specific filters detected — showing top creators.</span>}
            </div>
            {picks.size > 0 && (
              <Link href="/dashboard/campaign?step=0" className="btn-gold" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
                {picks.size} selected · Start campaign <ArrowRight size={14} />
              </Link>
            )}
          </div>
        )}

        {/* Results grid */}
        {results && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {results.map(c => {
              const picked = picks.has(c.id)
              return (
                <div key={c.id} style={{ background: '#111', border: `1px solid ${picked ? 'rgba(0,208,132,0.4)' : '#1a1a1a'}`, borderRadius: 14, padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#FFD700,#CA8A04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#0a0a0a' }}>{c.name.charAt(0)}</div>
                      <div>
                        <p style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '0.875rem' }}>{c.name}</p>
                        <p style={{ color: '#666', fontSize: '0.75rem' }}>{c.niche} · {c.platform}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.125rem', color: scoreColor(c.matchScore), fontFamily: 'var(--font-display)' }}>{c.matchScore}%</div>
                      <div style={{ fontSize: '0.625rem', color: '#555', textTransform: 'uppercase' }}>match</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 14, marginBottom: 12, fontSize: '0.75rem', color: '#888' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {fmt(c.subscribers)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={12} /> {fmt(c.avg_views)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Activity size={12} /> {c.engagement_rate}%</span>
                  </div>

                  {c.reasons.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                      {c.reasons.slice(0, 4).map(r => (
                        <span key={r} style={{ background: 'rgba(102,126,234,0.1)', borderRadius: 5, padding: '2px 7px', fontSize: '0.6875rem', color: '#9aa6e8' }}>{r}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => togglePick(c.id)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                        background: picked ? 'rgba(0,208,132,0.12)' : 'rgba(255,215,0,0.1)', border: `1px solid ${picked ? 'rgba(0,208,132,0.4)' : 'rgba(255,215,0,0.3)'}`, color: picked ? '#00D084' : '#FFD700' }}>
                      {picked ? <><Check size={14} /> Added</> : <><Plus size={14} /> Add to Campaign</>}
                    </button>
                    <Link href={`/dashboard/creators/${c.id}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 14px', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, background: 'transparent', border: '1px solid #222', color: '#aaa', textDecoration: 'none' }}>
                      Details
                    </Link>
                  </div>
                </div>
              )
            })}
            {results.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '50px 0', color: '#555' }}>
                No creators matched. Try loosening your criteria.
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
