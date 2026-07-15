import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'

// Clients — the agencies the workspace works with (their own client roster / brands).
// Workspace-scoped, backed by the `clients` table (0020). Supports listing, creating a
// single client, bulk-importing from a spreadsheet (CSV parsed client-side → array), and
// deleting. apiCtx.sb is the service client, so we scope every query by workspace_id here.

type ClientInput = {
  name: string
  industry: string | null
  contact_name: string | null
  contact_email: string | null
  notes: string | null
}

function clean(c: Record<string, unknown>): ClientInput | null {
  const name = String(c.name ?? '').trim().slice(0, 200)
  if (!name) return null
  const str = (v: unknown, n: number) => { const s = String(v ?? '').trim(); return s ? s.slice(0, n) : null }
  return {
    name,
    industry: str(c.industry, 120),
    contact_name: str(c.contact_name, 120),
    contact_email: c.contact_email ? String(c.contact_email).trim().toLowerCase().slice(0, 200) : null,
    notes: str(c.notes, 2000),
  }
}

export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.workspaceId) return NextResponse.json({ clients: [] })
  const { data, error } = await ctx.sb
    .from('clients')
    .select('id, name, industry, contact_name, contact_email, notes, created_at')
    .eq('workspace_id', ctx.workspaceId)
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clients: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.workspaceId) {
    return NextResponse.json({ error: 'No workspace is attached to your account yet.' }, { status: 400 })
  }
  const workspaceId = ctx.workspaceId

  const body = await req.json().catch(() => ({}))
  // Bulk import when `clients` is an array (spreadsheet upload); else create one.
  const rawRows: unknown[] = Array.isArray(body?.clients) ? body.clients : [body]
  if (rawRows.length > 5000) return NextResponse.json({ error: 'Max 5000 clients per import' }, { status: 400 })

  const rows = rawRows.map(r => clean((r ?? {}) as Record<string, unknown>)).filter(Boolean) as ClientInput[]
  if (!rows.length) return NextResponse.json({ error: 'Every client needs at least a name.' }, { status: 400 })

  // Skip names already in this workspace (case-insensitive) so re-importing a
  // spreadsheet refreshes the roster instead of duplicating it.
  const { data: existing } = await ctx.sb.from('clients').select('name').eq('workspace_id', workspaceId)
  const existingNames = new Set((existing ?? []).map(e => String(e.name).trim().toLowerCase()))
  const seen = new Set<string>()
  const toInsert = rows
    .filter(r => {
      const k = r.name.toLowerCase()
      if (existingNames.has(k) || seen.has(k)) return false
      seen.add(k); return true
    })
    .map(r => ({ ...r, workspace_id: workspaceId }))

  if (!toInsert.length) {
    return NextResponse.json({ ok: true, imported: 0, skipped: rows.length, message: 'Those clients are already in your list.' })
  }

  const { data, error } = await ctx.sb.from('clients').insert(toInsert).select('id, name, industry, contact_name, contact_email, notes, created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, imported: data?.length ?? toInsert.length, skipped: rows.length - toInsert.length, clients: data ?? [] })
}

export async function DELETE(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await ctx.sb.from('clients').delete().eq('id', id).eq('workspace_id', ctx.workspaceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
