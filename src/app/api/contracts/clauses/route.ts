import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'

// §8.5 clause library: stock (workspace_id null) merged with workspace copies.
export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await ctx.sb.from('contract_clauses')
    .select('id, key, title, body_md, sort, workspace_id')
    .or(ctx.workspaceId ? `workspace_id.is.null,workspace_id.eq.${ctx.workspaceId}` : 'workspace_id.is.null')
    .order('sort')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Workspace copy shadows the stock clause with the same key.
  const merged = new Map<string, (typeof data)[number]>()
  for (const c of data ?? []) {
    if (!merged.has(c.key) || c.workspace_id) merged.set(c.key, c)
  }
  return NextResponse.json({ clauses: [...merged.values()].sort((a, b) => a.sort - b.sort) })
}

// PUT { key, title?, body_md } — creates/updates this workspace's copy of a clause.
export async function PUT(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (ctx.wsRole && !['owner', 'admin', 'account_manager'].includes(ctx.wsRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const b = await req.json().catch(() => ({}))
  if (!b.key || !b.body_md) return NextResponse.json({ error: 'key and body_md required' }, { status: 400 })

  const { data: stock } = await ctx.sb.from('contract_clauses')
    .select('title, sort').eq('key', b.key).is('workspace_id', null).maybeSingle()
  const { data, error } = await ctx.sb.from('contract_clauses').upsert({
    workspace_id: ctx.workspaceId,
    key: String(b.key).slice(0, 60),
    title: String(b.title ?? stock?.title ?? b.key).slice(0, 160),
    body_md: String(b.body_md),
    sort: stock?.sort ?? 100,
  }, { onConflict: 'workspace_id,key' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
