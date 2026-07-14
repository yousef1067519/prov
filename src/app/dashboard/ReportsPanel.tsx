'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { FileText, Download, Loader2, Check, BarChart3, Trash2, Clock, StickyNote } from 'lucide-react'
import DashboardShell from './DashboardShell'
import { BRANDING_KEY } from './BrandingSettings'
import { loadWhiteLabel, hexToRgb } from '@/lib/whitelabel'
import { getLocalCampaigns, mergeCampaigns } from '@/lib/localCampaigns'
import { generateCampaignReport, type ReportData, type ReportBranding } from '@/lib/pdf-generator'

interface Campaign { id: string; name: string; niche?: string; status?: string; created_at?: string; creator_ids?: string[]; sponsor_ids?: string[] }
interface SavedReport { id: string; campaign_id: string | null; campaign_name: string | null; created_at: string; url: string | null }

// A believable demo campaign so the feature works before any real data exists.
const DEMO: Campaign[] = [
  { id: 'demo-q2-tech', name: 'Q2 Tech Creator Push', niche: 'Tech', status: 'active', created_at: new Date(Date.now() - 26 * 864e5).toISOString() },
  { id: 'demo-fitness', name: 'Summer Fitness Sponsorships', niche: 'Fitness', status: 'won', created_at: new Date(Date.now() - 60 * 864e5).toISOString() },
]

function demoReport(c: Campaign): ReportData {
  const sent = 84, opened = 57, clicked = 21, replies = 19, deals = 6, revenue = 41500
  return {
    campaign: { id: c.id, name: c.name, niche: c.niche || 'General', status: c.status || 'active', created_at: c.created_at || new Date().toISOString() },
    creatorsContacted: 60, influencersConfirmed: 8, sponsorsMatched: 24,
    emails: { sent, opened, clicked, openRate: Math.round((opened / sent) * 1000) / 10, clickRate: Math.round((clicked / sent) * 1000) / 10 },
    replies: { count: replies, conversion: Math.round((deals / replies) * 1000) / 10 },
    deals: { count: deals, revenue },
    roi: Math.round(((revenue - sent * 3) / (sent * 3)) * 100),
    charts: {
      openByType: [{ label: 'Creators', sent: 60, opened: 44 }, { label: 'Sponsors', sent: 24, opened: 13 }],
      replyOverTime: [{ label: 'Wk 1', value: 3 }, { label: 'Wk 2', value: 7 }, { label: 'Wk 3', value: 6 }, { label: 'Wk 4', value: 3 }],
      revenueBySponsor: [{ label: 'NordVPN', value: 15000 }, { label: 'HelloFresh', value: 12500 }, { label: 'Squarespace', value: 9000 }, { label: 'Notion', value: 5000 }],
      funnel: [{ label: 'Contacted', value: 84 }, { label: 'Opened', value: 57 }, { label: 'Replied', value: 19 }, { label: 'Deals', value: 6 }],
    },
    topInfluencers: [
      { name: 'Marques Lee', metric: '$15,000' }, { name: 'Ava Tech', metric: '$9,500' },
      { name: 'CodeWithSam', metric: '$8,000' }, { name: 'GadgetGina', metric: '$5,500' },
    ],
    topSponsors: [{ name: 'NordVPN', deals: 2 }, { name: 'HelloFresh', deals: 2 }, { name: 'Squarespace', deals: 1 }, { name: 'Notion', deals: 1 }],
  }
}

