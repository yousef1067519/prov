import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

// Public, no-login case study page — the shareable deal-closing artifact.
// Served with the service client (RLS-safe: only rows explicitly published
// with is_case_study = true are reachable, and only via their random slug).
export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  const { data: rec } = await sb
    .from('performance_campaigns')
    .select('campaign_name, brand_name, creator_handle, product_promoted, campaign_date_posted, metrics, performance_score, roi_generated, case_study_data')
    .eq('case_study_slug', slug)
    .eq('is_case_study', true)
    .single()

  if (!rec) notFound()

  const cs = rec.case_study_data ?? {}
  const m = rec.metrics ?? {}
  const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n)

  const stats: Array<[string, string]> = [
    ['Views', fmt(Number(m.views) || 0)],
    ['Engagement', `${Number(m.engagement_rate) || 0}%`],
    ['Revenue', `$${(Number(m.revenue_generated) || 0).toLocaleString()}`],
    ['Performance score', `${rec.performance_score}/100`],
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f5f5', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#FFD700', marginBottom: 16 }}>
          Case study
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.2, marginBottom: 8 }}>
          {rec.brand_name} × {rec.creator_handle}
        </h1>
        <p style={{ color: '#888', marginBottom: 40 }}>
          {rec.product_promoted ? `${rec.product_promoted} · ` : ''}
          {rec.campaign_date_posted ? new Date(rec.campaign_date_posted).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}
        </p>

        {/* KPI band */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 48 }}>
          {stats.map(([label, value]) => (
            <div key={label} style={{ background: '#141414', border: '1px solid #262626', borderRadius: 12, padding: '20px 16px' }}>
              <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#777', marginBottom: 6 }}>{label}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
            </div>
          ))}
        </div>

        {cs.campaign_goal && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFD700', marginBottom: 10 }}>Goal</h2>
            <p style={{ color: '#ccc', lineHeight: 1.7 }}>{cs.campaign_goal}</p>
          </section>
        )}

        {cs.results_summary && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFD700', marginBottom: 10 }}>Results</h2>
            <p style={{ color: '#ccc', lineHeight: 1.7 }}>{cs.results_summary}</p>
          </section>
        )}

        {Array.isArray(cs.lessons_learned) && cs.lessons_learned.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFD700', marginBottom: 10 }}>What we learned</h2>
            <ul style={{ color: '#ccc', lineHeight: 1.8, paddingLeft: 20 }}>
              {cs.lessons_learned.map((l: string, i: number) => <li key={i}>{l}</li>)}
            </ul>
          </section>
        )}

        <footer style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid #1f1f1f', color: '#555', fontSize: 13 }}>
          Tracked and verified with <span style={{ color: '#FFD700', fontWeight: 700 }}>Prov</span> — influencer campaign performance tracking.
        </footer>
      </div>
    </div>
  )
}
