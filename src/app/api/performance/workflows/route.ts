import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'

// Workflow CRUD — each agency's personalized paths through the Performance Tracker.
// GET    → list all workflows for the workspace
// POST   → create ({ name, description?, icon?, steps })
// PUT    → update ({ id, ...fields }) — also used to bump run counters
// DELETE → remove (?id=)

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

function sanitizeSteps(raw: unknown): WorkflowStep[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(s => s && typeof s === 'object' && typeof (s as WorkflowStep).section_type === 'string')
    .slice(0, 30)
    .map((s, i) => {
      const step = s as Partial<WorkflowStep>
      return {
        step_id: String(step.step_id || crypto.randomUUID()),
        position: i + 1,
        section_type: String(step.section_type),
        title: String(step.title || step.section_type).slice(0, 120),
        description: step.description ? String(step.description).slice(0, 400) : undefined,
        enabled: step.enabled !== false,
        required: step.required === true,
        estimated_time_minutes: Math.max(1, Math.min(120, Number(step.estimated_time_minutes) || 5)),
        tips: step.tips ? String(step.tips).slice(0, 400) : undefined,
      }
    })
}

export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await ctx.sb
    .from('user_workflows')
    .select('*')
    .eq('agency_id', ctx.userId)
    .order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ workflows: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Workflow name is required' }, { status: 400 })
  }

  const { data, error } = await ctx.sb
    .from('user_workflows')
    .insert({
      agency_id: ctx.userId,
      name: body.name.slice(0, 80),
      description: body.description ? String(body.description).slice(0, 300) : null,
      icon: body.icon ? String(body.icon).slice(0, 8) : '⚡',
      steps: sanitizeSteps(body.steps),
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ workflow: data })
}

export async function PUT(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'Workflow id is required' }, { status: 400 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name) patch.name = String(body.name).slice(0, 80)
  if (body.description !== undefined) patch.description = body.description ? String(body.description).slice(0, 300) : null
  if (body.icon) patch.icon = String(body.icon).slice(0, 8)
  if (body.steps !== undefined) patch.steps = sanitizeSteps(body.steps)
  if (body.run_started) patch.last_used_at = new Date().toISOString()

  const { data, error } = await ctx.sb
    .from('user_workflows')
    .update(patch)
    .eq('id', body.id)
    .eq('agency_id', ctx.userId)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Run counters are incremented separately so concurrent runs don't clobber each other.
  if (body.run_started || body.run_completed) {
    const field = body.run_completed ? 'runs_completed' : 'runs_started'
    await ctx.sb
      .from('user_workflows')
      .update({ [field]: (Number(data[field]) || 0) + 1 })
      .eq('id', body.id)
      .eq('agency_id', ctx.userId)
  }

  return NextResponse.json({ workflow: data })
}

export async function DELETE(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Workflow id is required' }, { status: 400 })

  const { error } = await ctx.sb
    .from('user_workflows')
    .delete()
    .eq('id', id)
    .eq('agency_id', ctx.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
