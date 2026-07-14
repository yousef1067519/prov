'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { saveLocalCampaign, newCampaignId, type SavedCampaign } from '@/lib/localCampaigns'
import { Search, Copy, Check, X, ChevronRight, ChevronDown, Loader2, Send, Zap, FileText, Download, Plus, Mail, Inbox, Users, BarChart3, SlidersHorizontal, Globe } from 'lucide-react'
import type { Influencer } from '@/lib/types'
import { STEP1_STRATEGIES, STEP2_SPONSOR, DEFAULT_FOLLOW_UPS, buildSignature, greetingName } from '@/lib/emailStrategies'
import { BRANDING_KEY } from './BrandingSettings'
import { SAMPLE_SPONSORS } from '@/lib/sampleSponsors'
import { LANGUAGES, COUNTRIES } from '@/lib/geo'
import ComboboxSearch from '@/components/ui/combobox-search'
import PerformanceTrackerModal from '@/components/ui/performance-tracker-modal'
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

interface Sponsor { id: string; name: string; industry: string; typical_budget: string; description: string; niche?: string; email?: string | null; country?: string | null; website?: string | null }
interface OutreachReply { id: string; message: string; deal_status: string; ai_suggestion: string | null; read_at: string | null; updated_at: string | null; created_at: string; from_name: string | null }
interface OutreachSent { id: string; subject: string; body: string; status: string; created_at: string }
interface ThreadMsg { id: string; direction: 'sent' | 'received'; from: string; subject: string; body: string; date: number }
interface OutreachEntry { email: string; name: string | null; type: string; sends: number; last_subject: string; last_sent_at: string; first_sent_at: string; replied: boolean; reply: OutreachReply | null; last_activity: string; history: OutreachSent[] }
interface EmailTemplate { subject: string; body: string }
interface GeneratedTemplates { influencerEmail: EmailTemplate; sponsorEmail: EmailTemplate; followUpEmail: EmailTemplate }
interface SentEmail { to: string; subject: string; status: string }

interface Props { email: string; accessType: string; daysLeft: number | null }

// Comma-formatted numeric input (stores a raw number, shows "1,234,567").
function RangeInput({ value, onChange, placeholder, ariaLabel }: {
  value: number; onChange: (n: number) => void; placeholder: string; ariaLabel: string
}) {
  return (
    <input
      inputMode="numeric"
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value > 0 ? value.toLocaleString('en-US') : ''}
      onChange={e => {
        const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
        onChange(digits ? Number(digits) : 0)
      }}
    />
  )
}

// Joined min–to–max capsule: one bordered container, two borderless inputs.
function RangeField({ icon, label, minValue, maxValue, onMin, onMax, minPh, maxPh, helper }: {
  icon: React.ReactNode; label: string
  minValue: number; maxValue: number
  onMin: (n: number) => void; onMax: (n: number) => void
  minPh: string; maxPh: string; helper?: string
}) {
  return (
    <div>
      <div className="disc-eyebrow">{icon}{label}</div>
      <div className="disc-range">
        <RangeInput value={minValue} onChange={onMin} placeholder={minPh} ariaLabel={`Minimum ${label.toLowerCase()}`} />
        <span className="disc-range-sep">to</span>
        <RangeInput value={maxValue} onChange={onMax} placeholder={maxPh} ariaLabel={`Maximum ${label.toLowerCase()}`} />
      </div>
      {helper && <p className="disc-helper">{helper}</p>}
    </div>
  )
}

