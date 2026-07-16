'use client'

// Performance Tracker — every completed campaign becomes a permanent,
// quotable asset: lifetime creator stats, charts, proven-results cards,
// AI insights, side-by-side comparison, and shareable case studies.

import { useCallback, useEffect, useState } from 'react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Search, Plus, Sparkles, Copy, FileDown, Share2, Trophy, ExternalLink } from 'lucide-react'
import PerformanceTrackerModal from '@/components/ui/performance-tracker-modal'
import DashboardShell from '../DashboardShell'
import AskYourData from '../AskYourData'
import { WorkflowRunner, catalogFor, type Workflow } from './WorkflowsTab'

/* ── types ── */
interface LeaderRow { creator_id: string; creator_handle: string; campaigns: number; views: number; revenue: number; engagement: number; score: number }
interface Analytics {
  total_records: number; total_views: number; total_revenue: number
  timeline: Array<{ month: string; views: number; revenue: number; campaigns: number; engagement: number }>
  byPlatform: Array<{ platform: string; campaigns: number; views: number }>
  topBrands: Array<{ brand: string; campaigns: number; revenue: number }>
  creatorLeaderboard: LeaderRow[]
}
interface CreatorStats {
  total_campaigns: number; total_views: number; total_revenue: number
  avg_views_per_campaign: number; avg_revenue_per_campaign: number
  avg_engagement_rate: number; avg_cpm: number; unique_brands: number
  repeat_brand_rate: number; estimated_roi: number; performance_score: number
  score_breakdown?: ScoreBreakdown
  highest_campaign: { brand: string; revenue: number } | null
  campaigns: PerfRow[]
}
interface PerfRow {
  id: string; creator_id: string; campaign_name: string; brand_name: string; creator_handle: string
  product_promoted: string | null; campaign_date_posted: string; campaign_status: string
  platforms: Record<string, unknown>; metrics: Record<string, number>
  performance_score: number; roi_generated: number | null
  is_case_study: boolean; case_study_slug: string | null; notes: string | null
}
interface Insight { id?: string; insight_type: string; insight_text: string; is_actionable: boolean; next_action_recommendation: string | null; confidence_score: number }
interface ScoreBreakdown { consistency: number; revenue: number; views: number; engagement: number; brand_retention: number; completion: number; total: number }

/* ── shared bits ── */
const GOLD = '#FFD700', GREEN = '#10B981', BLUE = '#3B82F6', RED = '#EF4444'
const PIE_COLORS = [GOLD, BLUE, GREEN, '#A855F7', '#F97316', '#14B8A6', '#EC4899']
const card: React.CSSProperties = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 14, padding: 18 }
const eyebrow: React.CSSProperties = { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8a8a8a', marginBottom: 10 }
const mono: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' }

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}
function money(n: number): string { return `$${fmt(n)}` }
function scoreColor(s: number) { return s >= 80 ? GREEN : s >= 60 ? BLUE : s >= 40 ? '#F59E0B' : RED }

// Tier ladder quoted to brands: Platinum 90+, Gold 75+, Silver 60+, Bronze 45+.
function tierOf(s: number): { name: string; color: string } {
  if (s >= 90) return { name: 'Platinum', color: '#E5E4E2' }
  if (s >= 75) return { name: 'Gold', color: GOLD }
  if (s >= 60) return { name: 'Silver', color: '#B8BCC4' }
  if (s >= 45) return { name: 'Bronze', color: '#CD7F32' }
  return { name: 'Standard', color: '#777' }
}

