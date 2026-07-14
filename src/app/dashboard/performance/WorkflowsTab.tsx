'use client'

// Workflow Orchestration — agencies define their own ordered path through the
// Performance Tracker (capture → proven results → email, etc). The library and
// builder live here; the runner bar is rendered by the page so it can drive
// the tabs and the capture modal directly.

import { useState } from 'react'
import { Plus, Play, Trash2, ChevronUp, ChevronDown, X, Check, GripVertical } from 'lucide-react'

/* ── types ── */
export interface WorkflowStep {
  step_id: string
  position: number
  section_type: string
  title: string
  description?: string
  enabled: boolean
  required: boolean
  estimated_time_minutes: number
  tips?: string
}
export interface Workflow {
  id: string
  name: string
  description: string | null
  icon: string
  steps: WorkflowStep[]
  runs_started: number
  runs_completed: number
  last_used_at: string | null
}

/* ── step catalog: every section a workflow can visit, mapped to a page tab ── */
export type PerfTab = 'overview' | 'analytics' | 'campaigns' | 'comparison' | 'cases' | 'workflows'

export interface CatalogEntry {
  section_type: string
  label: string
  icon: string
  tab: PerfTab
  opensModal?: boolean
  defaultTime: number
  tip: string
}

export const STEP_CATALOG: CatalogEntry[] = [
  { section_type: 'capture_performance', label: 'Capture performance', icon: '📹', tab: 'overview', opensModal: true, defaultTime: 5, tip: 'Paste a YouTube link to auto-pull views, likes and comments — saves 5 minutes per campaign.' },
  { section_type: 'view_creator_profile', label: 'Creator profile', icon: '👥', tab: 'overview', defaultTime: 3, tip: 'Click a creator on the leaderboard to open lifetime stats, score and history.' },
  { section_type: 'proven_results_card', label: 'Proven Results card', icon: '🎯', tab: 'overview', defaultTime: 2, tip: 'The gold card in the creator profile — copy it or export PDF and drop it in your next pitch.' },
  { section_type: 'campaign_analytics', label: 'Analytics review', icon: '📈', tab: 'analytics', defaultTime: 5, tip: 'Check the views and revenue trends before quoting numbers to a brand.' },
  { section_type: 'performance_comparison', label: 'Compare creators', icon: '🔄', tab: 'comparison', defaultTime: 4, tip: 'Pick 2-3 creators — green highlights show who leads each metric.' },
  { section_type: 'ai_insights', label: 'ProvBot insights', icon: '🤖', tab: 'overview', defaultTime: 3, tip: 'Generate insights from a creator profile — quotable patterns for negotiations.' },
  { section_type: 'case_study_builder', label: 'Make a case study', icon: '📚', tab: 'campaigns', defaultTime: 6, tip: 'Open a tracked campaign and hit "Make case study" — it becomes a public page.' },
  { section_type: 'share_case_study', label: 'Share case study', icon: '🌐', tab: 'cases', defaultTime: 2, tip: 'Grab the public link from the gallery and send it to the brand.' },
  { section_type: 'export_pdf', label: 'Export PDF', icon: '💾', tab: 'overview', defaultTime: 1, tip: 'PDF button on the Proven Results card — branded one-pager, no design work.' },
  { section_type: 'generate_email_proposal', label: 'Email proposal', icon: '📧', tab: 'overview', defaultTime: 3, tip: 'Copy the Proven Results text and paste it into your outreach template as proof.' },
]

export function catalogFor(sectionType: string): CatalogEntry {
  return STEP_CATALOG.find(c => c.section_type === sectionType) ?? STEP_CATALOG[0]
}

/* ── preset templates seeded on first use ── */
const PRESETS: Array<{ name: string; description: string; icon: string; sections: string[] }> = [
  {
    name: 'Dealclosing Speedrun', icon: '🚀',
    description: 'Log the campaign, generate proof, get it in front of the brand — fast.',
    sections: ['capture_performance', 'proven_results_card', 'export_pdf', 'generate_email_proposal'],
  },
  {
    name: 'Deep Dive Analysis', icon: '🔍',
    description: 'Full review: capture, trends, creator comparison, AI insights, case study.',
    sections: ['capture_performance', 'campaign_analytics', 'performance_comparison', 'ai_insights', 'case_study_builder'],
  },
  {
    name: 'Case Study Pipeline', icon: '📚',
    description: 'Turn your best completed campaigns into shareable public case studies.',
    sections: ['view_creator_profile', 'case_study_builder', 'share_case_study'],
  },
]