export default function DashboardClient({ email, accessType, daysLeft }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [selectedNiche, setSelectedNiche] = useState('All')

  // Honor ?step= deep links from the sidebar (read once on mount).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('step')
    const n = p ? parseInt(p, 10) : NaN
    if (!Number.isNaN(n) && n >= 0 && n <= 4) setStep(n)
  }, [])

  // Step 1: Creator Discovery
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState('All')
  const [minViews, setMinViews] = useState(0)
  const [maxViews, setMaxViews] = useState(0)
  const [minSubs, setMinSubs] = useState(0)
  const [maxSubs, setMaxSubs] = useState(0)
  const [language, setLanguage] = useState('')
  const [country, setCountry] = useState('')
  const [hasEmail, setHasEmail] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [creators, setCreators] = useState<Influencer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // Keep the full creator object for every selected id so selections survive
  // across pages (the visible `creators` is only the current page now).
  const [selectedObjs, setSelectedObjs] = useState<Record<string, Influencer>>({})
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25

  function toggleCreator(c: Influencer) {
    setSelected(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n })
    setSelectedObjs(prev => {
      const n = { ...prev }
      if (n[c.id]) delete n[c.id]; else n[c.id] = c
      return n
    })
  }
  function clearSelected() { setSelected(new Set()); setSelectedObjs({}) }

  // Manually added creators (e.g. a contact you already have, or yourself for
  // a test run). Kept client-side and pinned above search results.
  const [customCreators, setCustomCreators] = useState<Influencer[]>([])
  const [addingCreator, setAddingCreator] = useState(false)
  const [creatorForm, setCreatorForm] = useState({ name: '', email: '', platform: 'YouTube' })

  function addCustomCreator(e: React.FormEvent) {
    e.preventDefault()
    if (!creatorForm.name.trim() || !creatorForm.email.trim()) return
    const c: Influencer = {
      id: `custom-${Date.now()}`,
      name: creatorForm.name.trim(),
      niche: selectedNiche === 'All' ? 'Lifestyle' : selectedNiche,
      platform: creatorForm.platform,
      subscribers: 0,
      avg_views: 0,
      engagement_rate: 0,
      email: creatorForm.email.trim(),
      country: '',
      created_at: new Date().toISOString(),
    }
    setCustomCreators(prev => [c, ...prev])
    toggleCreator(c) // auto-select — you added them because you want to email them
    setCreatorForm({ name: '', email: '', platform: 'YouTube' })
    setAddingCreator(false)
  }

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
  const [campaignName, setCampaignName] = useState('')
  const [savingCampaign, setSavingCampaign] = useState(false)
  const [campaignSaved, setCampaignSaved] = useState(false)
  const [connectedEmail, setConnectedEmail] = useState('')

  useEffect(() => {
    const read = () => {
      const c = document.cookie.split('; ').find(r => r.startsWith('prov_google_email='))
      setConnectedEmail(c ? decodeURIComponent(c.split('=')[1] || '') : '')
    }
    read()
    document.addEventListener('visibilitychange', read)
    window.addEventListener('focus', read)
    return () => { document.removeEventListener('visibilitychange', read); window.removeEventListener('focus', read) }
  }, [])

  // Step 5: Track — outreach history (one profile per recipient, from the DB)
  const [outreach, setOutreach] = useState<OutreachEntry[]>([])
  const [syncingReplies, setSyncingReplies] = useState(false)
  const [pitchingSponsor, setPitchingSponsor] = useState<string | null>(null)
  const [pitchedFor, setPitchedFor] = useState<Set<string>>(new Set())
  const [expandedOutreach, setExpandedOutreach] = useState<Set<string>>(new Set())
  // Deal wrapped → log its numbers into the Performance Tracker.
  const [trackingPerf, setTrackingPerf] = useState<{ email: string; name: string } | null>(null)
  // Full Gmail conversation per recipient, fetched on first expand.
  const [threads, setThreads] = useState<Record<string, ThreadMsg[] | 'loading'>>({})

  function loadThread(email: string) {
    if (threads[email] && threads[email] !== 'loading') return // cached
    setThreads(prev => ({ ...prev, [email]: 'loading' }))
    fetch(`/api/outreach/thread?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(d => setThreads(prev => ({ ...prev, [email]: Array.isArray(d.messages) ? d.messages : [] })))
      .catch(() => setThreads(prev => ({ ...prev, [email]: [] })))
  }
  const [followups, setFollowups] = useState<{ id: string; recipient_email: string; recipient_name: string | null; subject: string; send_at: string; status: string; fail_reason: string | null }[]>([])
  const [contracts, setContracts] = useState<{ influencer: string; sponsor: string } | null>(null)
  const [generatingContracts, setGeneratingContracts] = useState(false)
  const [aiSuggesting, setAiSuggesting] = useState<string | null>(null)

  // Server-side, filtered, paginated search (via /api/creators/search) — the DB
  // does the filtering and pagination, so this scales to millions of creators
  // instead of loading them all into the browser.
  const runSearch = useCallback(async (pg: number) => {
    setLoading(true)
    setPage(pg)
    const filters = {
      query: query || undefined,
      niche: selectedNiche && selectedNiche !== 'All' ? selectedNiche : undefined,
      platform,
      min_avg_views: minViews > 0 ? minViews : undefined,
      max_avg_views: maxViews > 0 ? maxViews : undefined,
      min_followers: minSubs > 0 ? minSubs : undefined,
      max_followers: maxSubs > 0 ? maxSubs : undefined,
      language: language || undefined,
      country: country || undefined,
      has_email: hasEmail || undefined,
    }
    try {
      const res = await fetch('/api/creators/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters, limit: PAGE_SIZE, offset: pg * PAGE_SIZE }),
      })
      const d = await res.json()
      setCreators(d.creators ?? [])
      setTotal(d.total ?? 0)
    } catch { setCreators([]); setTotal(0) }
    setLoading(false)
  }, [query, selectedNiche, platform, minViews, maxViews, minSubs, maxSubs, language, country, hasEmail])

  // Re-run from page 0 whenever any filter changes — one shared debounce so
  // typing (text or numbers) doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => runSearch(0), 350)
    return () => clearTimeout(t)
  }, [runSearch])

  // Sponsors are filtered server-side (niche + country + search) — the DB pool
  // is too big to ship to the browser. Bundled samples remain the empty-DB fallback.
  const [allSponsors, setAllSponsors] = useState<Sponsor[]>([])
  const [customSponsors, setCustomSponsors] = useState<Sponsor[]>([])
  const [sponsorQuery, setSponsorQuery] = useState('')
  const [sponsorCountry, setSponsorCountry] = useState('')
  const [addingSponsor, setAddingSponsor] = useState(false)
  const [sponsorForm, setSponsorForm] = useState({ name: '', industry: '', typical_budget: '', email: '' })

  useEffect(() => {
    let active = true
    const sampleFallback = () => {
      const all = selectedNiche === 'All'
      const niche = selectedNiche.toLowerCase()
      const ql = sponsorQuery.trim().toLowerCase()
      return SAMPLE_SPONSORS.filter(s => {
        const inNiche = all || s.niche === selectedNiche || (s.industry || '').toLowerCase().includes(niche)
        const inSearch = !ql || s.name.toLowerCase().includes(ql)
        return inNiche && inSearch
      })
    }
    const t = setTimeout(async () => {
      setLoadingSponsors(true)
      try {
        const params = new URLSearchParams()
        if (selectedNiche !== 'All') params.set('niche', selectedNiche)
        if (sponsorCountry) params.set('country', sponsorCountry)
        if (sponsorQuery.trim()) params.set('q', sponsorQuery.trim())
        const res = await fetch(`/api/sponsors?${params.toString()}`)
        const { sponsors: data } = await res.json()
        if (!active) return
        setAllSponsors(data && data.length ? data : sampleFallback())
      } catch {
        if (active) setAllSponsors(sampleFallback())
      } finally {
        if (active) setLoadingSponsors(false)
      }
    }, 250)
    return () => { active = false; clearTimeout(t) }
  }, [selectedNiche, sponsorCountry, sponsorQuery])

  // Your own added sponsors always show, pinned above the directory.
  useEffect(() => {
    setSponsors([...customSponsors, ...allSponsors])
  }, [allSponsors, customSponsors])

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
      email: sponsorForm.email.trim() || null,
    }
    setCustomSponsors(prev => [s, ...prev])
    setSelectedSponsors(prev => new Set(prev).add(s.id))
    setSponsorForm({ name: '', industry: '', typical_budget: '', email: '' })
    setAddingSponsor(false)
  }

  // Load agency branding once (for the email signature).
  useEffect(() => {
    try { const raw = localStorage.getItem(BRANDING_KEY); if (raw) setBranding(JSON.parse(raw)) } catch {}
  }, [])

  // Fill [Variables] in a template from a creator + sponsor.
  function fillVars(text: string, creator?: Influencer, sponsor?: Sponsor) {
    const first = creator?.name ? greetingName(creator.name) : '[FirstName]'
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
    const creator = Object.values(selectedObjs)[0]
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

  // Persist the campaign (name + selections) so it appears in Reports and the
  // Client Portal. Saves locally for reliability, then best-effort to the API.
  async function saveCampaign(): Promise<string> {
    setSavingCampaign(true)
    const selectedCreatorList = Object.values(selectedObjs)
    const selectedSponsorList = sponsors.filter(s => selectedSponsors.has(s.id))
    // "All niches" isn't a real niche — derive one from the chosen creators.
    const effectiveNiche = selectedNiche !== 'All' ? selectedNiche : (selectedCreatorList[0]?.niche ?? 'Lifestyle')
    const name = campaignName.trim() || `${effectiveNiche} Campaign`
    const id = campaignId ?? newCampaignId()
    const record: SavedCampaign = {
      id, name, niche: effectiveNiche, status: 'draft',
      creator_ids: selectedCreatorList.map(c => c.id),
      sponsor_ids: selectedSponsorList.map(s => s.id),
      created_at: new Date().toISOString(),
    }
    saveLocalCampaign(record)
    setCampaignId(id)
    // Best-effort server save (works once real auth + DB are live).
    let finalId = campaignId ?? id
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, niche: effectiveNiche, creator_ids: record.creator_ids, sponsor_ids: record.sponsor_ids }),
      })
      const { campaign } = await res.json().catch(() => ({ campaign: null }))
      // Adopt the persisted row's id — email tracking (and Reply Radar) key off it.
      if (campaign?.id && !campaign.dev) { finalId = campaign.id; setCampaignId(campaign.id); saveLocalCampaign({ ...record, id: campaign.id }) }
    } catch {}
    setSavingCampaign(false)
    setCampaignSaved(true)
    setTimeout(() => setCampaignSaved(false), 2500)
    return finalId
  }

  async function sendAll() {
    if (!connectedEmail) { router.push('/dashboard/settings?google=connect#integrations'); return }
    const savedId = await saveCampaign()
    setSending(true)
    const selectedCreatorList = Object.values(selectedObjs)
    const selectedSponsorList = sponsors.filter(s => selectedSponsors.has(s.id))

    // Build email list — personalize the chosen strategy PER creator so each
    // recipient gets their own [FirstName]/[Topic]/[Followers] filled in.
    const strat = STEP1_STRATEGIES.find(s => s.id === selectedStrategy) ?? STEP1_STRATEGIES[0]
    const sig = '\n\n' + buildSignature(branding)
    const firstSponsor = selectedSponsorList[0]
    const emailList: { to: string; subject: string; body: string; recipient_type: string; recipient_name?: string; follow_ups?: { subject: string; body: string; days: number }[] }[] = []
    for (const creator of selectedCreatorList) {
      if (!creator.email) continue
      emailList.push({
        to: creator.email,
        subject: fillVars(strat.subject, creator, firstSponsor),
        body: fillVars(strat.body, creator, firstSponsor) + sig,
        recipient_type: 'creator',
        recipient_name: creator.name,
        // Day-3 / day-7 nudges, personalized per creator; auto-cancelled on reply.
        follow_ups: DEFAULT_FOLLOW_UPS.map(f => ({
          subject: fillVars(f.subject, creator, firstSponsor),
          body: fillVars(f.body, creator, firstSponsor) + sig,
          days: f.days,
        })),
      })
    }
    // Sponsors are NOT emailed here — pitching a brand before the creator
    // agrees makes no sense. Once a reply comes back "interested", the Track
    // page shows a "Pitch sponsor" button on that creator's card.

    const res = await fetch('/api/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: savedId, emails: emailList }),
    })
    const { results } = await res.json()
    setSent(results ?? [])
    setSending(false)
    setStep(4)
  }

  // Outreach history comes from the DB, so it survives navigation/reloads —
  // no need to hit "Check for replies" just to see past activity.
  const loadOutreach = useCallback(async () => {
    try {
      const d = await fetch('/api/outreach').then(r => r.json())
      if (Array.isArray(d.outreach)) setOutreach(d.outreach)
    } catch { /* leave current list */ }
  }, [])

  // Load history + follow-up queue whenever the Track step opens (and after sends).
  useEffect(() => {
    if (step !== 4) return
    loadOutreach()
    fetch(`/api/followups${campaignId ? `?campaign_id=${campaignId}` : ''}`)
      .then(r => r.json())
      .then(d => setFollowups(d.followups ?? []))
      .catch(() => setFollowups([]))
  }, [step, campaignId, sent, loadOutreach])

  // "Check for replies" — scans the connected Gmail inbox right now.
  async function syncReplies() {
    setSyncingReplies(true)
    try {
      await fetch('/api/replies', { method: 'POST' })
      await loadOutreach()
      // New replies auto-cancel matching follow-ups — refresh the queue too.
      const f = await fetch(`/api/followups${campaignId ? `?campaign_id=${campaignId}` : ''}`).then(r => r.json())
      setFollowups(f.followups ?? [])
    } catch { /* leave current list */ }
    setSyncingReplies(false)
  }

  // Clicking an unread (green) card marks it read and clears the highlight.
  function markRead(entry: OutreachEntry) {
    if (!entry.reply || entry.reply.read_at) return
    const now = new Date().toISOString()
    setOutreach(prev => prev.map(o => o.email === entry.email && o.reply
      ? { ...o, reply: { ...o.reply, read_at: now } } : o))
    fetch('/api/replies', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.reply.id }),
    }).catch(() => {})
  }

  // Sponsors are only pitched AFTER a creator agrees — this fires the sponsor
  // email for one interested creator, to every selected sponsor with a real email.
  async function pitchSponsor(entry: OutreachEntry) {
    const sponsorTargets = sponsors.filter(s => selectedSponsors.has(s.id) && s.email)
    if (!sponsorTargets.length) return
    setPitchingSponsor(entry.email)
    const creator = Object.values(selectedObjs).find(c => c.email?.toLowerCase() === entry.email)
      ?? ({ name: entry.name ?? entry.email, platform: 'YouTube', niche: selectedNiche === 'All' ? 'Lifestyle' : selectedNiche, subscribers: 0, avg_views: 0, engagement_rate: 0 } as Influencer)
    const sig = '\n\n' + buildSignature(branding)
    try {
      await fetch('/api/emails/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          emails: sponsorTargets.map(sp => ({
            to: sp.email,
            subject: fillVars(STEP2_SPONSOR.subject, creator, sp),
            body: fillVars(STEP2_SPONSOR.body, creator, sp) + sig,
            recipient_type: 'sponsor',
            recipient_name: sp.name,
          })),
        }),
      })
      setPitchedFor(prev => new Set(prev).add(entry.email))
      loadOutreach()
    } catch { /* button stays available to retry */ }
    setPitchingSponsor(null)
  }

  async function cancelFollowup(id: string) {
    const res = await fetch('/api/followups', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setFollowups(prev => prev.map(f => f.id === id ? { ...f, status: 'cancelled', fail_reason: 'cancelled by user' } : f))
  }

  async function getAISuggestion(responseId: string, replyMessage: string) {
    setAiSuggesting(responseId)
    const res = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replyMessage, recipientType: 'creator', originalSubject: 'Campaign Partnership' }),
    })
    const { suggestion } = await res.json()
    setOutreach(prev => prev.map(o => o.reply?.id === responseId
      ? { ...o, reply: { ...o.reply!, ai_suggestion: suggestion } } : o))
    setAiSuggesting(null)
  }

  async function generateContracts() {
    const creator = Object.values(selectedObjs)[0]
    const sponsor = sponsors.find(s => selectedSponsors.has(s.id))
    setGeneratingContracts(true)
    const res = await fetch('/api/contracts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agencyName: 'Your Agency',
        creatorName: creator?.name ?? '[CREATOR]',
        sponsorName: sponsor?.name ?? '[BRAND]',
        niche: creator?.niche ?? (selectedNiche !== 'All' ? selectedNiche : 'general'),
        campaignName: `${creator?.niche ?? (selectedNiche !== 'All' ? selectedNiche : 'New')} Campaign`,
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


  const selectedCreators = Object.values(selectedObjs)
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
            <select value={selectedNiche} onChange={e => { setSelectedNiche(e.target.value); clearSelected(); setSelectedSponsors(new Set()) }}
              style={{
                appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
                background: 'rgba(255,215,0,0.1)', border: '1.5px solid rgba(255,215,0,0.45)',
                color: '#FFD700', borderRadius: 10, padding: '9px 34px 9px 14px',
                fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer', outline: 'none',
              }}>
              <option value="All" style={{ background: '#111', color: '#f0f0f0', fontWeight: 600 }}>All niches</option>
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

            {/* Filters panel — grouped sections: identity / reach ranges / advanced / actions */}
            <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 14, padding: 20, marginBottom: 18 }}>

              {/* Who — name search + platform */}
              <div className="disc-grid-top">
                <div>
                  <div className="disc-eyebrow"><Search size={12} />Creator</div>
                  <div style={{ position: 'relative' }}>
                    <input
                      style={{ width: '100%', background: '#141414', border: '1px solid #2a2a2a', borderRadius: 10, color: '#f5f5f5', fontSize: '0.9375rem', padding: '10px 34px 10px 12px', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,215,0,0.08)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.boxShadow = 'none' }}
                      placeholder="Search creators by name…"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                    />
                    {query && (
                      <button onClick={() => setQuery('')} aria-label="Clear search"
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#555', display: 'flex' }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <div className="disc-eyebrow"><Globe size={12} />Platform</div>
                  <select value={platform} onChange={e => setPlatform(e.target.value)}
                    style={{ width: '100%', background: '#141414', border: '1px solid #2a2a2a', borderRadius: 10, color: platform === 'All' ? '#4e4e4e' : '#f5f5f5', fontSize: '0.9375rem', padding: '10px 12px', outline: 'none', cursor: 'pointer' }}>
                    <option value="All">All platforms</option>
                    {PLATFORMS.filter(p => p !== 'All').map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="disc-divider" />

              {/* Reach — min/max ranges, empty side = no limit */}
              <div className="disc-grid-2">
                <RangeField
                  icon={<Users size={12} />} label="Subscribers"
                  minValue={minSubs} maxValue={maxSubs} onMin={setMinSubs} onMax={setMaxSubs}
                  minPh="10,000" maxPh="5,000,000"
                  helper="Leave either side empty for no limit"
                />
                <RangeField
                  icon={<BarChart3 size={12} />} label="Avg views"
                  minValue={minViews} maxValue={maxViews} onMin={setMinViews} onMax={setMaxViews}
                  minPh="25,000" maxPh="2,000,000"
                  helper="Average views across recent videos"
                />
              </div>

              <div className="disc-divider" />

              {/* Advanced — language / country / contact, collapsed by default */}
              {(() => {
                const advCount = (language ? 1 : 0) + (country ? 1 : 0) + (hasEmail ? 1 : 0)
                return (
                  <button type="button" onClick={() => setAdvancedOpen(o => !o)} aria-expanded={advancedOpen}
                    className={`disc-adv-toggle${advancedOpen ? ' open' : ''}`}>
                    <SlidersHorizontal size={13} />
                    Advanced filters
                    {advCount > 0 && <span className="disc-adv-badge">{advCount}</span>}
                    <ChevronDown size={14} />
                  </button>
                )
              })()}
              <div className={`disc-collapse${advancedOpen ? ' open' : ''}`}>
                <div>
                  <div className="disc-grid-3" style={{ paddingTop: 14 }}>
                    <div>
                      <div className="disc-eyebrow">Language</div>
                      <ComboboxSearch label="" value={language} onChange={setLanguage} options={LANGUAGES} placeholder="Any language" />
                    </div>
                    <div>
                      <div className="disc-eyebrow">Audience country</div>
                      <ComboboxSearch label="" value={country} onChange={setCountry} options={COUNTRIES} placeholder="Any country" />
                    </div>
                    <div>
                      <div className="disc-eyebrow"><Mail size={12} />Contact</div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 10, padding: '10px 12px', fontSize: '0.9375rem', color: hasEmail ? '#f5f5f5' : '#999', cursor: 'pointer', userSelect: 'none' }}>
                        <input type="checkbox" checked={hasEmail} onChange={e => setHasEmail(e.target.checked)} style={{ cursor: 'pointer', accentColor: '#FFD700', width: 15, height: 15 }} />
                        Has contact email
                      </label>
                      <p className="disc-helper">Only creators you can actually reach</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="disc-divider" />

              {/* Actions — selection on the left, filter actions on the right */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => {
                  const allOnPage = creators.length > 0 && creators.every(c => selected.has(c.id))
                  // Toggle only the current page's rows; off-page selections are untouched.
                  creators.forEach(c => {
                    if (allOnPage === selected.has(c.id)) toggleCreator(c)
                  })
                }} className="btn-outline-gold" style={{ padding: '0 16px', fontSize: '0.875rem' }}>
                  {creators.length > 0 && creators.every(c => selected.has(c.id)) ? 'Deselect all' : 'Select all'}
                </button>
                {selected.size > 0 && (
                  <button onClick={clearSelected} className="btn-outline-gold" style={{ padding: '0 16px', fontSize: '0.875rem' }}>Clear {selected.size}</button>
                )}
                <button onClick={() => setAddingCreator(a => !a)} className="btn-outline-gold" style={{ padding: '0 16px', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={14} /> Add your own
                </button>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button onClick={() => { setQuery(''); setPlatform('All'); setMinViews(0); setMaxViews(0); setMinSubs(0); setMaxSubs(0); setLanguage(''); setCountry(''); setHasEmail(false) }}
                    style={{ background: 'none', border: 'none', color: '#777', fontSize: '0.8125rem', cursor: 'pointer', padding: '8px 4px' }}>
                    Reset filters
                  </button>
                  <button onClick={() => runSearch(0)} className="btn-gold" style={{ padding: '0 20px', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <Search size={14} /> Search
                  </button>
                </span>
              </div>
            </div>

            {addingCreator && (
              <form onSubmit={addCustomCreator} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <input className="input-dark" placeholder="Creator name *" value={creatorForm.name} onChange={e => setCreatorForm({ ...creatorForm, name: e.target.value })} style={{ flex: '1 1 180px' }} />
                <input className="input-dark" type="email" placeholder="Email *" value={creatorForm.email} onChange={e => setCreatorForm({ ...creatorForm, email: e.target.value })} style={{ flex: '1 1 200px' }} />
                <select className="input-dark" value={creatorForm.platform} onChange={e => setCreatorForm({ ...creatorForm, platform: e.target.value })} style={{ flex: '0 1 140px' }}>
                  {PLATFORMS.filter(p => p !== 'All').map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <button type="submit" className="btn-gold" style={{ padding: '0 18px' }}>Add</button>
                <button type="button" onClick={() => setAddingCreator(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
              </form>
            )}

            <p style={{ color: '#444', fontSize: '0.8125rem', marginBottom: 12 }}>
              {loading ? 'Loading…' : `${total.toLocaleString()} creators${selectedNiche !== 'All' ? ` in ${selectedNiche}` : ''}${customCreators.length ? ` + ${customCreators.length} added by you` : ''}`}
            </p>

            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1a1a1a', background: '#0f0f0f' }}>
                      <th style={{ padding: '12px 16px', width: 36 }}></th>
                      {['Name', 'Platform', 'Subscribers', 'Avg Views', 'Engagement', 'Language', 'Country', 'Email'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#444', fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...customCreators, ...creators].map((c, i, rows) => (
                      <tr key={c.id} onClick={() => toggleCreator(c)}
                        style={{ borderBottom: i < rows.length - 1 ? '1px solid #161616' : 'none', cursor: 'pointer', background: selected.has(c.id) ? 'rgba(255,215,0,0.04)' : 'transparent', transition: 'background 0.1s' }}
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
                        <td style={{ padding: '14px 16px', color: '#888' }}>{c.language ?? '—'}</td>
                        <td style={{ padding: '14px 16px', color: '#666' }}>{c.country}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
                            <span style={{ color: '#666', fontSize: '0.8125rem', fontFamily: 'monospace' }}>{c.email ?? '—'}</span>
                            {c.email && <CopyBtn text={c.email} />}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!loading && creators.length === 0 && customCreators.length === 0 && (
                      <tr><td colSpan={9} style={{ padding: '48px 16px', textAlign: 'center', color: '#444' }}>No creators match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {total > PAGE_SIZE && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
                <button onClick={() => runSearch(page - 1)} disabled={page === 0 || loading} className="btn-outline-gold" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>Previous</button>
                <span style={{ color: '#555', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '0.875rem' }}>Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
                <button onClick={() => runSearch(page + 1)} disabled={(page + 1) * PAGE_SIZE >= total || loading} className="btn-outline-gold" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>Next</button>
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
                  {selectedSponsorList.length > 0 ? <span style={{ color: '#FFD700', fontWeight: 700 }}>{selectedSponsorList.length} sponsors selected</span> : (selectedNiche !== 'All' ? `Auto-matched for ${selectedNiche} niche` : 'All sponsors')}
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
              <div style={{ flex: '0 1 200px', minWidth: 170 }}>
                <ComboboxSearch label="" value={sponsorCountry} onChange={setSponsorCountry} options={COUNTRIES} placeholder="Any country" />
              </div>
              <button onClick={() => { const all = new Set(selectedSponsors); sponsors.forEach(s => all.add(s.id)); setSelectedSponsors(all) }} className="btn-outline-gold" style={{ padding: '0 16px', fontSize: '0.875rem' }}>Select all</button>
              {selectedSponsorList.length > 0 && <button onClick={() => setSelectedSponsors(new Set())} className="btn-outline-gold" style={{ padding: '0 16px', fontSize: '0.875rem' }}>Clear {selectedSponsorList.length}</button>}
              <button onClick={() => setAddingSponsor(a => !a)} className="btn-gold" style={{ padding: '0 16px', fontSize: '0.875rem' }}><Plus size={14} /> Add your own</button>
            </div>

            {addingSponsor && (
              <form onSubmit={addCustomSponsor} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <input className="input-dark" placeholder="Sponsor name *" value={sponsorForm.name} onChange={e => setSponsorForm({ ...sponsorForm, name: e.target.value })} style={{ flex: '1 1 180px' }} />
                <input className="input-dark" type="email" placeholder="Contact email" value={sponsorForm.email} onChange={e => setSponsorForm({ ...sponsorForm, email: e.target.value })} style={{ flex: '1 1 200px' }} />
                <input className="input-dark" placeholder="Industry" value={sponsorForm.industry} onChange={e => setSponsorForm({ ...sponsorForm, industry: e.target.value })} style={{ flex: '1 1 140px' }} />
                <input className="input-dark" placeholder="Budget e.g. $5K-$40K" value={sponsorForm.typical_budget} onChange={e => setSponsorForm({ ...sponsorForm, typical_budget: e.target.value })} style={{ flex: '1 1 150px' }} />
                <button type="submit" className="btn-gold" style={{ padding: '0 18px' }}>Add</button>
                <button type="button" onClick={() => setAddingSponsor(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
              </form>
            )}

            <p style={{ color: '#444', fontSize: '0.8125rem', marginBottom: 12 }}>
              {loadingSponsors ? 'Loading…' : `${sponsors.length} sponsors${selectedNiche !== 'All' ? ` matched for ${selectedNiche}` : ''}`}
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
                    <p style={{ fontSize: '0.8125rem', color: '#555', marginBottom: 10, textTransform: 'capitalize' }}>
                      {s.industry}{s.country ? ` · ${s.country}` : ''}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: s.email ? '#4ade80' : '#666', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Mail size={11} /> {s.email ?? 'No contact email — outreach skipped'}
                    </p>
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
                {connectedEmail ? (
                  <button onClick={sendAll} disabled={sending} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {sending ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send All Emails</>}
                  </button>
                ) : (
                  <button onClick={() => router.push('/dashboard/settings?google=connect#integrations')} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Mail size={16} /> Connect your email to send
                  </button>
                )}
              </div>
            </div>

            {/* Name & save the campaign */}
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cfcfcf', marginBottom: 8 }}>Campaign name</label>
                <input
                  value={campaignName}
                  onChange={e => { setCampaignName(e.target.value); setCampaignSaved(false) }}
                  placeholder={`${selectedNiche} Campaign`}
                  style={{ width: '100%', background: '#0f0f0f', border: '1px solid #1f1f1f', borderRadius: 8, padding: '11px 14px', color: '#e8e8e8', fontSize: '0.9375rem', outline: 'none' }}
                />
              </div>
              <button onClick={() => saveCampaign()} disabled={savingCampaign}
                className={campaignSaved ? '' : 'btn-outline-gold'}
                style={campaignSaved
                  ? { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 9, background: 'rgba(0,208,132,0.12)', border: '1px solid rgba(0,208,132,0.4)', color: '#00D084', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }
                  : { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px' }}>
                {savingCampaign ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                  : campaignSaved ? <><Check size={15} /> Saved</>
                  : <><FileText size={15} /> Save campaign</>}
              </button>
            </div>

            {!connectedEmail && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(202,138,4,0.08)', border: '1px solid rgba(202,138,4,0.35)', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
                <Mail size={18} style={{ color: '#FFD700', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: '0.875rem', color: '#d0d0d0', lineHeight: 1.6 }}>
                  <strong style={{ color: '#FFD700' }}>Connect your email first.</strong> Emails are sent from your own Gmail for the best deliverability — you can&apos;t send until it&apos;s connected.{' '}
                  <button onClick={() => router.push('/dashboard/settings?google=connect#integrations')} style={{ background: 'none', border: 'none', color: '#FFD700', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' }}>
                    Connect now →
                  </button>
                </div>
              </div>
            )}

            {connectedEmail && (
              <p style={{ fontSize: '0.8125rem', color: '#4ade80', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={14} /> Sending from {connectedEmail}
              </p>
            )}

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
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f5f5f5', marginBottom: 4 }}>Campaign Tracker</h1>
                <p style={{ color: '#555', fontSize: '0.9375rem' }}>{outreach.length} people contacted · Monitor responses and close deals</p>
              </div>
              <button onClick={() => router.push('/dashboard/performance')}
                className="btn-outline-gold" style={{ padding: '8px 16px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart3 size={14} /> Performance Tracker
              </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Contacted', value: outreach.length, color: '#FFD700' },
                { label: 'Replied', value: outreach.filter(o => o.reply).length, color: '#a5b4fc' },
                { label: 'Interested', value: outreach.filter(o => o.reply?.deal_status === 'interested').length, color: '#4ade80' },
                { label: 'Failed', value: sent.filter(s => s.status === 'error').length, color: '#ef4444' },
              ].map(stat => (
                <div key={stat.label} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
                  <div style={{ fontSize: '0.875rem', color: '#555' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Scheduled follow-ups queue */}
            {followups.length > 0 && (
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a1a1a', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ color: '#888', fontWeight: 700, fontSize: '0.875rem' }}>Scheduled Follow-ups</p>
                  <p style={{ color: '#555', fontSize: '0.75rem' }}>Auto-cancelled if they reply or unsubscribe</p>
                </div>
                {followups.map((f, i) => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: i < followups.length - 1 ? '1px solid #161616' : 'none', fontSize: '0.875rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: f.status === 'pending' ? '#FFD700' : f.status === 'sent' ? '#4ade80' : f.status === 'cancelled' ? '#666' : '#ef4444' }} />
                    <span style={{ color: '#d0d0d0', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.recipient_name || f.recipient_email}
                    </span>
                    <span style={{ color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{f.subject}</span>
                    <span style={{ color: '#666', flexShrink: 0 }}>
                      {f.status === 'pending'
                        ? new Date(f.send_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : f.status === 'cancelled' && f.fail_reason === 'replied' ? 'replied'
                        : f.status}
                    </span>
                    {f.status === 'pending' && (
                      <button onClick={() => cancelFollowup(f.id)} title="Cancel this follow-up"
                        style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', padding: 2 }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Outreach history — one profile per person, newest activity first.
                Unread replies pin to the top with a green highlight until clicked. */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ color: '#888', fontWeight: 700, fontSize: '0.875rem' }}>Outreach — everyone you&apos;ve contacted</p>
                <button onClick={syncReplies} disabled={syncingReplies}
                  className="btn-outline-gold" style={{ padding: '7px 14px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {syncingReplies ? <><Loader2 size={13} className="animate-spin" /> Checking Gmail…</> : <><Inbox size={13} /> Check for replies</>}
                </button>
              </div>
              {outreach.length === 0 && (
                <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: '28px 20px', textAlign: 'center', color: '#444', fontSize: '0.875rem' }}>
                  Nobody contacted yet — send a campaign and every recipient shows up here. Prov checks your Gmail for replies every hour.
                </div>
              )}
              {outreach.map(o => {
                const unread = !!o.reply && !o.reply.read_at
                const chipColor = !o.reply ? { c: '#777', bg: 'rgba(120,120,120,0.12)' }
                  : o.reply.deal_status === 'declined' ? { c: '#f87171', bg: 'rgba(239,68,68,0.12)' }
                  : o.reply.deal_status === 'negotiating' ? { c: '#facc15', bg: 'rgba(250,204,21,0.12)' }
                  : { c: '#4ade80', bg: 'rgba(74,222,128,0.12)' }
                const canPitch = !!o.reply && (o.reply.deal_status === 'interested' || o.reply.deal_status === 'negotiating')
                  && o.type === 'creator' && sponsors.some(s => selectedSponsors.has(s.id) && s.email)
                const expanded = expandedOutreach.has(o.email)
                return (
                  <div key={o.email}
                    onClick={() => {
                      markRead(o)
                      if (!expanded) loadThread(o.email)
                      setExpandedOutreach(prev => {
                        const n = new Set(prev)
                        n.has(o.email) ? n.delete(o.email) : n.add(o.email)
                        return n
                      })
                    }}
                    style={{
                      background: unread ? 'rgba(74,222,128,0.06)' : '#111',
                      border: `1px solid ${unread ? 'rgba(74,222,128,0.45)' : '#1a1a1a'}`,
                      borderRadius: 12, padding: '18px 20px', marginBottom: 12,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <ChevronDown size={14} style={{ color: '#555', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                      <span style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '0.9375rem' }}>{o.name || o.email}</span>
                      {o.type === 'sponsor' && (
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: '#FFD700', background: 'rgba(255,215,0,0.1)' }}>SPONSOR</span>
                      )}
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, textTransform: 'capitalize', color: chipColor.c, background: chipColor.bg }}>
                        {o.reply ? o.reply.deal_status : 'awaiting reply'}
                      </span>
                      {unread && (
                        <span style={{ fontSize: '0.6875rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, color: '#052e12', background: '#4ade80' }}>NEW REPLY</span>
                      )}
                      <span style={{ marginLeft: 'auto', color: '#555', fontSize: '0.75rem', flexShrink: 0 }}>
                        {new Date(o.last_activity).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p style={{ color: '#555', fontSize: '0.8125rem', marginBottom: o.reply ? 12 : 0 }}>
                      {o.email} · {o.sends} email{o.sends > 1 ? 's' : ''} sent · &ldquo;{o.last_subject}&rdquo;
                    </p>
                    {o.reply && (
                      <>
                        <p style={{ color: '#d0d0d0', fontSize: '0.9375rem', marginBottom: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{o.reply.message}</p>
                        {o.reply.ai_suggestion ? (
                          <div style={{ background: 'rgba(102,126,234,0.08)', border: '1px solid rgba(102,126,234,0.2)', borderRadius: 8, padding: '14px', marginBottom: canPitch ? 12 : 0 }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#667eea', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={11} /> AI Suggestion</p>
                            <p style={{ color: '#c7d2fe', fontSize: '0.9375rem', lineHeight: 1.6 }}>{o.reply.ai_suggestion}</p>
                          </div>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); getAISuggestion(o.reply!.id, o.reply!.message) }} disabled={aiSuggesting === o.reply.id}
                            className="btn-outline-gold" style={{ padding: '8px 16px', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: canPitch ? 12 : 0, marginRight: 10 }}>
                            {aiSuggesting === o.reply.id ? <><Loader2 size={13} className="animate-spin" /> Thinking...</> : <><Zap size={13} /> Get AI Response</>}
                          </button>
                        )}
                        {canPitch && (
                          pitchedFor.has(o.email) ? (
                            <p style={{ color: '#4ade80', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6 }}><Check size={13} /> Sponsor pitched — watch for their reply here</p>
                          ) : (
                            <button onClick={e => { e.stopPropagation(); pitchSponsor(o) }} disabled={pitchingSponsor === o.email}
                              className="btn-gold" style={{ padding: '8px 16px', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              {pitchingSponsor === o.email ? <><Loader2 size={13} className="animate-spin" /> Pitching…</> : <><Send size={13} /> Pitch sponsor — they said yes</>}
                            </button>
                          )
                        )}
                        {o.type === 'creator' && (o.reply.deal_status === 'interested' || o.reply.deal_status === 'negotiating') && (
                          <button onClick={e => { e.stopPropagation(); setTrackingPerf({ email: o.email, name: o.name || o.email }) }}
                            className="btn-outline-gold" style={{ padding: '8px 16px', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 10, marginTop: 10 }}>
                            <BarChart3 size={13} /> Deal closed — log performance
                          </button>
                        )}
                      </>
                    )}
                    {expanded && (() => {
                      const thread = threads[o.email]
                      const loading = thread === 'loading'
                      const msgs = Array.isArray(thread) ? thread : []
                      return (
                        <div onClick={e => e.stopPropagation()}
                          style={{ marginTop: 14, borderTop: '1px solid #1e1e1e', paddingTop: 12, maxHeight: 380, overflowY: 'auto', cursor: 'default' }}>
                          <p style={{ color: '#666', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                            Conversation with {o.name || o.email}
                          </p>
                          {loading && (
                            <p style={{ color: '#555', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0' }}>
                              <Loader2 size={13} className="animate-spin" /> Loading thread from Gmail…
                            </p>
                          )}
                          {!loading && msgs.length > 0 && msgs.map(m => (
                            <div key={m.id} style={{
                              background: m.direction === 'sent' ? '#0d0d0d' : 'rgba(74,222,128,0.05)',
                              border: `1px solid ${m.direction === 'sent' ? '#191919' : 'rgba(74,222,128,0.25)'}`,
                              borderRadius: 8, padding: '12px 14px', marginBottom: 10,
                              marginLeft: m.direction === 'sent' ? 0 : 24,
                              marginRight: m.direction === 'sent' ? 24 : 0,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: m.direction === 'sent' ? '#FFD700' : '#4ade80' }}>
                                  {m.direction === 'sent' ? 'YOU' : (o.name || o.email).toUpperCase()}
                                </span>
                                <span style={{ color: '#666', fontSize: '0.75rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.subject}</span>
                                <span style={{ color: '#555', fontSize: '0.6875rem', flexShrink: 0 }}>
                                  {new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <p style={{ color: m.direction === 'sent' ? '#888' : '#c8e6c9', fontSize: '0.8125rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{m.body}</p>
                            </div>
                          ))}
                          {/* Gmail unavailable (or empty) — fall back to the tracked sends. */}
                          {!loading && msgs.length === 0 && o.history.map(h => (
                            <div key={h.id} style={{ background: '#0d0d0d', border: '1px solid #191919', borderRadius: 8, padding: '12px 14px', marginBottom: 10, marginRight: 24 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#FFD700' }}>YOU</span>
                                <span style={{ color: '#666', fontSize: '0.75rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.subject}</span>
                                <span style={{ color: '#555', fontSize: '0.6875rem', flexShrink: 0 }}>
                                  {new Date(h.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <p style={{ color: '#888', fontSize: '0.8125rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{h.body}</p>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>

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

      {trackingPerf && (
        <PerformanceTrackerModal
          creator_email={trackingPerf.email}
          creator_handle={trackingPerf.name}
          campaign_id={campaignId ?? undefined}
          brand_name=""
          onClose={() => setTrackingPerf(null)}
          onSave={() => setTrackingPerf(null)}
        />
      )}
    </DashboardShell>
  )
}