function TierBadge({ score }: { score: number }) {
  const t = tierOf(score)
  return (
    <span style={{
      display: 'inline-block', fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.05em',
      textTransform: 'uppercase', color: t.color, border: `1px solid ${t.color}44`,
      background: `${t.color}14`, borderRadius: 6, padding: '2px 8px',
    }}>
      {t.name}
    </span>
  )
}

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 8) / 2, c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f1f1f" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(score)} strokeWidth={6}
        strokeDasharray={`${(score / 100) * c} ${c}`} strokeLinecap="round" />
      <text x={size / 2} y={size / 2} fill="#f5f5f5" fontSize={size / 4.2} fontWeight={800}
        textAnchor="middle" dominantBaseline="central" transform={`rotate(90 ${size / 2} ${size / 2})`}>
        {score}
      </text>
    </svg>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={card}>
      <p style={eyebrow}>{label}</p>
      <p style={{ fontSize: '1.625rem', fontWeight: 900, color: '#f5f5f5', ...mono }}>{value}</p>
      {sub && <p style={{ fontSize: '0.75rem', color: '#666', marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

const tooltipStyle = { background: '#141414', border: '1px solid #2a2a2a', borderRadius: 10, fontSize: 12, color: '#f5f5f5' }

/* ══ page ══ */
export default function PerformancePage() {
  const [tab, setTab] = useState<'overview' | 'analytics' | 'campaigns' | 'comparison' | 'cases'>('overview')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [selectedCreator, setSelectedCreator] = useState<LeaderRow | null>(null)
  const [creatorStats, setCreatorStats] = useState<CreatorStats | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  // Workflow orchestration
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [running, setRunning] = useState<Workflow | null>(null)
  const [runStep, setRunStep] = useState(0)

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/performance/analytics')
      const d = await res.json()
      if (!d.error) setAnalytics(d)
    } catch { /* keep last state */ }
    setLoading(false)
  }, [])

  const loadWorkflows = useCallback(async () => {
    try {
      const res = await fetch('/api/performance/workflows')
      const d = await res.json()
      if (d.workflows) setWorkflows(d.workflows)
    } catch { /* table may not exist yet */ }
  }, [])

  useEffect(() => { loadAnalytics(); loadWorkflows() }, [loadAnalytics, loadWorkflows])

  // Deep link from the global launcher / ⌘K palette: ?workflow=<id> auto-starts
  // that workflow's runner. Consumed once (and stripped from the URL) so a
  // refresh doesn't restart the run.
  const [deepLinkDone, setDeepLinkDone] = useState(false)
  useEffect(() => {
    if (deepLinkDone) return
    const wfId = new URLSearchParams(window.location.search).get('workflow')
    if (!wfId) { setDeepLinkDone(true); return }
    if (!workflows.length) return // wait for workflows to load, then re-run
    const wf = workflows.find(w => w.id === wfId)
    if (wf && wf.steps.some(s => s.enabled)) startWorkflow(wf)
    window.history.replaceState(null, '', '/dashboard/performance')
    setDeepLinkDone(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflows, deepLinkDone])

  // Runner navigation: entering a step switches to its tab (and opens the
  // capture modal for capture steps).
  const gotoRunStep = useCallback((wf: Workflow, index: number) => {
    const steps = wf.steps.filter(s => s.enabled)
    const step = steps[index]
    if (!step) return
    const entry = catalogFor(step.section_type)
    setTab(entry.tab === 'workflows' ? 'overview' : entry.tab)
    if (entry.opensModal) setShowModal(true)
  }, [])

  function startWorkflow(wf: Workflow) {
    setRunning(wf); setRunStep(0)
    gotoRunStep(wf, 0)
    fetch('/api/performance/workflows', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: wf.id, run_started: true }),
    }).catch(() => {})
  }

  function advanceWorkflow(dir: 1 | -1) {
    if (!running) return
    const steps = running.steps.filter(s => s.enabled)
    const next = runStep + dir
    if (next >= steps.length) { // finished
      fetch('/api/performance/workflows', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: running.id, run_completed: true }),
      }).catch(() => {})
      setRunning(null); setRunStep(0); loadWorkflows()
      return
    }
    if (next < 0) return
    setRunStep(next)
    gotoRunStep(running, next)
  }

  // Creator drill-down
  useEffect(() => {
    if (!selectedCreator) { setCreatorStats(null); setInsights([]); return }
    ;(async () => {
      const [statsRes, insightsRes] = await Promise.all([
        fetch(`/api/performance/creator?creator_id=${selectedCreator.creator_id}`),
        fetch(`/api/performance/insights?creator_id=${selectedCreator.creator_id}`),
      ])
      const stats = await statsRes.json()
      if (!stats.error) setCreatorStats(stats)
      const ins = await insightsRes.json()
      setInsights(ins.insights ?? [])
    })()
  }, [selectedCreator])

  async function generateInsights() {
    if (!selectedCreator) return
    setInsightsLoading(true)
    try {
      const res = await fetch('/api/performance/insights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creator_id: selectedCreator.creator_id }),
      })
      const d = await res.json()
      setInsights(d.insights ?? [])
    } finally {
      setInsightsLoading(false)
    }
  }

  const tabs: Array<[typeof tab, string]> = [
    ['overview', 'Overview'], ['analytics', 'Analytics'], ['campaigns', 'Campaigns'],
    ['comparison', 'Compare'], ['cases', 'Case studies'],
  ]

  return (
    <DashboardShell active="performance">
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <div style={{ padding: '32px 24px', maxWidth: 1300, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f5f5f5' }}>Performance Tracker</h1>
            <p style={{ color: '#666', fontSize: '0.9375rem', marginTop: 4 }}>
              Every completed campaign becomes proof for your next negotiation.
            </p>
          </div>
          <button className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setShowModal(true)}>
            <Plus size={16} /> Log campaign
          </button>
        </div>

        {/* Ask-your-data: natural-language queries over this workspace's history */}
        <AskYourData />

        {/* Agency-wide KPIs */}
        {analytics && analytics.total_records > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
            <Kpi label="Tracked campaigns" value={String(analytics.total_records)} />
            <Kpi label="Total views delivered" value={fmt(analytics.total_views)} />
            <Kpi label="Revenue tracked" value={money(analytics.total_revenue)} />
            <Kpi label="Creators tracked" value={String(analytics.creatorLeaderboard.length)} />
          </div>
        )}

        {/* Workflow runner bar */}
        {running && (
          <WorkflowRunner
            workflow={running}
            stepIndex={runStep}
            onBack={() => advanceWorkflow(-1)}
            onNext={() => advanceWorkflow(1)}
            onExit={() => { setRunning(null); setRunStep(0) }}
          />
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #1a1a1a', marginBottom: 24, overflowX: 'auto' }}>
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{
                padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap',
                color: tab === key ? GOLD : '#888',
                borderBottom: tab === key ? `2px solid ${GOLD}` : '2px solid transparent',
              }}>
              {label}
            </button>
          ))}
        </div>

        {loading && <p style={{ color: '#666', padding: 40, textAlign: 'center' }}>Loading performance data…</p>}

        {!loading && analytics && analytics.total_records === 0 && (
          <div style={{ ...card, textAlign: 'center', padding: 60 }}>
            <Trophy size={40} style={{ color: GOLD, margin: '0 auto 16px' }} />
            <h2 style={{ color: '#f5f5f5', fontWeight: 800, fontSize: '1.125rem', marginBottom: 8 }}>No tracked campaigns yet</h2>
            <p style={{ color: '#777', fontSize: '0.9375rem', maxWidth: 440, margin: '0 auto 20px' }}>
              When a deal wraps, log its numbers here. Views, revenue, and engagement build a permanent track record you can show the next brand.
            </p>
            <button className="btn-gold" onClick={() => setShowModal(true)}><Plus size={15} /> Log your first campaign</button>
          </div>
        )}

        {!loading && analytics && analytics.total_records > 0 && (
          <>
            {tab === 'overview' && (
              <OverviewTab
                analytics={analytics}
                selectedCreator={selectedCreator}
                setSelectedCreator={setSelectedCreator}
                creatorStats={creatorStats}
                insights={insights}
                insightsLoading={insightsLoading}
                generateInsights={generateInsights}
                refresh={loadAnalytics}
              />
            )}
            {tab === 'analytics' && <AnalyticsTab analytics={analytics} />}
            {tab === 'campaigns' && <CampaignsTab refresh={loadAnalytics} />}
            {tab === 'comparison' && <ComparisonTab leaderboard={analytics.creatorLeaderboard} />}
            {tab === 'cases' && <CaseStudiesTab />}
          </>
        )}
      </div>

      {showModal && (
        <PerformanceTrackerModal
          creator_handle=""
          brand_name=""
          onClose={() => setShowModal(false)}
          onSave={() => loadAnalytics()}
        />
      )}
    </div>
    </DashboardShell>
  )
}