function stepsFromSections(sections: string[]): WorkflowStep[] {
  return sections.map((s, i) => {
    const c = catalogFor(s)
    return {
      step_id: crypto.randomUUID(), position: i + 1, section_type: s,
      title: c.label, enabled: true, required: false,
      estimated_time_minutes: c.defaultTime, tips: c.tip,
    }
  })
}

function totalMinutes(w: Workflow) {
  return w.steps.filter(s => s.enabled).reduce((s, x) => s + x.estimated_time_minutes, 0)
}

/* ── shared styles (match page.tsx) ── */
const GOLD = '#FFD700'
const card: React.CSSProperties = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 14, padding: 18 }
const eyebrow: React.CSSProperties = { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8a8a8a', marginBottom: 10 }

/* ══ Runner bar — rendered by the page above the tabs while a workflow runs ══ */
export function WorkflowRunner({ workflow, stepIndex, onBack, onNext, onExit }: {
  workflow: Workflow
  stepIndex: number
  onBack: () => void
  onNext: () => void
  onExit: () => void
}) {
  const steps = workflow.steps.filter(s => s.enabled)
  const step = steps[stepIndex]
  if (!step) return null
  const isLast = stepIndex === steps.length - 1
  return (
    <div style={{ ...card, border: `1px solid rgba(255,215,0,0.35)`, background: 'linear-gradient(160deg, #16130c, #0f0f0f)', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 20 }}>{workflow.icon}</span>
          <div>
            <p style={{ ...eyebrow, marginBottom: 2, color: GOLD }}>
              Workflow: {workflow.name} — step {stepIndex + 1} of {steps.length}
            </p>
            <p style={{ color: '#f5f5f5', fontWeight: 800, fontSize: '0.9375rem' }}>
              {catalogFor(step.section_type).icon} {step.title}
              <span style={{ color: '#777', fontWeight: 500, fontSize: '0.8125rem', marginLeft: 8 }}>~{step.estimated_time_minutes} min</span>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {stepIndex > 0 && (
            <button onClick={onBack} className="btn-outline-gold" style={{ padding: '6px 12px', fontSize: '0.8125rem' }}>← Back</button>
          )}
          <button onClick={onNext} className="btn-gold" style={{ padding: '6px 14px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            {isLast ? <><Check size={14} /> Finish workflow</> : 'Mark done — next →'}
          </button>
          <button onClick={onExit} title="Exit workflow"
            style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#888', padding: '6px 10px', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      </div>
      {(step.tips || step.description) && (
        <p style={{ color: '#b8a04a', fontSize: '0.8125rem', marginTop: 10 }}>💡 {step.tips || step.description}</p>
      )}
      {/* progress dots */}
      <div style={{ display: 'flex', gap: 5, marginTop: 12 }}>
        {steps.map((s, i) => (
          <span key={s.step_id} style={{
            height: 4, flex: 1, borderRadius: 2,
            background: i < stepIndex ? '#4ade80' : i === stepIndex ? GOLD : '#242424',
          }} />
        ))}
      </div>
    </div>
  )
}

/* ══ Workflows tab: library + builder ══ */
export default function WorkflowsTab({ workflows, reload, onRun }: {
  workflows: Workflow[]
  reload: () => void
  onRun: (w: Workflow) => void
}) {
  const [editing, setEditing] = useState<Workflow | null>(null)
  const [seeding, setSeeding] = useState(false)

  async function seedPresets() {
    setSeeding(true)
    for (const p of PRESETS) {
      await fetch('/api/performance/workflows', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: p.name, description: p.description, icon: p.icon, steps: stepsFromSections(p.sections) }),
      })
    }
    setSeeding(false); reload()
  }

  async function createBlank() {
    const res = await fetch('/api/performance/workflows', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New workflow', icon: '⚡', steps: [] }),
    })
    const d = await res.json()
    if (d.workflow) { reload(); setEditing(d.workflow) }
  }

  async function remove(id: string) {
    await fetch(`/api/performance/workflows?id=${id}`, { method: 'DELETE' })
    if (editing?.id === id) setEditing(null)
    reload()
  }

  if (editing) {
    return <WorkflowBuilder workflow={editing} onClose={() => { setEditing(null); reload() }} />
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ color: '#f5f5f5', fontWeight: 800, fontSize: '1.0625rem' }}>My workflows</p>
          <p style={{ color: '#666', fontSize: '0.8125rem', marginTop: 2 }}>
            Your own ordered path through the tracker — hit Run and it guides you step by step.
          </p>
        </div>
        <button onClick={createBlank} className="btn-gold" style={{ padding: '7px 14px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> New workflow
        </button>
      </div>

      {!workflows.length && (
        <div style={{ ...card, textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#999', fontWeight: 700, marginBottom: 6 }}>No workflows yet</p>
          <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: 18, maxWidth: 460, margin: '0 auto 18px' }}>
            Start from three proven templates — Dealclosing Speedrun, Deep Dive Analysis and Case Study Pipeline — then customize the steps to how your agency works.
          </p>
          <button onClick={seedPresets} disabled={seeding} className="btn-gold">
            {seeding ? 'Creating…' : 'Add starter workflows'}
          </button>
        </div>
      )}

      {workflows.map(w => (
        <div key={w.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 26 }}>{w.icon}</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ color: '#f5f5f5', fontWeight: 800 }}>{w.name}</p>
            <p style={{ color: '#777', fontSize: '0.8125rem', marginTop: 2 }}>
              {w.steps.filter(s => s.enabled).length} steps · ~{totalMinutes(w)} min
              {w.runs_completed > 0 && ` · completed ${w.runs_completed}×`}
            </p>
            {w.steps.length > 0 && (
              <p style={{ color: '#555', fontSize: '0.75rem', marginTop: 4 }}>
                {w.steps.filter(s => s.enabled).map(s => catalogFor(s.section_type).icon + ' ' + s.title).join('  →  ')}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onRun(w)} disabled={!w.steps.some(s => s.enabled)}
              className="btn-gold" style={{ padding: '7px 14px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6, opacity: w.steps.some(s => s.enabled) ? 1 : 0.5 }}>
              <Play size={13} /> Run
            </button>
            <button onClick={() => setEditing(w)} className="btn-outline-gold" style={{ padding: '7px 14px', fontSize: '0.8125rem' }}>
              Edit
            </button>
            <button onClick={() => remove(w.id)} title="Delete workflow"
              style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#8a5a5a', padding: '7px 10px', cursor: 'pointer' }}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ══ Builder: catalog on the left, ordered steps on the right ══ */
function WorkflowBuilder({ workflow, onClose }: { workflow: Workflow; onClose: () => void }) {
  const [name, setName] = useState(workflow.name)
  const [icon, setIcon] = useState(workflow.icon)
  const [steps, setSteps] = useState<WorkflowStep[]>(workflow.steps)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  function addStep(c: CatalogEntry) {
    setDirty(true)
    setSteps(prev => [...prev, {
      step_id: crypto.randomUUID(), position: prev.length + 1, section_type: c.section_type,
      title: c.label, enabled: true, required: false, estimated_time_minutes: c.defaultTime, tips: c.tip,
    }])
  }
  function move(i: number, dir: -1 | 1) {
    setDirty(true)
    setSteps(prev => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next.map((s, k) => ({ ...s, position: k + 1 }))
    })
  }
  function patchStep(i: number, patch: Partial<WorkflowStep>) {
    setDirty(true)
    setSteps(prev => prev.map((s, k) => (k === i ? { ...s, ...patch } : s)))
  }
  function removeStep(i: number) {
    setDirty(true)
    setSteps(prev => prev.filter((_, k) => k !== i).map((s, k) => ({ ...s, position: k + 1 })))
  }

  async function save() {
    setSaving(true)
    await fetch('/api/performance/workflows', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: workflow.id, name, icon, steps }),
    })
    setSaving(false); setDirty(false); onClose()
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <input value={icon} onChange={e => { setIcon(e.target.value); setDirty(true) }} maxLength={4}
          style={{ width: 52, textAlign: 'center', fontSize: 20, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 10, color: '#f5f5f5', padding: '8px 0' }} />
        <input value={name} onChange={e => { setName(e.target.value); setDirty(true) }} placeholder="Workflow name"
          style={{ flex: 1, minWidth: 200, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 10, color: '#f5f5f5', fontWeight: 700, fontSize: '1rem', padding: '10px 14px' }} />
        <button onClick={save} disabled={saving || !name.trim()} className="btn-gold" style={{ padding: '9px 18px', fontSize: '0.875rem' }}>
          {saving ? 'Saving…' : dirty ? 'Save workflow' : 'Saved'}
        </button>
        <button onClick={onClose} className="btn-outline-gold" style={{ padding: '9px 14px', fontSize: '0.875rem' }}>Back</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 300px) 1fr', gap: 16, alignItems: 'start' }}>
        {/* Catalog */}
        <div style={card}>
          <p style={eyebrow}>Available steps — click to add</p>
          <div style={{ display: 'grid', gap: 6 }}>
            {STEP_CATALOG.map(c => (
              <button key={c.section_type} onClick={() => addStep(c)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#141414', border: '1px solid #232323', borderRadius: 9, padding: '9px 11px', color: '#ddd', fontSize: '0.8125rem', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.4)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#232323')}>
                <span>{c.icon}</span> {c.label}
                <Plus size={12} style={{ marginLeft: 'auto', color: '#666' }} />
              </button>
            ))}
          </div>
        </div>

        {/* Ordered steps */}
        <div style={card}>
          <p style={eyebrow}>Your workflow — runs top to bottom</p>
          {!steps.length && <p style={{ color: '#666', fontSize: '0.875rem', padding: '20px 0', textAlign: 'center' }}>Add steps from the left to build the flow.</p>}
          <div style={{ display: 'grid', gap: 8 }}>
            {steps.map((s, i) => {
              const c = catalogFor(s.section_type)
              return (
                <div key={s.step_id} style={{ background: '#141414', border: '1px solid #232323', borderRadius: 10, padding: '10px 12px', opacity: s.enabled ? 1 : 0.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <GripVertical size={13} style={{ color: '#444' }} />
                    <span style={{ color: GOLD, fontWeight: 800, fontSize: '0.8125rem', width: 18 }}>{i + 1}</span>
                    <span>{c.icon}</span>
                    <input value={s.title} onChange={e => patchStep(i, { title: e.target.value })}
                      style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f0f0f0', fontWeight: 700, fontSize: '0.875rem' }} />
                    <input type="number" min={1} max={120} value={s.estimated_time_minutes}
                      onChange={e => patchStep(i, { estimated_time_minutes: Math.max(1, Number(e.target.value) || 1) })}
                      title="Estimated minutes"
                      style={{ width: 48, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 6, color: '#bbb', fontSize: '0.75rem', padding: '3px 6px', textAlign: 'center' }} />
                    <span style={{ color: '#555', fontSize: '0.6875rem' }}>min</span>
                    <button onClick={() => move(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', color: i === 0 ? '#333' : '#888', cursor: 'pointer', padding: 2 }}><ChevronUp size={14} /></button>
                    <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} style={{ background: 'none', border: 'none', color: i === steps.length - 1 ? '#333' : '#888', cursor: 'pointer', padding: 2 }}><ChevronDown size={14} /></button>
                    <button onClick={() => patchStep(i, { enabled: !s.enabled })} title={s.enabled ? 'Disable step' : 'Enable step'}
                      style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 6, color: s.enabled ? '#4ade80' : '#666', fontSize: '0.6875rem', padding: '2px 8px', cursor: 'pointer' }}>
                      {s.enabled ? 'On' : 'Off'}
                    </button>
                    <button onClick={() => removeStep(i)} style={{ background: 'none', border: 'none', color: '#8a5a5a', cursor: 'pointer', padding: 2 }}><X size={14} /></button>
                  </div>
                  <input value={s.tips ?? ''} onChange={e => patchStep(i, { tips: e.target.value })} placeholder="Tip shown while running this step…"
                    style={{ width: '100%', marginTop: 8, background: '#0f0f0f', border: '1px solid #222', borderRadius: 7, color: '#999', fontSize: '0.75rem', padding: '6px 9px' }} />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
