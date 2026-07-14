'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Target, Sparkles, Users, Mail, Rocket, Check, Loader2, ArrowRight, ArrowLeft, Pencil, Zap,
} from 'lucide-react'
import { NICHES } from '@/lib/types'
import { CAMPAIGN_TEMPLATES, GOAL_OPTIONS, fillTemplate, type CampaignGoal } from '@/lib/campaignTemplates'
import { greetingName } from '@/lib/emailStrategies'
import { BRANDING_KEY } from '@/app/dashboard/BrandingSettings'
import { saveLocalCampaign, newCampaignId } from '@/lib/localCampaigns'
import { markOnboarded } from '@/lib/onboarding'
import type { Influencer } from '@/lib/types'

const STEP_LABELS = ['Goal', 'Niche', 'Campaign', 'Message', 'Launch']

function brandingVars(): Record<string, string> {
  let b: Record<string, string> = {}
  try { b = JSON.parse(localStorage.getItem(BRANDING_KEY) || '{}') } catch {}
  return {
    YourName: b.agency_name || 'Your Name',
    YourTitle: b.agency_title || 'Founder',
    CompanyName: b.company_name || 'Your Agency',
    CompanyEmail: b.company_email || 'you@youragency.com',
  }
}
function creatorVars(c?: Influencer): Record<string, string> {
  if (!c) return { FirstName: 'there', Platform: 'your channel', Niche: 'your niche', Followers: 'your', SponsorName: 'the brand' }
  return {
    FirstName: greetingName(c.name),
    Platform: c.platform, Niche: c.niche,
    Followers: c.subscribers >= 1e6 ? (c.subscribers / 1e6).toFixed(1) + 'M' : Math.round(c.subscribers / 1e3) + 'K',
    SponsorName: 'the brand',
  }
}