export default function ReportsPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isDemo, setIsDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<SavedReport[]>([])

  const loadReports = useCallback(async () => {
    try { const d = await (await fetch('/api/reports')).json(); if (Array.isArray(d.reports)) setSaved(d.reports) } catch {}
  }, [])
  useEffect(() => { loadReports() }, [loadReports])

  async function deleteReport(id: string) {
    setSaved(s => s.filter(r => r.id !== id))
    await fetch(`/api/reports?id=${id}`, { method: 'DELETE' }).catch(() => {})
  }

  useEffect(() => {
    (async () => {
      let api: Campaign[] = []
      try {
        const res = await fetch('/api/campaigns')
        const d = await res.json()
        api = d.campaigns ?? []
      } catch {}
      const merged = mergeCampaigns(api, getLocalCampaigns()) as Campaign[]
      if (merged.length) { setCampaigns(merged); setIsDemo(false) }
      else { setCampaigns(DEMO); setIsDemo(true) }
      setLoading(false)
    })()
  }, [])

  function getBranding(): ReportBranding {
    let base: ReportBranding = {}
    try { base = JSON.parse(localStorage.getItem(BRANDING_KEY) || '{}') } catch {}
    const wl = loadWhiteLabel()
    if (wl.enabled) {
      base.brand_name = wl.name || base.brand_name
      base.primary_hex = hexToRgb(wl.primary)
      if (wl.logo) base.company_logo_url = wl.logo
      if (wl.footer) base.company_name = wl.footer
    }
    return base
  }

  async function generate(c: Campaign) {
    setBusy(c.id); setError(''); setDone(null)
    try {
      let report: ReportData
      if (isDemo || c.id.startsWith('demo-') || c.id.startsWith('camp-')) {
        report = demoReport(c)
      } else {
        const res = await fetch('/api/reports/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: c.id }) })
        const d = await res.json()
        if (!d.report) throw new Error(d.error || 'Failed')
        report = d.report
      }
      const out = await generateCampaignReport(report, getBranding())
      // Persist the generated PDF to Storage + DB so it shows up in history (best effort).
      if (out?.base64) {
        try {
          await fetch('/api/reports', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId: c.id, campaignName: c.name, base64: out.base64 }),
          })
          loadReports()
        } catch { /* download still succeeded */ }
      }
      setDone(c.id)
      setTimeout(() => setDone(null), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate report.')
    }
    setBusy(null)
  }

  return (
    <DashboardShell active="reports">
      <div style={{ padding: '24px 28px', maxWidth: 1000, margin: '0 auto' }}>
        <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Reports</h1>
        <p style={{ color: '#666', marginTop: 4, marginBottom: 24 }}>One-click PDF reports for any campaign — open rates, replies, revenue, ROI, and charts, with your branding.</p>

        {isDemo && !loading && (
          <div style={{ background: 'rgba(102,126,234,0.08)', border: '1px solid rgba(102,126,234,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.8125rem', color: '#b8c0e8' }}>
            Showing sample campaigns so you can preview the report. Run a real campaign and your own reports appear here automatically.
          </div>
        )}
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.8125rem', color: '#f87171' }}>{error}</div>}

        {loading ? (
          <p style={{ color: '#555', padding: '40px 0', textAlign: 'center' }}>Loading campaigns…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {campaigns.map(c => (
              <div key={c.id} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255,215,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BarChart3 size={20} style={{ color: '#FFD700' }} />
                  </div>
                  <div>
                    <p style={{ color: '#f0f0f0', fontWeight: 700, fontSize: '0.9375rem' }}>{c.name}</p>
                    <p style={{ color: '#666', fontSize: '0.8125rem', marginTop: 2 }}>
                      {(c.niche || 'General')} · {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Recently'} · <span style={{ color: '#888', textTransform: 'capitalize' }}>{c.status || 'active'}</span>
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link href={`/dashboard/campaign/${c.id}`} title="Open campaign (notes)"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 13px', borderRadius: 9, fontSize: '0.8125rem', fontWeight: 600, background: 'transparent', border: '1px solid #222', color: '#aaa', textDecoration: 'none' }}>
                  <StickyNote size={14} /> Notes
                </Link>
                <button onClick={() => generate(c)} disabled={busy === c.id} className={done === c.id ? '' : 'btn-gold'}
                  style={done === c.id
                    ? { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 9, background: 'rgba(0,208,132,0.12)', border: '1px solid rgba(0,208,132,0.4)', color: '#00D084', fontSize: '0.875rem', fontWeight: 600 }
                    : { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px' }}>
                  {busy === c.id ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
                    : done === c.id ? <><Check size={15} /> Downloaded</>
                    : <><Download size={15} /> Generate Report</>}
                </button>
                </div>
              </div>
            ))}
            {campaigns.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#555' }}>
                <FileText size={32} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
                <p>No campaigns yet. Run one to generate reports.</p>
              </div>
            )}
          </div>
        )}

        {/* Saved report history (from DB + Storage) */}
        {saved.length > 0 && (
          <div style={{ marginTop: 34 }}>
            <h2 style={{ color: '#e8e8e8', fontWeight: 800, fontSize: '1rem', marginBottom: 12 }}>Report history</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {saved.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#0e0e0e', border: '1px solid #1a1a1a', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <FileText size={16} style={{ color: '#FFD700', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: '#e0e0e0', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.campaign_name || 'Report'}</p>
                      <p style={{ color: '#666', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                        <Clock size={11} /> {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', color: '#FFD700', textDecoration: 'none' }}>
                        <Download size={14} /> Download
                      </a>
                    )}
                    <button onClick={() => deleteReport(r.id)} title="Delete"
                      style={{ display: 'flex', alignItems: 'center', padding: '7px 9px', borderRadius: 8, background: 'rgba(255,92,92,0.08)', border: '1px solid rgba(255,92,92,0.25)', color: '#ff7a7a', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