/* ══ Overview ══ */
function OverviewTab({ analytics, selectedCreator, setSelectedCreator, creatorStats, insights, insightsLoading, generateInsights, refresh }: {
  analytics: Analytics
  selectedCreator: LeaderRow | null
  setSelectedCreator: (c: LeaderRow | null) => void
  creatorStats: CreatorStats | null
  insights: Insight[]
  insightsLoading: boolean
  generateInsights: () => void
  refresh: () => void
}) {
  const [copied, setCopied] = useState(false)

  function copyProvenResults() {
    if (!creatorStats || !selectedCreator) return
    const s = creatorStats
    const text = [
      `Proven Results: ${selectedCreator.creator_handle}`,
      `Campaigns completed: ${s.total_campaigns}`,
      `Average views: ${fmt(s.avg_views_per_campaign)}`,
      `Average revenue: ${money(s.avg_revenue_per_campaign)}`,
      s.highest_campaign ? `Highest campaign: ${s.highest_campaign.brand} (${money(s.highest_campaign.revenue)})` : null,
      `Brands worked with: ${s.unique_brands}`,
      `Repeat brand rate: ${s.repeat_brand_rate}%`,
      `Average CPM: $${s.avg_cpm}`,
      `Average engagement: ${s.avg_engagement_rate}%`,
      `Performance score: ${s.performance_score}/100`,
      ``, `Tracked with Prov.`,
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  async function exportPdf() {
    if (!creatorStats || !selectedCreator) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const s = creatorStats
    doc.setFontSize(20); doc.setFont('helvetica', 'bold')
    doc.text(`Proven Results: ${selectedCreator.creator_handle}`, 20, 24)
    doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(90)
    doc.text('Verified campaign performance · generated by Prov', 20, 32)
    doc.setTextColor(0)
    const rows: Array<[string, string]> = [
      ['Campaigns completed', String(s.total_campaigns)],
      ['Average views per campaign', fmt(s.avg_views_per_campaign)],
      ['Average revenue per campaign', money(s.avg_revenue_per_campaign)],
      ['Highest campaign', s.highest_campaign ? `${s.highest_campaign.brand} (${money(s.highest_campaign.revenue)})` : '—'],
      ['Brands worked with', String(s.unique_brands)],
      ['Repeat brand rate', `${s.repeat_brand_rate}%`],
      ['Average CPM', `$${s.avg_cpm}`],
      ['Average engagement', `${s.avg_engagement_rate}%`],
      ['Estimated ROI', `${s.estimated_roi}x`],
      ['Performance score', `${s.performance_score}/100`],
    ]
    let y = 48
    for (const [label, value] of rows) {
      doc.setFont('helvetica', 'normal'); doc.text(label, 20, y)
      doc.setFont('helvetica', 'bold'); doc.text(value, 120, y)
      y += 9
    }
    doc.save(`proven-results-${selectedCreator.creator_handle}.pdf`)
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Creator leaderboard */}
      <div style={card}>
        <p style={eyebrow}>Creator leaderboard — click a creator to open their profile</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ color: '#777', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>#</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Creator</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Campaigns</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Views</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Revenue</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Engagement</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {analytics.creatorLeaderboard.map((c, i) => (
                <tr key={c.creator_id}
                  onClick={() => setSelectedCreator(selectedCreator?.creator_id === c.creator_id ? null : c)}
                  style={{
                    cursor: 'pointer', borderTop: '1px solid #161616',
                    background: selectedCreator?.creator_id === c.creator_id ? 'rgba(255,215,0,0.05)' : 'transparent',
                  }}>
                  <td style={{ padding: '10px', color: i === 0 ? GOLD : '#666', fontWeight: 800 }}>{i + 1}</td>
                  <td style={{ padding: '10px', color: '#f0f0f0', fontWeight: 700 }}>{c.creator_handle}</td>
                  <td style={{ padding: '10px', color: '#bbb', ...mono }}>{c.campaigns}</td>
                  <td style={{ padding: '10px', color: '#bbb', ...mono }}>{fmt(c.views)}</td>
                  <td style={{ padding: '10px', color: GREEN, ...mono }}>{money(c.revenue)}</td>
                  <td style={{ padding: '10px', color: '#bbb', ...mono }}>{c.engagement}%</td>
                  <td style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: scoreColor(c.score), fontWeight: 800, ...mono }}>{c.score}</span>
                    <TierBadge score={c.score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creator drill-down */}
      {selectedCreator && creatorStats && (
        <>
          {/* Lifetime stats + score */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 16 }}>
              <ScoreRing score={creatorStats.performance_score} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ ...eyebrow, marginBottom: 2 }}>Performance score</p>
                <p style={{ color: '#f5f5f5', fontWeight: 800, marginBottom: 6 }}>{selectedCreator.creator_handle}</p>
                <TierBadge score={creatorStats.performance_score} />
                {creatorStats.score_breakdown && (
                  <div style={{ marginTop: 10, display: 'grid', gap: 3 }}>
                    {([
                      ['Consistency', creatorStats.score_breakdown.consistency, 25],
                      ['Revenue', creatorStats.score_breakdown.revenue, 25],
                      ['Views', creatorStats.score_breakdown.views, 20],
                      ['Engagement', creatorStats.score_breakdown.engagement, 15],
                      ['Retention', creatorStats.score_breakdown.brand_retention, 10],
                      ['Completion', creatorStats.score_breakdown.completion, 5],
                    ] as Array<[string, number, number]>).map(([label, got, max]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.625rem', color: '#777', width: 66 }}>{label}</span>
                        <span style={{ flex: 1, height: 3, borderRadius: 2, background: '#1f1f1f', overflow: 'hidden' }}>
                          <span style={{ display: 'block', height: '100%', width: `${(got / max) * 100}%`, background: scoreColor(creatorStats.performance_score), borderRadius: 2 }} />
                        </span>
                        <span style={{ fontSize: '0.625rem', color: '#999', width: 34, textAlign: 'right', ...mono }}>{got}/{max}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Kpi label="Lifetime views" value={fmt(creatorStats.total_views)} sub={`${fmt(creatorStats.avg_views_per_campaign)} avg per campaign`} />
            <Kpi label="Lifetime revenue" value={money(creatorStats.total_revenue)} sub={`${money(creatorStats.avg_revenue_per_campaign)} avg per campaign`} />
            <Kpi label="Repeat brand rate" value={`${creatorStats.repeat_brand_rate}%`} sub={`${creatorStats.unique_brands} brands · est. ROI ${creatorStats.estimated_roi}x`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Proven results card */}
            <div style={{ ...card, border: '1px solid rgba(255,215,0,0.3)', background: 'linear-gradient(160deg, #151310, #0f0f0f)' }}>
              <p style={{ ...eyebrow, color: GOLD }}>Proven results — share with brands</p>
              {([
                ['Campaigns completed', String(creatorStats.total_campaigns)],
                ['Average views', fmt(creatorStats.avg_views_per_campaign)],
                ['Average revenue', money(creatorStats.avg_revenue_per_campaign)],
                ['Highest campaign', creatorStats.highest_campaign ? `${creatorStats.highest_campaign.brand} (${money(creatorStats.highest_campaign.revenue)})` : '—'],
                ['Brands worked with', String(creatorStats.unique_brands)],
                ['Repeat brand rate', `${creatorStats.repeat_brand_rate}%`],
                ['Average CPM', `$${creatorStats.avg_cpm}`],
                ['Average engagement', `${creatorStats.avg_engagement_rate}%`],
                ['Performance score', `${creatorStats.performance_score}/100`],
              ] as Array<[string, string]>).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #1c1c1c' }}>
                  <span style={{ color: '#999', fontSize: '0.8125rem' }}>{label}</span>
                  <span style={{ color: '#f5f5f5', fontWeight: 700, fontSize: '0.875rem', ...mono }}>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={copyProvenResults} className="btn-outline-gold" style={{ flex: 1, padding: '0 10px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={exportPdf} className="btn-outline-gold" style={{ flex: 1, padding: '0 10px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <FileDown size={13} /> PDF
                </button>
              </div>
            </div>

            {/* AI insights */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ ...eyebrow, marginBottom: 0 }}>ProvBot insights</p>
                <button onClick={generateInsights} disabled={insightsLoading}
                  className="btn-outline-gold" style={{ padding: '0 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6, opacity: insightsLoading ? 0.6 : 1 }}>
                  <Sparkles size={12} /> {insightsLoading ? 'Analyzing…' : insights.length ? 'Regenerate' : 'Generate'}
                </button>
              </div>
              {insights.length === 0 && (
                <p style={{ color: '#666', fontSize: '0.875rem', padding: '16px 0' }}>
                  {insightsLoading ? 'ProvBot is reading the campaign history…' : 'No insights yet. Generate analyzes this creator’s tracked campaigns for patterns you can quote to brands. Needs 2+ campaigns.'}
                </p>
              )}
              <div style={{ display: 'grid', gap: 10 }}>
                {insights.map((ins, i) => (
                  <div key={ins.id ?? i} style={{ background: '#141414', border: '1px solid #232323', borderRadius: 10, padding: 12 }}>
                    <p style={{ color: '#e8e8e8', fontSize: '0.875rem', lineHeight: 1.55 }}>{ins.insight_text}</p>
                    {ins.is_actionable && ins.next_action_recommendation && (
                      <p style={{ color: GOLD, fontSize: '0.8125rem', marginTop: 6 }}>→ {ins.next_action_recommendation}</p>
                    )}
                    <p style={{ color: '#555', fontSize: '0.6875rem', marginTop: 6 }}>
                      Generated by ProvBot · {ins.insight_type.replace(/_/g, ' ')} · {(ins.confidence_score * 100).toFixed(0)}% confidence
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Campaign timeline */}
          <div style={card}>
            <p style={eyebrow}>Campaign history — {selectedCreator.creator_handle}</p>
            <Timeline rows={creatorStats.campaigns} refresh={refresh} />
          </div>
        </>
      )}
    </div>
  )
}

/* ══ Timeline (shared by overview + campaigns tab) ══ */
function Timeline({ rows, refresh }: { rows: PerfRow[]; refresh: () => void }) {
  const [converting, setConverting] = useState<string | null>(null)
  const [links, setLinks] = useState<Record<string, string>>({})

  async function makeCaseStudy(id: string) {
    setConverting(id)
    try {
      const res = await fetch('/api/performance/case-study', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performance_id: id }),
      })
      const d = await res.json()
      if (d.public_url) {
        setLinks(prev => ({ ...prev, [id]: d.public_url }))
        refresh()
      }
    } finally {
      setConverting(null)
    }
  }

  if (!rows.length) return <p style={{ color: '#666', fontSize: '0.875rem' }}>No campaigns tracked yet.</p>

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {rows.map(r => {
        const publicUrl = links[r.id] ?? (r.case_study_slug && r.is_case_study ? `/case-study/${r.case_study_slug}` : null)
        return (
          <div key={r.id} style={{ background: '#131313', border: '1px solid #1f1f1f', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: '#f0f0f0', fontWeight: 800 }}>{r.brand_name}{r.product_promoted ? ` — ${r.product_promoted}` : ''}</p>
                <p style={{ color: '#777', fontSize: '0.8125rem', marginTop: 2 }}>
                  {r.campaign_name} · {new Date(r.campaign_date_posted).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {Object.keys(r.platforms ?? {}).length > 0 && ` · ${Object.keys(r.platforms).join(', ')}`}
                </p>
              </div>
              <span style={{
                fontSize: '0.6875rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, textTransform: 'capitalize',
                background: r.campaign_status === 'completed' ? 'rgba(16,185,129,0.12)' : r.campaign_status === 'active' ? 'rgba(59,130,246,0.12)' : 'rgba(120,120,120,0.15)',
                color: r.campaign_status === 'completed' ? GREEN : r.campaign_status === 'active' ? BLUE : '#999',
              }}>{r.campaign_status}</span>
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 10, flexWrap: 'wrap', fontSize: '0.8125rem', ...mono }}>
              <span style={{ color: '#bbb' }}>{fmt(Number(r.metrics?.views) || 0)} views</span>
              <span style={{ color: GREEN }}>{money(Number(r.metrics?.revenue_generated) || 0)}</span>
              <span style={{ color: '#bbb' }}>{Number(r.metrics?.engagement_rate) || 0}% eng</span>
              <span style={{ color: scoreColor(r.performance_score), fontWeight: 700 }}>score {r.performance_score}</span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                {publicUrl ? (
                  <a href={publicUrl} target="_blank" rel="noreferrer" style={{ color: GOLD, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontWeight: 600 }}>
                    <ExternalLink size={12} /> Case study
                  </a>
                ) : (
                  <button onClick={() => makeCaseStudy(r.id)} disabled={converting === r.id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Share2 size={12} /> {converting === r.id ? 'Publishing…' : 'Make case study'}
                  </button>
                )}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ══ Analytics ══ */
function AnalyticsTab({ analytics }: { analytics: Analytics }) {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        <div style={card}>
          <p style={eyebrow}>Views over time</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={analytics.timeline}>
              <CartesianGrid stroke="#1c1c1c" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#666" fontSize={11} />
              <YAxis stroke="#666" fontSize={11} tickFormatter={fmt} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => fmt(Number(v ?? 0))} />
              <Line type="monotone" dataKey="views" stroke={BLUE} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <p style={eyebrow}>Revenue over time</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={analytics.timeline}>
              <CartesianGrid stroke="#1c1c1c" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#666" fontSize={11} />
              <YAxis stroke="#666" fontSize={11} tickFormatter={(v: number) => money(v)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => money(Number(v ?? 0))} />
              <Area type="monotone" dataKey="revenue" stroke={GREEN} fill="rgba(16,185,129,0.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <p style={eyebrow}>Campaigns by platform</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={analytics.byPlatform} dataKey="campaigns" nameKey="platform" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {analytics.byPlatform.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <p style={eyebrow}>Top brands by revenue</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={analytics.topBrands} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid stroke="#1c1c1c" strokeDasharray="3 3" />
              <XAxis type="number" stroke="#666" fontSize={11} tickFormatter={(v: number) => money(v)} />
              <YAxis type="category" dataKey="brand" stroke="#aaa" fontSize={11} width={90} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => money(Number(v ?? 0))} />
              <Bar dataKey="revenue" fill={GOLD} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <p style={eyebrow}>Engagement rate trend</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={analytics.timeline}>
              <CartesianGrid stroke="#1c1c1c" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#666" fontSize={11} />
              <YAxis stroke="#666" fontSize={11} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => `${Number(v ?? 0)}%`} />
              <Line type="monotone" dataKey="engagement" stroke="#A855F7" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <p style={eyebrow}>Campaign volume by month</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={analytics.timeline}>
              <CartesianGrid stroke="#1c1c1c" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#666" fontSize={11} />
              <YAxis stroke="#666" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="campaigns" fill={BLUE} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/* ══ Campaigns (search & filters) ══ */
function CampaignsTab({ refresh }: { refresh: () => void }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('recent')
  const [minScore, setMinScore] = useState('')
  const [rows, setRows] = useState<PerfRow[]>([])
  const [total, setTotal] = useState(0)
  const [busy, setBusy] = useState(false)

  const runSearch = useCallback(async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/performance/list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: q || undefined,
          status: status || undefined,
          sort,
          min_score: minScore ? Number(minScore) : undefined,
          limit: 100,
        }),
      })
      const d = await res.json()
      if (!d.error) { setRows(d.records ?? []); setTotal(d.total ?? 0) }
    } finally {
      setBusy(false)
    }
  }, [q, status, sort, minScore])

  useEffect(() => {
    const t = setTimeout(runSearch, 300)
    return () => clearTimeout(t)
  }, [runSearch])

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...card, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
          <input className="input-dark" style={{ paddingLeft: 34 }} placeholder="Search creators, brands, campaigns, products…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <select className="input-dark" style={{ flex: '0 1 150px' }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Any status</option>
          <option value="completed">Completed</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <select className="input-dark" style={{ flex: '0 1 170px' }} value={sort} onChange={e => setSort(e.target.value)}>
          <option value="recent">Most recent</option>
          <option value="oldest">Oldest</option>
          <option value="revenue">Highest revenue</option>
          <option value="views">Highest views</option>
          <option value="roi">Highest ROI</option>
          <option value="score">Highest score</option>
        </select>
        <select className="input-dark" style={{ flex: '0 1 140px' }} value={minScore} onChange={e => setMinScore(e.target.value)}>
          <option value="">Any score</option>
          <option value="40">Score 40+</option>
          <option value="60">Score 60+</option>
          <option value="70">Score 70+</option>
          <option value="80">Score 80+</option>
        </select>
      </div>

      <p style={{ color: '#666', fontSize: '0.8125rem' }}>{busy ? 'Searching…' : `${total} campaign${total === 1 ? '' : 's'}`}</p>
      <Timeline rows={rows} refresh={() => { runSearch(); refresh() }} />
    </div>
  )
}

