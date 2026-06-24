'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Copy, Check, X, ChevronRight, ChevronDown, Loader2, Send, Zap, FileText, Download, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Influencer } from '@/lib/types'
import { STEP1_STRATEGIES, STEP2_SPONSOR, buildSignature } from '@/lib/emailStrategies'
import { BRANDING_KEY } from './BrandingSettings'
import { SAMPLE_CREATORS } from '@/lib/sampleCreators'
import { SAMPLE_SPONSORS } from '@/lib/sampleSponsors'
import DashboardShell from './DashboardShell'
import Image from 'next/image'

const NICHES = ['Tech', 'Gaming', 'Finance', 'Beauty', 'Fitness', 'Food', 'Fashion', 'Travel', 'Education', 'Business', 'Lifestyle']
const PLATFORMS = ['All', 'YouTube', 'TikTok', 'Instagram', 'Twitch', 'LinkedIn']
const STEPS = ['Discover', 'Sponsors', 'Generate', 'Send', 'Track']

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      title="Copy email"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#FFD700' : '#444', padding: '2px 4px', borderRadius: 4, display: 'inline-flex', alignItems: 'center' }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

interface Sponsor { id: string; name: string; industry: string; typical_budget: string; description: string; niche?: string }
interface EmailTemplate { subject: string; body: string }
interface GeneratedTemplates { influencerEmail: EmailTemplate; sponsorEmail: EmailTemplate; followUpEmail: EmailTemplate }
interface SentEmail { to: string; subject: string; status: string }

interface Props { email: string; accessType: string; daysLeft: number | null }