export default function OnboardingFlow({ email }: { email: string }) {
  const router = useRouter()
  // Pre-wizard survey ("problem creation"): survey → problem diagnosis → wizard.
  // /onboarding?survey=1 forces the survey to show (preview/demo), even if answered.
  const [phase, setPhase] = useState<'survey' | 'problem' | 'flow'>(() => {
    if (typeof window === 'undefined') return 'survey'
    try {
      if (new URLSearchParams(window.location.search).get('survey') === '1') return 'survey'
      return localStorage.getItem('prov_survey') ? 'flow' : 'survey'
    } catch { return 'survey' }
  })
  const [survey, setSurvey] = useState<{ workflow?: string; volume?: string; source?: string }>({})
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState<CampaignGoal | null>(null)
  const [niche, setNiche] = useState('Tech')
  const [creators, setCreators] = useState<Influencer[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState('')

  const template = goal ? CAMPAIGN_TEMPLATES[goal] : null
  const connectedEmail = typeof document !== 'undefined'
    ? decodeURIComponent(document.cookie.split('; ').find(c => c.startsWith('prov_google_email='))?.split('=')[1] || '')
    : ''

  function pickGoal(g: CampaignGoal) {
    setGoal(g)
    setNiche(CAMPAIGN_TEMPLATES[g].recommendedNiche)
    setStep(1)
  }

  function answerSurvey(key: 'workflow' | 'volume' | 'source', value: string) {
    const next = { ...survey, [key]: value }
    setSurvey(next)
    if (next.workflow && next.volume && next.source) {
      try { localStorage.setItem('prov_survey', JSON.stringify({ ...next, at: new Date().toISOString() })) } catch {}
      setPhase('problem')
    }
  }

  // Personalized diagnosis line for the problem screen.
  function diagnosis(): string {
    if (survey.workflow === 'Spreadsheets & manual DMs') return 'You are doing data-clerk work. Every hour in a spreadsheet is an hour your competitors spend closing deals.'
    if (survey.workflow === 'A VA does it for me') return 'You are paying a salary for work software does in seconds, and every handoff loses speed and deals.'
    if (survey.workflow === 'A few separate tools') return 'Your tools do not talk to each other. Every gap between them is where replies, follow-ups and deals fall through.'
    return 'Even a mostly-automated workflow has one silent leak most founders never check: the outreach email itself.'
  }

  // Step 2: auto-generate the campaign — pull creators and preselect emailable ones.
  async function generate() {
    if (!template) return
    setGenerating(true); setError(''); setStep(2)
    const body = (filters: Record<string, unknown>) => ({ filters, limit: 12, offset: 0 })
    try {
      let res = await fetch('/api/creators/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body({ niche, min_followers: template.defaults.min_followers })) })
      let d = await res.json()
      // Fall back to any niche if this one is empty in the current catalog.
      if (!d.creators?.length) {
        res = await fetch('/api/creators/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body({})) })
        d = await res.json()
      }
      const list: Influencer[] = d.creators ?? []
      setCreators(list)
      const emailable = list.filter(c => c.email).slice(0, 10)
      setSelected(new Set((emailable.length ? emailable : list.slice(0, 10)).map(c => c.id)))
    } catch { setError('Could not load creators.') }
    setGenerating(false)
  }

  // Step 3: the user edits the TEMPLATE (placeholders intact) so every creator
  // gets their own personalized fill at send time — never the first creator's
  // values baked in for everyone.
  function goToMessage() {
    setMessage(template!.sequence[0].body)
    setStep(3)
  }

  async function launch() {
    if (!template) return
    if (!connectedEmail) { router.push('/dashboard/settings?google=connect#integrations'); return }
    setLaunching(true); setError('')
    const chosen = creators.filter(c => selected.has(c.id))
    const id = newCampaignId()
    const name = `${template.label} — ${niche}`
    saveLocalCampaign({ id, name, niche, status: 'active', creator_ids: chosen.map(c => c.id), created_at: new Date().toISOString() })

    // Personalize the (possibly edited) first message per creator.
    const bvars = brandingVars()
    const subjTpl = template.sequence[0].subject
    const followDays = [3, 7]
    const emails = chosen.filter(c => c.email).map(c => {
      const vars = { ...bvars, ...creatorVars(c) }
      return {
        to: c.email!,
        subject: fillTemplate(subjTpl, vars),
        body: fillTemplate(message, vars),
        recipient_type: 'creator' as const,
        recipient_name: c.name,
        // The template's day-3 / day-7 follow-ups, personalized per creator.
        // Queued server-side and auto-cancelled if they reply.
        follow_ups: template.sequence.slice(1).map((s, i) => ({
          subject: fillTemplate(s.subject, vars),
          body: fillTemplate(s.body, vars),
          days: followDays[i] ?? 3 + i * 4,
        })),
      }
    })
    try {
      const campRes = await fetch('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, niche, creator_ids: chosen.map(c => c.id), sponsor_ids: [] }) })
      const { campaign } = await campRes.json().catch(() => ({ campaign: null }))
      const campaignId = campaign?.id ?? id
      if (emails.length) {
        await fetch('/api/emails/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaign_id: campaignId, emails }) })
      }
      markOnboarded(email)
      router.push('/dashboard?welcome=1')
    } catch {
      setError('Could not launch. Please try again.')
      setLaunching(false)
    }
  }

  const emailableCount = creators.filter(c => selected.has(c.id) && c.email).length

  // ── Pre-wizard: mini survey ──
  if (phase === 'survey') {
    const Q = ({ label, k, options }: { label: string; k: 'workflow' | 'volume' | 'source'; options: string[] }) => (
      <div style={{ marginBottom: 26 }}>
        <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 12 }}>{label}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {options.map(o => (
            <button key={o} onClick={() => answerSurvey(k, o)}
              style={{ padding: '10px 16px', borderRadius: 10, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                background: survey[k] === o ? 'rgba(255,215,0,0.14)' : '#111',
                border: `1px solid ${survey[k] === o ? 'rgba(255,215,0,0.5)' : '#1f1f1f'}`,
                color: survey[k] === o ? '#FFD700' : '#c0c0c0' }}>
              {o}
            </button>
          ))}
        </div>
      </div>
    )
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f5f5' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px 80px' }}>
          <span style={{ fontWeight: 900, color: '#FFD700', fontFamily: 'var(--font-display)', fontSize: '1.125rem' }}>Prov</span>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '22px 0 6px' }}>Quick check — 3 questions, 20 seconds</h1>
          <p style={{ color: '#777', fontSize: '0.9375rem', marginBottom: 34 }}>So we can set your workspace up around how you actually work.</p>
          <Q label="How do you find + email creators today?" k="workflow"
            options={['Spreadsheets & manual DMs', 'A VA does it for me', 'A few separate tools', 'Mostly automated']} />
          <Q label="How many outreach emails do you send per week?" k="volume"
            options={['Under 20', '20-100', '100-500', '500+']} />
          <Q label="How did you find Prov?" k="source"
            options={['Instagram', 'TikTok', 'A friend', 'The Best Automation Websites list', 'Other']} />
        </div>
      </div>
    )
  }

  // ── Pre-wizard: the problem ──
  if (phase === 'problem') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f5f5' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px 80px' }}>
          <span style={{ fontWeight: 900, color: '#FFD700', fontFamily: 'var(--font-display)', fontSize: '1.125rem' }}>Prov</span>
          <p style={{ display: 'inline-flex', marginLeft: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 999, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Workflow diagnosis</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '22px 0 14px', lineHeight: 1.2 }}>
            Your workflow is costing you deals.
          </h1>
          <p style={{ color: '#b0b0b0', fontSize: '1rem', lineHeight: 1.7, marginBottom: 22 }}>{diagnosis()}</p>

          <div style={{ background: '#111', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 16, padding: '24px 26px', marginBottom: 22 }}>
            <p style={{ color: '#f0f0f0', fontSize: '1rem', lineHeight: 1.75 }}>
              Here&apos;s the one that hurts most: <strong style={{ color: '#FFD700' }}>a weak outreach email can cost you up to 90% of your replies.</strong> Same
              creators, same effort, and almost all of it is wasted at the exact moment it matters.
            </p>
            <p style={{ color: '#f0f0f0', fontSize: '1rem', lineHeight: 1.75, marginTop: 14 }}>
              Prov&apos;s tested outreach prompts are built to lift reply-to-deal conversion by <strong style={{ color: '#FFD700' }}>90-300%</strong>.
              Ask yourself: what would even a 90% increase do for your revenue? Now compare that number to what Prov costs.
              It&apos;s not close.
            </p>
          </div>

          <p style={{ color: '#888', fontSize: '0.9375rem', marginBottom: 28 }}>So — how soon do you want to fix it?</p>
          <button onClick={() => setPhase('flow')} className="btn-gold" style={{ padding: '15px 28px', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            Fix my workflow now <ArrowRight size={18} />
          </button>
          <button onClick={() => setPhase('flow')} style={{ display: 'block', marginTop: 14, background: 'none', border: 'none', color: '#555', fontSize: '0.8125rem', cursor: 'pointer', padding: 0 }}>
            I&apos;ll keep losing replies for now → continue anyway
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f5f5' }}>
      {/* Top progress */}
      <div style={{ borderBottom: '1px solid #161616', padding: '18px 24px', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 900, color: '#FFD700', fontFamily: 'var(--font-display)', marginRight: 8 }}>Prov</span>
          {STEP_LABELS.map((l, i) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 800,
                  background: i < step ? '#00D084' : i === step ? '#FFD700' : '#1a1a1a', color: i <= step ? '#0a0a0a' : '#555' }}>
                  {i < step ? <Check size={12} /> : i + 1}
                </span>
                <span style={{ fontSize: '0.75rem', color: i === step ? '#f0f0f0' : '#666', fontWeight: i === step ? 700 : 500 }} className="hidden sm:inline">{l}</span>
              </div>
              {i < STEP_LABELS.length - 1 && <div style={{ flex: 1, height: 1, background: i < step ? '#00D084' : '#1a1a1a' }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.8125rem', color: '#f87171' }}>{error}</div>}

        {/* STEP 0 — Goal */}
        {step === 0 && (
          <div>
            <Heading icon={<Target size={20} />} title="What do you want to do first?" sub="Pick a goal and Prov builds your first campaign around it. You can change this later." />
            <div style={{ display: 'grid', gap: 12 }}>
              {GOAL_OPTIONS.map(o => (
                <button key={o.goal} onClick={() => pickGoal(o.goal)}
                  style={{ textAlign: 'left', background: '#111', border: '1px solid #1f1f1f', borderRadius: 14, padding: '20px 22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.4)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#1f1f1f')}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{o.label}</p>
                    <p style={{ color: '#777', fontSize: '0.875rem' }}>{o.desc}</p>
                  </div>
                  <ArrowRight size={18} style={{ color: '#FFD700', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1 — Niche */}
        {step === 1 && template && (
          <div>
            <Heading icon={<Sparkles size={20} />} title="What niche are you targeting?" sub="We recommend one based on your goal — change it if you like." />
            <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 14, padding: 22 }}>
              <label style={{ fontSize: '0.8125rem', color: '#aaa', fontWeight: 600, display: 'block', marginBottom: 10 }}>Niche</label>
              <select value={niche} onChange={e => setNiche(e.target.value)} className="input-dark" style={{ width: '100%', marginBottom: 12 }}>
                {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 999, padding: '4px 12px', fontSize: '0.75rem', color: '#FFD700' }}>
                <Sparkles size={12} /> AI suggestion: {template.recommendedNiche}
              </div>
            </div>
            <NavRow onBack={() => setStep(0)} onNext={generate} nextLabel="Build my campaign" />
          </div>
        )}

        {/* STEP 2 — Auto-generated campaign */}
        {step === 2 && template && (
          <div>
            <Heading icon={<Users size={20} />} title="Your campaign is ready" sub="We picked a template and a starting list of creators for you." />
            {generating ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#777' }}>
                <Loader2 size={28} className="animate-spin" style={{ color: '#FFD700', marginBottom: 12 }} /><p>Building your campaign…</p>
              </div>
            ) : (
              <>
                <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 14, padding: 22, marginBottom: 14 }}>
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>{template.label} · {niche}</p>
                  <p style={{ color: '#777', fontSize: '0.875rem', lineHeight: 1.6 }}>{template.targetProfile}</p>
                </div>
                <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 14, padding: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{selected.size} creators selected</span>
                    <span style={{ color: '#777', fontSize: '0.8125rem' }}>{emailableCount} with email</span>
                  </div>
                  {creators.length === 0 ? (
                    <p style={{ color: '#777', fontSize: '0.875rem', padding: '12px 0' }}>No creators in your catalog yet — your campaign is saved and will fill in as your data loads. You can still continue.</p>
                  ) : creators.slice(0, 8).map(c => {
                    const on = selected.has(c.id)
                    return (
                      <div key={c.id} onClick={() => setSelected(p => { const n = new Set(p); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n })}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #181818', cursor: 'pointer' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${on ? '#FFD700' : '#333'}`, background: on ? '#FFD700' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on && <Check size={12} style={{ color: '#0a0a0a' }} />}</span>
                          <span style={{ fontSize: '0.875rem', color: '#e0e0e0' }}>{c.name}</span>
                        </span>
                        <span style={{ fontSize: '0.75rem', color: c.email ? '#4ade80' : '#666' }}>{c.email ? 'email ✓' : 'no email'}</span>
                      </div>
                    )
                  })}
                </div>
                <NavRow onBack={() => setStep(1)} onNext={goToMessage} nextLabel="Review the message" disabled={selected.size === 0 && creators.length > 0} />
              </>
            )}
          </div>
        )}

        {/* STEP 3 — Approve message (edit the template, preview the personalization) */}
        {step === 3 && template && (() => {
          const first = creators.find(c => selected.has(c.id))
          const pvars = { ...brandingVars(), ...creatorVars(first) }
          return (
            <div>
              <Heading icon={<Pencil size={20} />} title="Approve your first message" sub="Edit the template — every [bracket] is filled in per creator automatically." />
              <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 14, padding: 18, marginBottom: 14 }}>
                <p style={{ fontSize: '0.6875rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Your template</p>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={11}
                  style={{ width: '100%', background: '#0d0d0d', border: '1px solid #1f1f1f', borderRadius: 10, color: '#d8d8d8', fontSize: '0.875rem', lineHeight: 1.7, padding: 14, resize: 'vertical', fontFamily: 'inherit' }} />
                <p style={{ color: '#555', fontSize: '0.75rem', marginTop: 8 }}>Plus {template.sequence.length - 1} automatic follow-ups if they don&apos;t reply.</p>
              </div>

              {/* Live personalized preview — proof the fill actually happens */}
              <div style={{ background: '#0d0d0d', border: '1px solid rgba(255,215,0,0.28)', borderRadius: 14, padding: 18 }}>
                <p style={{ fontSize: '0.6875rem', color: '#FFD700', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  Live preview — personalized for {first ? first.name : 'each creator'}
                </p>
                <p style={{ color: '#555', fontSize: '0.75rem', marginBottom: 12 }}>Every creator gets their own version with their name, platform and stats.</p>
                <p style={{ color: '#f0d060', fontSize: '0.8125rem', fontWeight: 700, marginBottom: 10 }}>
                  Subject: {fillTemplate(template.sequence[0].subject, pvars)}
                </p>
                <pre style={{ color: '#c9c9c9', fontSize: '0.8125rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                  {fillTemplate(message, pvars)}
                </pre>
              </div>
              <NavRow onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel="Continue to launch" />
            </div>
          )
        })()}

        {/* STEP 4 — Launch */}
        {step === 4 && template && (
          <div>
            <Heading icon={<Rocket size={20} />} title="Launch your first campaign" sub="Send to your selected creators and start tracking replies." />
            <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 14, padding: 22, marginBottom: 16 }}>
              <Summary label="Goal" value={template.label} />
              <Summary label="Niche" value={niche} />
              <Summary label="Sending to" value={`${emailableCount} creator${emailableCount === 1 ? '' : 's'} with email`} />
              <Summary label="From" value={connectedEmail || 'Not connected'} last />
            </div>

            {!connectedEmail ? (
              <div style={{ background: 'rgba(202,138,4,0.08)', border: '1px solid rgba(202,138,4,0.35)', borderRadius: 12, padding: '16px 18px', marginBottom: 16, fontSize: '0.875rem', color: '#d0d0d0', lineHeight: 1.6 }}>
                <strong style={{ color: '#FFD700' }}>Connect your email to send.</strong> Outreach goes out from your own Gmail for the best deliverability.
              </div>
            ) : null}

            <button onClick={launch} disabled={launching} className="btn-gold"
              style={{ width: '100%', padding: '15px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {launching ? <><Loader2 size={18} className="animate-spin" /> Launching…</>
                : connectedEmail ? <><Zap size={18} fill="#0a0a0a" /> Send my first campaign</>
                : <><Mail size={18} /> Connect email & launch</>}
            </button>
            <button onClick={() => setStep(3)} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: '#666', fontSize: '0.8125rem', cursor: 'pointer' }}>← Back</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Heading({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,215,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFD700', marginBottom: 14 }}>{icon}</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 6 }}>{title}</h1>
      <p style={{ color: '#777', fontSize: '0.9375rem', lineHeight: 1.6 }}>{sub}</p>
    </div>
  )
}
function NavRow({ onBack, onNext, nextLabel, disabled }: { onBack: () => void; onNext: () => void; nextLabel: string; disabled?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
      <button onClick={onBack} className="btn-outline-gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ArrowLeft size={15} /> Back</button>
      <button onClick={onNext} disabled={disabled} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: disabled ? 0.5 : 1 }}>{nextLabel} <ArrowRight size={16} /></button>
    </div>
  )
}
function Summary({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: last ? 'none' : '1px solid #181818' }}>
      <span style={{ color: '#777', fontSize: '0.875rem' }}>{label}</span>
      <span style={{ color: '#e0e0e0', fontSize: '0.875rem', fontWeight: 600 }}>{value}</span>
    </div>
  )
}