/* ══ Comparison ══ */
function ComparisonTab({ leaderboard }: { leaderboard: LeaderRow[] }) {
  const [picked, setPicked] = useState<string[]>([])
  const [stats, setStats] = useState<Record<string, CreatorStats>>({})

  useEffect(() => {
    ;(async () => {
      const missing = picked.filter(id => !stats[id])
      if (!missing.length) return
      const results = await Promise.all(missing.map(async id => {
        const res = await fetch(`/api/performance/creator?creator_id=${id}`)
        return [id, await res.json()] as const
      }))
      setStats(prev => ({ ...prev, ...Object.fromEntries(results) }))
    })()
  }, [picked, stats])

  const metrics: Array<[string, (s: CreatorStats) => string, (s: CreatorStats) => number]> = [
    ['Campaigns', s => String(s.total_campaigns), s => s.total_campaigns],
    ['Total views', s => fmt(s.total_views), s => s.total_views],
    ['Total revenue', s => money(s.total_revenue), s => s.total_revenue],
    ['Avg views / campaign', s => fmt(s.avg_views_per_campaign), s => s.avg_views_per_campaign],
    ['Avg revenue / campaign', s => money(s.avg_revenue_per_campaign), s => s.avg_revenue_per_campaign],
    ['Engagement rate', s => `${s.avg_engagement_rate}%`, s => s.avg_engagement_rate],
    ['Average CPM', s => `$${s.avg_cpm}`, s => s.avg_cpm],
    ['Brand diversity', s => String(s.unique_brands), s => s.unique_brands],
    ['Repeat brand rate', s => `${s.repeat_brand_rate}%`, s => s.repeat_brand_rate],
    ['Est. ROI', s => `${s.estimated_roi}x`, s => s.estimated_roi],
    ['Performance score', s => `${s.performance_score}/100`, s => s.performance_score],
  ]

  const chosen = picked.map(id => ({ id, row: leaderboard.find(l => l.creator_id === id)!, s: stats[id] })).filter(c => c.row)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={card}>
        <p style={eyebrow}>Pick 2-3 creators to compare</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {leaderboard.map(c => {
            const on = picked.includes(c.creator_id)
            return (
              <button key={c.creator_id}
                onClick={() => setPicked(prev => on ? prev.filter(x => x !== c.creator_id) : prev.length >= 3 ? prev : [...prev, c.creator_id])}
                style={{
                  padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600,
                  border: on ? '1px solid #FFD700' : '1px solid #2a2a2a',
                  background: on ? 'rgba(255,215,0,0.08)' : '#141414',
                  color: on ? GOLD : '#ccc',
                }}>
                {c.creator_handle}
              </button>
            )
          })}
        </div>
      </div>

      {chosen.length >= 2 && chosen.every(c => c.s) && (
        <div style={{ ...card, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px', color: '#777', fontWeight: 600 }}>Metric</th>
                {chosen.map(c => (
                  <th key={c.id} style={{ textAlign: 'right', padding: '10px', color: GOLD, fontWeight: 800 }}>{c.row.creator_handle}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map(([label, show, val]) => {
                const values = chosen.map(c => val(c.s))
                const best = Math.max(...values)
                return (
                  <tr key={label} style={{ borderTop: '1px solid #161616' }}>
                    <td style={{ padding: '10px', color: '#999' }}>{label}</td>
                    {chosen.map((c, i) => (
                      <td key={c.id} style={{
                        padding: '10px', textAlign: 'right', ...mono,
                        color: values[i] === best && best > 0 ? GREEN : '#ddd',
                        fontWeight: values[i] === best && best > 0 ? 800 : 500,
                      }}>
                        {show(c.s)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p style={{ color: '#555', fontSize: '0.75rem', marginTop: 10 }}>Green = leading value.</p>
        </div>
      )}
      {chosen.length < 2 && <p style={{ color: '#666', fontSize: '0.875rem' }}>Select at least two creators above.</p>}
    </div>
  )
}

/* ══ Case studies gallery ══ */
function CaseStudiesTab() {
  const [rows, setRows] = useState<PerfRow[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/performance/list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 200 }),
      })
      const d = await res.json()
      setRows(((d.records ?? []) as PerfRow[]).filter(r => r.is_case_study && r.case_study_slug))
      setLoaded(true)
    })()
  }, [])

  if (!loaded) return <p style={{ color: '#666' }}>Loading case studies…</p>
  if (!rows.length) {
    return (
      <div style={{ ...card, textAlign: 'center', padding: 48 }}>
        <p style={{ color: '#999', fontWeight: 700, marginBottom: 6 }}>No case studies yet</p>
        <p style={{ color: '#666', fontSize: '0.875rem' }}>Open any tracked campaign and hit “Make case study” — it becomes a public page you can send to brands.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {rows.map(r => (
        <a key={r.id} href={`/case-study/${r.case_study_slug}`} target="_blank" rel="noreferrer"
          style={{ ...card, textDecoration: 'none', display: 'block' }}>
          <p style={{ ...eyebrow, color: GOLD }}>Case study</p>
          <p style={{ color: '#f5f5f5', fontWeight: 800, marginBottom: 4 }}>{r.brand_name} × {r.creator_handle}</p>
          <p style={{ color: '#888', fontSize: '0.8125rem', marginBottom: 12 }}>
            {fmt(Number(r.metrics?.views) || 0)} views · {money(Number(r.metrics?.revenue_generated) || 0)} · score {r.performance_score}
          </p>
          <span style={{ color: GOLD, fontSize: '0.8125rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <ExternalLink size={12} /> View public page
          </span>
        </a>
      ))}
    </div>
  )
}