export default function DashboardClient({ email, accessType, daysLeft }: Props) {
  const [step, setStep] = useState(0)
  const [selectedNiche, setSelectedNiche] = useState('Tech')

  // Honor ?step= deep links from the sidebar (read once on mount).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('step')
    const n = p ? parseInt(p, 10) : NaN
    if (!Number.isNaN(n) && n >= 0 && n <= 4) setStep(n)
  }, [])

  // Step 1: Creator Discovery
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState('All')
  const [creators, setCreators] = useState<Influencer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25

  // Step 2: Sponsors
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [selectedSponsors, setSelectedSponsors] = useState<Set<string>>(new Set())
  const [loadingSponsors, setLoadingSponsors] = useState(false)

  // Step 3: Email Generation
  const [templates, setTemplates] = useState<{ [key: string]: GeneratedTemplates }>({})
  const [generating, setGenerating] = useState(false)
  const [currentPair, setCurrentPair] = useState<{ creator: Influencer; sponsor: Sponsor } | null>(null)
  const [editedTemplates, setEditedTemplates] = useState<GeneratedTemplates | null>(null)
  const [selectedStrategy, setSelectedStrategy] = useState('compliment')
  const [branding, setBranding] = useState<Record<string, string>>({})

  // Step 4: Send
  const [sent, setSent] = useState<SentEmail[]>([])
  const [sending, setSending] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)

  // Step 5: Track
  const [responses, setResponses] = useState<{ id: string; from_email: string; message: string; ai_suggestion: string | null; deal_status: string }[]>([])
  const [contracts, setContracts] = useState<{ influencer: string; sponsor: string } | null>(null)
  const [generatingContracts, setGeneratingContracts] = useState(false)
  const [aiSuggesting, setAiSuggesting] = useState<string | null>(null)

  // Load the full creator set ONCE (Supabase if seeded, else bundled sample),
  // then filter/search/paginate entirely in-memory — no per-keystroke network.
  const [allCreators, setAllCreators] = useState<Influencer[]>([])
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('creators').select('*').order('subscribers', { ascending: false }).range(0, 999)
        if (!active) return
        setAllCreators(data && data.length ? (data as Influencer[]) : SAMPLE_CREATORS)
      } catch {
        if (active) setAllCreators(SAMPLE_CREATORS)
      }
    })()
    return () => { active = false }
  }, [])

  // Debounce the text query so typing doesn't re-render the table on every key.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 220)
    return () => clearTimeout(t)
  }, [query])

  const searchCreators = useCallback((reset = false) => {
    const pg = reset ? 0 : page
    let list = allCreators
    if (debouncedQuery) {
      const ql = debouncedQuery.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(ql))
    }
    if (selectedNiche) list = list.filter(c => c.niche === selectedNiche)
    if (platform !== 'All') list = list.filter(c => c.platform === platform)
    setTotal(list.length)
    setCreators(list.slice(pg * PAGE_SIZE, pg * PAGE_SIZE + PAGE_SIZE))
    if (reset) setPage(0)
    setLoading(false)
  }, [allCreators, debouncedQuery, selectedNiche, platform, page])

  useEffect(() => { setLoading(true); searchCreators(true) }, [debouncedQuery, selectedNiche, platform, allCreators]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load the full sponsor set ONCE; match by niche + search entirely in-memory.
  const [allSponsors, setAllSponsors] = useState<Sponsor[]>([])
  const [customSponsors, setCustomSponsors] = useState<Sponsor[]>([])
  const [sponsorQuery, setSponsorQuery] = useState('')
  const [addingSponsor, setAddingSponsor] = useState(false)
  const [sponsorForm, setSponsorForm] = useState({ name: '', industry: '', typical_budget: '' })

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoadingSponsors(true)
      try {
        const res = await fetch('/api/sponsors')
        const { sponsors: data } = await res.json()
        if (!active) return
        setAllSponsors(data && data.length ? data : SAMPLE_SPONSORS)
      } catch {
        if (active) setAllSponsors(SAMPLE_SPONSORS)
      } finally {
        if (active) setLoadingSponsors(false)
      }
    })()
    return () => { active = false }
  }, [])

  // Matched sponsors for the current niche + search (recomputed instantly).
  useEffect(() => {
    const niche = selectedNiche.toLowerCase()
    const ql = sponsorQuery.trim().toLowerCase()
    const matched = [...customSponsors, ...allSponsors].filter(s => {
      const inNiche = s.niche ? s.niche === selectedNiche : (s.industry || '').toLowerCase().includes(niche)
      const inSearch = !ql || s.name.toLowerCase().includes(ql)
      return inNiche && inSearch
    })
    setSponsors(matched)
  }, [allSponsors, customSponsors, selectedNiche, sponsorQuery])

  function goToSponsors() { setStep(1) }

  function addCustomSponsor(e: React.FormEvent) {
    e.preventDefault()
    if (!sponsorForm.name.trim()) return
    const s: Sponsor = {
      id: `custom-${Date.now()}`,
      name: sponsorForm.name.trim(),
      industry: sponsorForm.industry.trim() || selectedNiche,
      typical_budget: sponsorForm.typical_budget.trim(),
      description: 'Your custom sponsor',
      niche: selectedNiche,
    }
    setCustomSponsors(prev => [s, ...prev])
    setSelectedSponsors(prev => new Set(prev).add(s.id))
    setSponsorForm({ name: '', industry: '', typical_budget: '' })
    setAddingSponsor(false)
  }

  // Load agency branding once (for the email signature).
  useEffect(() => {
    try { const raw = localStorage.getItem(BRANDING_KEY); if (raw) setBranding(JSON.parse(raw)) } catch {}
  }, [])

  // Fill [Variables] in a template from a creator + sponsor.
  function fillVars(text: string, creator?: Influencer, sponsor?: Sponsor) {
    const first = creator?.name?.split(' ')[0] ?? '[FirstName]'
    const last = creator?.name?.split(' ').slice(1).join(' ') || '[LastName]'
    return text
      .replaceAll('[FirstName]', first)
      .replaceAll('[LastName]', last)
      .replaceAll('[Platform]', creator?.platform ?? '[Platform]')
      .replaceAll('[Topic]', creator?.niche ?? '[Topic]')
      .replaceAll('[VideoType]', 'video')
      .replaceAll('[Niche]', creator?.niche ?? selectedNiche)
      .replaceAll('[Followers]', creator ? fmt(creator.subscribers) : '[Followers]')
      .replaceAll('[Engagement]', creator ? String(creator.engagement_rate) : '[Engagement]')
      .replaceAll('[AvgViews]', creator ? fmt(creator.avg_views) : '[AvgViews]')
      .replaceAll('[SponsorName]', sponsor?.name ?? '[SponsorName]')
      .replaceAll('[CreatorName]', creator?.name ?? '[CreatorName]')
      .replaceAll('[CreatorRate]', '[CreatorRate]')
  }

  // Build editable templates from a chosen Step-1 strategy + the Step-2 sponsor pitch.
  function applyStrategy(strategyId: string) {
    const strat = STEP1_STRATEGIES.find(s => s.id === strategyId) ?? STEP1_STRATEGIES[0]
    const creator = creators.find(c => selected.has(c.id))
    const sponsor = sponsors.find(s => selectedSponsors.has(s.id))
    const sig = '\n\n' + buildSignature(branding)
    setSelectedStrategy(strategyId)
    setCurrentPair(creator && sponsor ? { creator, sponsor } : null)
    setEditedTemplates({
      influencerEmail: { subject: fillVars(strat.subject, creator, sponsor), body: fillVars(strat.body, creator, sponsor) + sig },
      sponsorEmail: { subject: fillVars(STEP2_SPONSOR.subject, creator, sponsor), body: fillVars(STEP2_SPONSOR.body, creator, sponsor) + sig },
      followUpEmail: { subject: 'Re: ' + fillVars(strat.subject, creator, sponsor), body: `Hey ${creator?.name?.split(' ')[0] ?? 'there'}, just circling back on my note above. Still keen to chat whenever you have a moment.` + sig },
    })
  }

  async function generateForPair(creator: Influencer, sponsor: Sponsor) {
    setCurrentPair({ creator, sponsor })
    setGenerating(true)
    setEditedTemplates(null)
    const res = await fetch('/api/emails/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        influencerName: creator.name,
        influencerNiche: creator.niche,
        influencerPlatform: creator.platform,
        influencerSubscribers: creator.subscribers,
        influencerEngagement: creator.engagement_rate,
        sponsorName: sponsor.name,
        sponsorIndustry: sponsor.industry,
        sponsorBudget: sponsor.typical_budget,
      }),
    })
    const { templates: t } = await res.json()
    setTemplates(prev => ({ ...prev, [`${creator.id}-${sponsor.id}`]: t }))
    setEditedTemplates(t)
    setGenerating(false)
  }

  function goToGenerate() {
    setStep(2)
    applyStrategy(selectedStrategy)
  }

  async function sendAll() {
    setSending(true)
    const selectedCreatorList = creators.filter(c => selected.has(c.id))
    const selectedSponsorList = sponsors.filter(s => selectedSponsors.has(s.id))

    // Create campaign first
    const campRes = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${selectedNiche} Campaign`,
        niche: selectedNiche,
        creator_ids: selectedCreatorList.map(c => c.id),
        sponsor_ids: selectedSponsorList.map(s => s.id),
      }),
    })
    const { campaign } = await campRes.json()
    if (campaign?.id) setCampaignId(campaign.id)

    // Build email list — personalize the chosen strategy PER creator so each
    // recipient gets their own [FirstName]/[Topic]/[Followers] filled in.
    const strat = STEP1_STRATEGIES.find(s => s.id === selectedStrategy) ?? STEP1_STRATEGIES[0]
    const sig = '\n\n' + buildSignature(branding)
    const firstSponsor = selectedSponsorList[0]
    const emailList: { to: string; subject: string; body: string; recipient_type: string }[] = []
    for (const creator of selectedCreatorList) {
      if (!creator.email) continue
      emailList.push({
        to: creator.email,
        subject: fillVars(strat.subject, creator, firstSponsor),
        body: fillVars(strat.body, creator, firstSponsor) + sig,
        recipient_type: 'creator',
      })
    }
    const firstCreator = selectedCreatorList[0]
    for (const sponsor of selectedSponsorList) {
      emailList.push({
        to: `contact@${sponsor.name.toLowerCase().replace(/\s+/g, '')}.com`,
        subject: fillVars(STEP2_SPONSOR.subject, firstCreator, sponsor),
        body: fillVars(STEP2_SPONSOR.body, firstCreator, sponsor) + sig,
        recipient_type: 'sponsor',
      })
    }

    const res = await fetch('/api/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: campaign?.id, emails: emailList }),
    })
    const { results } = await res.json()
    setSent(results ?? [])
    setSending(false)
    setStep(4)
  }

  async function getAISuggestion(responseId: string, replyMessage: string) {
    setAiSuggesting(responseId)
    const res = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replyMessage, recipientType: 'creator', originalSubject: 'Campaign Partnership' }),
    })
    const { suggestion } = await res.json()
    setResponses(prev => prev.map(r => r.id === responseId ? { ...r, ai_suggestion: suggestion } : r))
    setAiSuggesting(null)
  }

  async function generateContracts() {
    const creator = creators.find(c => selected.has(c.id))
    const sponsor = sponsors.find(s => selectedSponsors.has(s.id))
    setGeneratingContracts(true)
    const res = await fetch('/api/contracts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agencyName: 'Your Agency',
        creatorName: creator?.name ?? '[CREATOR]',
        sponsorName: sponsor?.name ?? '[BRAND]',
        niche: selectedNiche,
        campaignName: `${selectedNiche} Campaign`,
        deliverables: '1 dedicated video + 2 social posts',
        amount: sponsor?.typical_budget ?? '[AMOUNT]',
        timeline: '30 days',
      }),
    })
    const data = await res.json()
    setContracts(data)
    setGeneratingContracts(false)
  }

  function downloadText(filename: string, text: string) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }


  const selectedCreators = creators.filter(c => selected.has(c.id))
  const selectedSponsorList = sponsors.filter(s => selectedSponsors.has(s.id))

  const navKey = (['search', 'sponsors', 'templates', 'send', 'track'] as const)[step] ?? 'search'

  return (
    <DashboardShell active={navKey} email={email} accessType={accessType} daysLeft={daysLeft}>
      {/* Step nav */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', background: '#0a0a0a' }}>
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => i < step + 1 && setStep(i)}
            style={{
              padding: '14px 20px', background: 'none', border: 'none', cursor: i <= step ? 'pointer' : 'default',
              color: step === i ? '#FFD700' : i < step ? '#888' : '#333',
              fontWeight: step === i ? 700 : 500, fontSize: '0.875rem',
              borderBottom: step === i ? '2px solid #FFD700' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, background: step === i ? '#FFD700' : i < step ? '#222' : '#111', color: step === i ? '#000' : i < step ? '#666' : '#333' }}>
              {i + 1}
            </span>
            {s}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {/* Niche selector always visible */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#FFD700' }}>Niche</span>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select value={selectedNiche} onChange={e => { setSelectedNiche(e.target.value); setSelected(new Set()); setSelectedSponsors(new Set()) }}
              style={{
                appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
                background: 'rgba(255,215,0,0.1)', border: '1.5px solid rgba(255,215,0,0.45)',
                color: '#FFD700', borderRadius: 10, padding: '9px 34px 9px 14px',
                fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer', outline: 'none',
              }}>
              {NICHES.map(n => <option key={n} value={n} style={{ background: '#111', color: '#f0f0f0', fontWeight: 600 }}>{n}</option>)}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: 11, color: '#FFD700', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: 1300, margin: '0 auto' }}>
        {/* ── STEP 0: Creator Discovery ── */}
        {step === 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f5f5f5', marginBottom: 4 }}>Creator Discovery</h1>
                <p style={{ color: '#555', fontSize: '0.9375rem' }}>
                  {selected.size > 0 ? <span style={{ color: '#FFD700', fontWeight: 700 }}>{selected.size} selected</span> : 'Select creators to add to your campaign'}
                </p>
              </div>
              <button
                onClick={goToSponsors}
                disabled={selected.size === 0}
                className="btn-gold"
                style={{ opacity: selected.size === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                Match Sponsors <ChevronRight size={16} />
              </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
                <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
                <input className="input-dark" style={{ paddingLeft: 38, width: '100%' }} placeholder="Search by name..." value={query} onChange={e => setQuery(e.target.value)} />
                {query && <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#444' }}><X size={14} /></button>}
              </div>
              <select value={platform} onChange={e => setPlatform(e.target.value)} className="input-dark">
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {selected.size > 0 && (
                <button onClick={() => setSelected(new Set())} className="btn-outline-gold" style={{ padding: '0 16px', fontSize: '0.875rem' }}>Clear {selected.size}</button>
              )}
              <button onClick={() => {
                const all = new Set(creators.map(c => c.id))
                if (all.size === selected.size) setSelected(new Set())
                else setSelected(all)
              }} className="btn-outline-gold" style={{ padding: '0 16px', fontSize: '0.875rem' }}>
                {creators.every(c => selected.has(c.id)) ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <p style={{ color: '#444', fontSize: '0.8125rem', marginBottom: 12 }}>
              {loading ? 'Loading…' : `${total.toLocaleString()} creators in ${selectedNiche}`}
            </p>

            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1a1a1a', background: '#0f0f0f' }}>
                      <th style={{ padding: '12px 16px', width: 36 }}></th>
                      {['Name', 'Platform', 'Subscribers', 'Avg Views', 'Engagement', 'Country', 'Email'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#444', fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {creators.map((c, i) => (
                      <tr key={c.id} onClick={() => {
                        const next = new Set(selected)
                        next.has(c.id) ? next.delete(c.id) : next.add(c.id)
                        setSelected(next)
                      }}
                        style={{ borderBottom: i < creators.length - 1 ? '1px solid #161616' : 'none', cursor: 'pointer', background: selected.has(c.id) ? 'rgba(255,215,0,0.04)' : 'transparent', transition: 'background 0.1s' }}
                        onMouseEnter={e => { if (!selected.has(c.id)) e.currentTarget.style.background = '#141414' }}
                        onMouseLeave={e => { e.currentTarget.style.background = selected.has(c.id) ? 'rgba(255,215,0,0.04)' : 'transparent' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${selected.has(c.id) ? '#FFD700' : '#333'}`, background: selected.has(c.id) ? '#FFD700' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {selected.has(c.id) && <Check size={10} style={{ color: '#000' }} />}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#f0f0f0', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.name}</td>
                        <td style={{ padding: '14px 16px', color: '#888' }}>{c.platform}</td>
                        <td style={{ padding: '14px 16px', color: '#d0d0d0', fontWeight: 600 }}>{fmt(c.subscribers)}</td>
                        <td style={{ padding: '14px 16px', color: '#888' }}>{fmt(c.avg_views)}</td>
                        <td style={{ padding: '14px 16px', color: Number(c.engagement_rate) >= 5 ? '#4ade80' : '#888' }}>{Number(c.engagement_rate).toFixed(1)}%</td>
                        <td style={{ padding: '14px 16px', color: '#666' }}>{c.country}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
                            <span style={{ color: '#666', fontSize: '0.8125rem', fontFamily: 'monospace' }}>{c.email ?? '—'}</span>
                            {c.email && <CopyBtn text={c.email} />}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!loading && creators.length === 0 && (
                      <tr><td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center', color: '#444' }}>No creators match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {total > PAGE_SIZE && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
                <button onClick={() => { setPage(p => p - 1); searchCreators() }} disabled={page === 0 || loading} className="btn-outline-gold" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>Previous</button>
                <span style={{ color: '#555', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '0.875rem' }}>Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
                <button onClick={() => { setPage(p => p + 1); searchCreators() }} disabled={(page + 1) * PAGE_SIZE >= total || loading} className="btn-outline-gold" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>Next</button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 1: Sponsor Matching ── */}
        {step === 1 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f5f5f5', marginBottom: 4 }}>Sponsor Matching</h1>
                <p style={{ color: '#555', fontSize: '0.9375rem' }}>
                  {selectedSponsorList.length > 0 ? <span style={{ color: '#FFD700', fontWeight: 700 }}>{selectedSponsorList.length} sponsors selected</span> : `Auto-matched for ${selectedNiche} niche`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(0)} className="btn-outline-gold">← Back</button>
                <button onClick={goToGenerate} disabled={selectedSponsorList.length === 0} className="btn-gold" style={{ opacity: selectedSponsorList.length === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Generate Emails <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* toolbar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
                <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
                <input className="input-dark" style={{ paddingLeft: 38, width: '100%' }} placeholder="Search sponsors..." value={sponsorQuery} onChange={e => setSponsorQuery(e.target.value)} />
              </div>
              <button onClick={() => { const all = new Set(selectedSponsors); sponsors.forEach(s => all.add(s.id)); setSelectedSponsors(all) }} className="btn-outline-gold" style={{ padding: '0 16px', fontSize: '0.875rem' }}>Select all</button>
              {selectedSponsorList.length > 0 && <button onClick={() => setSelectedSponsors(new Set())} className="btn-outline-gold" style={{ padding: '0 16px', fontSize: '0.875rem' }}>Clear {selectedSponsorList.length}</button>}
              <button onClick={() => setAddingSponsor(a => !a)} className="btn-gold" style={{ padding: '0 16px', fontSize: '0.875rem' }}><Plus size={14} /> Add your own</button>
            </div>

            {addingSponsor && (
              <form onSubmit={addCustomSponsor} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <input className="input-dark" placeholder="Sponsor name *" value={sponsorForm.name} onChange={e => setSponsorForm({ ...sponsorForm, name: e.target.value })} style={{ flex: '1 1 180px' }} />
                <input className="input-dark" placeholder="Industry" value={sponsorForm.industry} onChange={e => setSponsorForm({ ...sponsorForm, industry: e.target.value })} style={{ flex: '1 1 140px' }} />
                <input className="input-dark" placeholder="Budget e.g. $5K-$40K" value={sponsorForm.typical_budget} onChange={e => setSponsorForm({ ...sponsorForm, typical_budget: e.target.value })} style={{ flex: '1 1 150px' }} />
                <button type="submit" className="btn-gold" style={{ padding: '0 18px' }}>Add</button>
                <button type="button" onClick={() => setAddingSponsor(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
              </form>
            )}

            <p style={{ color: '#444', fontSize: '0.8125rem', marginBottom: 12 }}>
              {loadingSponsors ? 'Loading…' : `${sponsors.length} sponsors matched for ${selectedNiche}`}
            </p>

            {loadingSponsors ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#555' }}><Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} /> Loading sponsors...</div>
            ) : sponsors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#444' }}>No sponsors match this niche yet. Use &ldquo;Add your own&rdquo; to bring a brand.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {sponsors.map(s => (
                  <div key={s.id} onClick={() => {
                    const next = new Set(selectedSponsors)
                    next.has(s.id) ? next.delete(s.id) : next.add(s.id)
                    setSelectedSponsors(next)
                  }}
                    style={{ background: selectedSponsors.has(s.id) ? 'rgba(255,215,0,0.06)' : '#111', border: `1px solid ${selectedSponsors.has(s.id) ? 'rgba(255,215,0,0.3)' : '#1a1a1a'}`, borderRadius: 12, padding: '20px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}
                  >
                    {selectedSponsors.has(s.id) && (
                      <div style={{ position: 'absolute', top: 14, right: 14, width: 20, height: 20, borderRadius: '50%', background: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={11} style={{ color: '#000' }} />
                      </div>
                    )}
                    <p style={{ fontWeight: 800, color: '#f0f0f0', fontSize: '1rem', marginBottom: 6 }}>{s.name}</p>
                    <p style={{ fontSize: '0.8125rem', color: '#555', marginBottom: 10 }}>{s.industry}</p>
                    {s.typical_budget && (
                      <span style={{ background: 'rgba(255,215,0,0.08)', color: '#FFD700', fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: 6, display: 'inline-block', marginBottom: 10 }}>
                        {s.typical_budget}
                      </span>
                    )}
                    {s.description && <p style={{ fontSize: '0.8125rem', color: '#666', lineHeight: 1.5 }}>{s.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Email Generation ── */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f5f5f5', marginBottom: 4 }}>Email Templates</h1>
                <p style={{ color: '#555', fontSize: '0.9375rem' }}>Pick an outreach strategy. Variables and your signature fill in automatically.</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(1)} className="btn-outline-gold">← Back</button>
                <button onClick={() => setStep(3)} disabled={!editedTemplates} className="btn-gold" style={{ opacity: editedTemplates ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Review & Send <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Strategy picker (Step-1 creator outreach) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginBottom: 16 }}>
              {STEP1_STRATEGIES.map(s => {
                const on = selectedStrategy === s.id
                return (
                  <button key={s.id} onClick={() => applyStrategy(s.id)}
                    style={{ textAlign: 'left', background: on ? 'rgba(255,215,0,0.1)' : '#111', border: `1px solid ${on ? 'rgba(255,215,0,0.35)' : '#1c1c1c'}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}>
                    <p style={{ color: on ? '#FFD700' : '#e0e0e0', fontWeight: 700, fontSize: '0.875rem' }}>{s.name}</p>
                    <p style={{ color: '#666', fontSize: '0.75rem', marginTop: 3 }}>{s.bestFor}</p>
                  </button>
                )
              })}
            </div>

            {/* Optional: regenerate a specific pair with AI */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: '#444', fontSize: '0.75rem' }}>Or rewrite with AI for a pair:</span>
              {selectedCreators.slice(0, 3).map(c => (
                selectedSponsorList.slice(0, 2).map(s => (
                  <button key={`${c.id}-${s.id}`}
                    onClick={() => generateForPair(c, s)}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #222', color: '#888', borderRadius: 8, padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer' }}>
                    {c.name.split(' ')[0]} × {s.name.split(' ')[0]}
                  </button>
                ))
              ))}
            </div>

            {generating ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#555' }}>
                <Loader2 size={28} style={{ margin: '0 auto 14px', display: 'block', color: '#FFD700' }} className="animate-spin" />
                <p style={{ fontWeight: 600, color: '#888' }}>Generating email templates...</p>
              </div>
            ) : editedTemplates ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {([
                  { key: 'influencerEmail' as keyof GeneratedTemplates, label: '📧 Email to Creator', desc: currentPair?.creator.name },
                  { key: 'sponsorEmail' as keyof GeneratedTemplates, label: '🏢 Email to Sponsor', desc: currentPair?.sponsor.name },
                  { key: 'followUpEmail' as keyof GeneratedTemplates, label: '🔄 Follow-up (Day 5)', desc: 'Sent if no reply in 5 days' },
                ] as Array<{ key: keyof GeneratedTemplates; label: string; desc?: string }>).map(({ key, label, desc }) => (
                  <div key={key} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '0.9375rem' }}>{label}</span>
                      {desc && <span style={{ color: '#444', fontSize: '0.8125rem' }}>→ {desc}</span>}
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                      <input
                        value={editedTemplates[key].subject}
                        onChange={e => setEditedTemplates(prev => prev ? { ...prev, [key]: { ...prev[key], subject: e.target.value } } : prev)}
                        style={{ width: '100%', background: '#0f0f0f', border: '1px solid #1f1f1f', borderRadius: 8, padding: '10px 14px', color: '#d0d0d0', fontSize: '0.9375rem', marginBottom: 10, fontWeight: 600 }}
                        placeholder="Subject line..."
                      />
                      <textarea
                        value={editedTemplates[key].body}
                        onChange={e => setEditedTemplates(prev => prev ? { ...prev, [key]: { ...prev[key], body: e.target.value } } : prev)}
                        rows={8}
                        style={{ width: '100%', background: '#0f0f0f', border: '1px solid #1f1f1f', borderRadius: 8, padding: '10px 14px', color: '#888', fontSize: '0.875rem', lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#444' }}>
                Select a creator-sponsor pair above to generate emails.
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Review & Send ── */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f5f5f5', marginBottom: 4 }}>Review & Send</h1>
                <p style={{ color: '#555', fontSize: '0.9375rem' }}>
                  {selectedCreators.length} creators + {selectedSponsorList.length} sponsors = {selectedCreators.filter(c => c.email).length + selectedSponsorList.length} emails to send
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(2)} className="btn-outline-gold">← Back</button>
                <button onClick={sendAll} disabled={sending} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {sending ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send All Emails</>}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '20px' }}>
                <p style={{ color: '#FFD700', fontWeight: 700, marginBottom: 12, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Creators ({selectedCreators.length})</p>
                {selectedCreators.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #161616', fontSize: '0.875rem' }}>
                    <span style={{ color: '#d0d0d0' }}>{c.name}</span>
                    <span style={{ color: c.email ? '#4ade80' : '#ef4444' }}>{c.email ?? 'No email'}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '20px' }}>
                <p style={{ color: '#FFD700', fontWeight: 700, marginBottom: 12, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sponsors ({selectedSponsorList.length})</p>
                {selectedSponsorList.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #161616', fontSize: '0.875rem' }}>
                    <span style={{ color: '#d0d0d0' }}>{s.name}</span>
                    <span style={{ color: '#888' }}>{s.industry}</span>
                  </div>
                ))}
              </div>
            </div>

            {editedTemplates && (
              <div style={{ background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: 12, padding: '20px 24px' }}>
                <p style={{ color: '#FFD700', fontWeight: 700, fontSize: '0.875rem', marginBottom: 6 }}>Preview: Creator Email</p>
                <p style={{ color: '#d0d0d0', fontWeight: 600, fontSize: '0.9375rem', marginBottom: 8 }}>{editedTemplates.influencerEmail.subject}</p>
                <p style={{ color: '#666', fontSize: '0.875rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{editedTemplates.influencerEmail.body.slice(0, 300)}…</p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Track ── */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f5f5f5', marginBottom: 4 }}>Campaign Tracker</h1>
              <p style={{ color: '#555', fontSize: '0.9375rem' }}>{sent.length} emails sent · Monitor responses and close deals</p>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Sent', value: sent.length, color: '#FFD700' },
                { label: 'Delivered', value: sent.filter(s => s.status === 'sent').length, color: '#4ade80' },
                { label: 'Failed', value: sent.filter(s => s.status === 'error').length, color: '#ef4444' },
                { label: 'Replies', value: responses.length, color: '#a5b4fc' },
              ].map(stat => (
                <div key={stat.label} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
                  <div style={{ fontSize: '0.875rem', color: '#555' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Sent emails list */}
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a1a1a', background: '#0f0f0f' }}>
                <p style={{ color: '#888', fontWeight: 700, fontSize: '0.875rem' }}>Sent Emails</p>
              </div>
              {sent.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: i < sent.length - 1 ? '1px solid #161616' : 'none', fontSize: '0.875rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.status === 'sent' ? '#4ade80' : '#ef4444', flexShrink: 0 }} />
                  <span style={{ color: '#d0d0d0', flex: 1 }}>{s.to}</span>
                  <span style={{ color: '#555' }}>{s.subject}</span>
                  <span style={{ color: s.status === 'sent' ? '#4ade80' : '#ef4444', fontWeight: 600 }}>{s.status}</span>
                </div>
              ))}
              {sent.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#444' }}>No emails sent yet.</div>
              )}
            </div>

            {/* AI Responses */}
            {responses.length > 0 && (
              <div>
                <p style={{ color: '#888', fontWeight: 700, fontSize: '0.875rem', marginBottom: 12 }}>Replies — AI Assisted</p>
                {responses.map(r => (
                  <div key={r.id} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: '20px', marginBottom: 12 }}>
                    <p style={{ color: '#888', fontSize: '0.8125rem', marginBottom: 8 }}>{r.from_email}</p>
                    <p style={{ color: '#d0d0d0', fontSize: '0.9375rem', marginBottom: 14, lineHeight: 1.6 }}>{r.message}</p>
                    {r.ai_suggestion ? (
                      <div style={{ background: 'rgba(102,126,234,0.08)', border: '1px solid rgba(102,126,234,0.2)', borderRadius: 8, padding: '14px' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#667eea', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={11} /> AI Suggestion</p>
                        <p style={{ color: '#c7d2fe', fontSize: '0.9375rem', lineHeight: 1.6 }}>{r.ai_suggestion}</p>
                      </div>
                    ) : (
                      <button onClick={() => getAISuggestion(r.id, r.message)} disabled={aiSuggesting === r.id}
                        className="btn-outline-gold" style={{ padding: '8px 16px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {aiSuggesting === r.id ? <><Loader2 size={13} className="animate-spin" /> Thinking...</> : <><Zap size={13} /> Get AI Response</>}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Contract generator ── */}
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: '20px', marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: contracts ? 18 : 0 }}>
                <div>
                  <p style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={16} style={{ color: '#FFD700' }} /> Contracts
                  </p>
                  <p style={{ color: '#555', fontSize: '0.8125rem', marginTop: 2 }}>Auto-fill creator and brand agreements from this deal. From deal to contract in minutes.</p>
                </div>
                <button onClick={generateContracts} disabled={generatingContracts} className="btn-gold" style={{ padding: '10px 18px', fontSize: '0.875rem' }}>
                  {generatingContracts ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><FileText size={14} /> Generate Contracts</>}
                </button>
              </div>

              {contracts && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
                  {([
                    { key: 'influencer' as const, label: 'Influencer Contract' },
                    { key: 'sponsor' as const, label: 'Brand / Sponsor Contract' },
                  ]).map(({ key, label }) => (
                    <div key={key} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ color: '#d0d0d0', fontWeight: 700, fontSize: '0.875rem' }}>{label}</span>
                        <span style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => navigator.clipboard.writeText(contracts[key])} title="Copy" style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex' }}><Copy size={14} /></button>
                          <button onClick={() => downloadText(`prov-${key}-contract.txt`, contracts[key])} title="Download" style={{ background: 'none', border: 'none', color: '#FFD700', cursor: 'pointer', display: 'flex' }}><Download size={14} /></button>
                        </span>
                      </div>
                      <textarea
                        value={contracts[key]}
                        onChange={e => setContracts(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                        rows={12}
                        style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 8, padding: '10px 12px', color: '#999', fontSize: '0.8125rem', lineHeight: 1.6, fontFamily: 'ui-monospace, monospace', resize: 'vertical' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => { setStep(0); setSelected(new Set()); setSelectedSponsors(new Set()); setEditedTemplates(null); setSent([]); setContracts(null) }}
              className="btn-outline-gold" style={{ marginTop: 20 }}>
              Start New Campaign
            </button>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
