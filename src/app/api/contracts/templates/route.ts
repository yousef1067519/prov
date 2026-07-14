import { NextRequest, NextResponse } from 'next/server'
import { apiCtx, serviceClient } from '@/lib/apiUser'

const BUCKET = 'contracts' // PRIVATE bucket: BYO templates + executed PDFs

// §8.5 BYO templates: agencies upload .docx/.pdf or compose from clauses.
export async function GET() {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ templates: [] })
  const { data, error } = await ctx.sb.from('workspace_contract_templates')
    .select('*').eq('workspace_id', ctx.workspaceId).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [] })
}

// POST — either { name, body_md?, clause_keys?, merge_fields? } (prov kind)
// or { name, upload: { filename } } → returns a signed upload URL and creates
// an 'uploaded' template pointing at the file.
export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (ctx.wsRole && !['owner', 'admin', 'account_manager'].includes(ctx.wsRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const b = await req.json().catch(() => ({}))
  if (!b.name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  if (b.upload?.filename) {
    const safe = String(b.upload.filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
    if (!/\.(docx|pdf)$/i.test(safe)) return NextResponse.json({ error: 'Only .docx or .pdf templates' }, { status: 400 })
    const path = `${ctx.workspaceId}/templates/${crypto.randomUUID()}-${safe}`
    const { data: signed, error: sErr } = await serviceClient().storage.from(BUCKET).createSignedUploadUrl(path)
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })
    const { data, error } = await ctx.sb.from('workspace_contract_templates').insert({
      workspace_id: ctx.workspaceId, name: String(b.name).slice(0, 160),
      kind: 'uploaded', file_path: path,
      merge_fields: Array.isArray(b.merge_fields) ? b.merge_fields : [],
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ template: data, upload: { path: signed.path, token: signed.token } })
  }

  const { data, error } = await ctx.sb.from('workspace_contract_templates').insert({
    workspace_id: ctx.workspaceId, name: String(b.name).slice(0, 160),
    kind: 'prov', body_md: b.body_md ?? null,
    clause_keys: Array.isArray(b.clause_keys) ? b.clause_keys : [],
    merge_fields: Array.isArray(b.merge_fields) ? b.merge_fields : [],
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

export async function DELETE(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 401 })
  if (ctx.wsRole && !['owner', 'admin'].includes(ctx.wsRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await ctx.sb.from('workspace_contract_templates')
    .delete().eq('id', id).eq('workspace_id', ctx.workspaceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
