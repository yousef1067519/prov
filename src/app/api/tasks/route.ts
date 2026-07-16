import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { logActivity } from '@/lib/activity'

// Team assignments (0030). The manager (owner/admin/manager) creates tasks and
// assigns them to members by email; every member sees the workspace's tasks, and
// ?mine=1 filters to the signed-in member's own queue (dashboard card). Anyone on
// the team can comment and the ASSIGNEE can move their own task's status — so a
// Team Member can mark their work done without having manager rights.

const MANAGE_LEGACY = new Set(['Owner', 'Admin', 'Manager'])
const MANAGE_WS = new Set(['owner', 'admin', 'account_manager'])
const STATUSES = new Set(['open', 'in_progress', 'done'])

function canManage(ctx: { role: string; wsRole: string | null }): boolean {
  if (ctx.wsRole) return MANAGE_WS.has(ctx.wsRole)
  return MANAGE_LEGACY.has(ctx.role)
}

export async function GET(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.workspaceId) return NextResponse.json({ tasks: [] })

  let q = ctx.sb.from('tasks')
    .select('*')
    .eq('workspace_id', ctx.workspaceId)
    .order('status', { ascending: true }) // open → in_progress → done groups nicely
    .order('created_at', { ascending: false })
    .limit(300)
  if (req.nextUrl.searchParams.get('mine') === '1' && ctx.email) {
    q = q.ilike('assignee_email', ctx.email)
  }
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data ?? [], me: ctx.email, canManage: canManage(ctx) })
}

export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 })
  if (!canManage(ctx)) return NextResponse.json({ error: 'Only managers can assign tasks' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const title = String(b.title ?? '').trim().slice(0, 200)
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const { data, error } = await ctx.sb.from('tasks').insert({
    workspace_id: ctx.workspaceId,
    title,
    notes: b.notes ? String(b.notes).slice(0, 2000) : null,
    assignee_email: b.assignee_email ? String(b.assignee_email).trim().toLowerCase().slice(0, 200) : null,
    due_date: b.due_date || null,
    created_by_email: ctx.email,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(ctx.sb, ctx.userId, {
    actorEmail: ctx.email ?? undefined, action: 'assigned_task', resourceType: 'task', resourceId: data.id,
    meta: { title, assignee: data.assignee_email },
  }).catch(() => {})
  return NextResponse.json({ task: data })
}

export async function PATCH(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

  const b = await req.json().catch(() => ({}))
  const id = String(b.id ?? '')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: task } = await ctx.sb.from('tasks')
    .select('*').eq('id', id).eq('workspace_id', ctx.workspaceId).maybeSingle()
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const isAssignee = !!ctx.email && String(task.assignee_email ?? '').toLowerCase() === ctx.email.toLowerCase()
  const manager = canManage(ctx)

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  // Comments: anyone in the workspace can add one.
  if (typeof b.comment === 'string' && b.comment.trim()) {
    const thread = Array.isArray(task.comments) ? task.comments : []
    patch.comments = [...thread, { by: ctx.email ?? 'member', text: b.comment.trim().slice(0, 1000), at: new Date().toISOString() }].slice(-50)
  }

  // Status: managers always; the assignee may move their own task.
  if (typeof b.status === 'string') {
    if (!STATUSES.has(b.status)) return NextResponse.json({ error: 'Bad status' }, { status: 400 })
    if (!manager && !isAssignee) return NextResponse.json({ error: 'Only the assignee or a manager can update status' }, { status: 403 })
    patch.status = b.status
  }

  // Edits to title/notes/assignee/due date: managers only.
  if (b.title !== undefined || b.notes !== undefined || b.assignee_email !== undefined || b.due_date !== undefined) {
    if (!manager) return NextResponse.json({ error: 'Only managers can edit tasks' }, { status: 403 })
    if (typeof b.title === 'string' && b.title.trim()) patch.title = b.title.trim().slice(0, 200)
    if (b.notes !== undefined) patch.notes = b.notes ? String(b.notes).slice(0, 2000) : null
    if (b.assignee_email !== undefined) patch.assignee_email = b.assignee_email ? String(b.assignee_email).trim().toLowerCase() : null
    if (b.due_date !== undefined) patch.due_date = b.due_date || null
  }

  const { data, error } = await ctx.sb.from('tasks').update(patch).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (patch.status === 'done') {
    await logActivity(ctx.sb, ctx.userId, {
      actorEmail: ctx.email ?? undefined, action: 'completed_task', resourceType: 'task', resourceId: id,
      meta: { title: task.title },
    }).catch(() => {})
  }
  return NextResponse.json({ task: data })
}

export async function DELETE(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 })
  if (!canManage(ctx)) return NextResponse.json({ error: 'Only managers can delete tasks' }, { status: 403 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await ctx.sb.from('tasks').delete().eq('id', id).eq('workspace_id', ctx.workspaceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
