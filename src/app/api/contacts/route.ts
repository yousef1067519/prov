import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'

// Contacts — the workspace's own creator/influencer rolodex, imported from their
// spreadsheets. Workspace-PRIVATE (never the shared `creators` catalog). Backed by the
// `contacts` table (0027). apiCtx.sb is the service client, so we scope by workspace_id.

type ContactInput = {
  name: string
  handle: string | null
  platform: string | null
  niche: string | null
  followers: number | null
  email: string | null
  notes: string | null
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(/[, ]/g, '').replace(/k$/i, 'e3').replace(/m$/i, 'e6'))
  return Number.isFinite(n) ? Math.round(n) : null
}

function clean(c: Record<string, unknown>): ContactInput | null {
  const name = String(c.name ?? c.handle ?? '').trim().slice(0, 200)
  if (!name) return null
  const str = (v: unknown, n: number) => { const s = String(v ?? '').trim(); return s ? s.slice(0, n) : null }
  return {
    name,
    handle: c.handle ? String(c.handle).trim().replace(/^@/, '').slice(0, 120) : null,
    platform: str(c.platform, 60),
    niche: str(c.niche, 60),
    followers: num(c.followers ?? c.subscribers),
    email: c.email ? String(c.email).trim().toLowerCase().slice(0, 200) : null,
    notes: str(c.notes, 2000),
  }
}

// Dedupe key within a workspace: handle if present, else the name.
const keyOf = (c: { handle: string | null; name: string }) => (c.handle || c.name).toLowerCase()

export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.workspaceId) return NextResponse.json({ contacts: [] })
  const { data, error } = await ctx.sb
    .from('contacts')
    .select('id, name, handle, platform, niche, followers, email, notes, created_at')
    .eq('workspace_id', ctx.workspaceId)
    .order('followers', { ascending: false, nullsFirst: false })
    .limit(5000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contacts: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.workspaceId) return NextResponse.json({ error: 'No workspace is attached to your account yet.' }, { status: 400 })
  const workspaceId = ctx.workspaceId

  const body = await req.json().catch(() => ({}))
  const rawRows: unknown[] = Array.isArray(body?.contacts) ? body.contacts : [body]
  if (rawRows.length > 20000) return NextResponse.json({ error: 'Max 20,000 contacts per import' }, { status: 400 })

  const rows = rawRows.map(r => clean((r ?? {}) as Record<string, unknown>)).filter(Boolean) as ContactInput[]
  if (!rows.length) return NextResponse.json({ error: 'Every contact needs at least a name or handle.' }, { status: 400 })

  // Skip contacts already in this workspace (by handle, else name) so re-importing is safe.
  const { data: existing } = await ctx.sb.from('contacts').select('name, handle').eq('workspace_id', workspaceId)
  const have = new Set((existing ?? []).map(e => keyOf(e as { handle: string | null; name: string })))
  const seen = new Set<string>()
  const toInsert = rows
    .filter(r => { const k = keyOf(r); if (have.has(k) || seen.has(k)) return false; seen.add(k); return true })
    .map(r => ({ ...r, workspace_id: workspaceId, source: 'import' }))

  if (!toInsert.length) {
    return NextResponse.json({ ok: true, imported: 0, skipped: rows.length, message: 'Those contacts are already in your list.' })
  }

  // Insert in chunks so a very large spreadsheet doesn't hit payload limits.
  let imported = 0
  for (let i = 0; i < toInsert.length; i += 1000) {
    const chunk = toInsert.slice(i, i + 1000)
    const { data, error } = await ctx.sb.from('contacts').insert(chunk).select('id')
    if (error) return NextResponse.json({ error: error.message, imported }, { status: 500 })
    imported += data?.length ?? chunk.length
  }
  return NextResponse.json({ ok: true, imported, skipped: rows.length - toInsert.length })
}

export async function DELETE(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await ctx.sb.from('contacts').delete().eq('id', id).eq('workspace_id', ctx.workspaceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
