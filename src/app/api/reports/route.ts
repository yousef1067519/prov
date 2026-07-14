import { NextRequest, NextResponse } from 'next/server'
import { apiCtx, serviceClient } from '@/lib/apiUser'

const BUCKET = 'reports'
const SIGNED_TTL = 3600 // 1h

// GET — list the user's saved reports with fresh signed download URLs.
export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ reports: [] })
  const svc = serviceClient()
  const { data } = await svc
    .from('reports')
    .select('id, campaign_id, campaign_name, file_path, created_at')
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .limit(50)

  const reports = await Promise.all((data ?? []).map(async r => {
    const { data: signed } = await svc.storage.from(BUCKET).createSignedUrl(r.file_path, SIGNED_TTL)
    return {
      id: r.id, campaign_id: r.campaign_id, campaign_name: r.campaign_name,
      created_at: r.created_at, url: signed?.signedUrl ?? null,
    }
  }))
  return NextResponse.json({ reports })
}

// POST — store a generated PDF (base64) to Storage + a metadata row.
export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { campaignId, campaignName, base64 } = await req.json().catch(() => ({}))
  if (!base64 || typeof base64 !== 'string') return NextResponse.json({ error: 'base64 PDF required' }, { status: 400 })

  const svc = serviceClient()
  const id = crypto.randomUUID()
  const path = `${ctx.userId}/${id}.pdf`

  const { error: upErr } = await svc.storage.from(BUCKET).upload(path, Buffer.from(base64, 'base64'), {
    contentType: 'application/pdf', upsert: true,
  })
  if (upErr) return NextResponse.json({ error: `Storage: ${upErr.message}` }, { status: 500 })

  const { error } = await svc.from('reports').insert({
    id, user_id: ctx.userId, campaign_id: campaignId ?? null, campaign_name: campaignName ?? 'Report', file_path: path,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: signed } = await svc.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL)
  return NextResponse.json({ ok: true, id, url: signed?.signedUrl ?? null })
}

// DELETE /api/reports?id= — remove the metadata row + the Storage file.
export async function DELETE(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const svc = serviceClient()
  const { data: row } = await svc.from('reports').select('file_path, user_id').eq('id', id).maybeSingle()
  if (!row || row.user_id !== ctx.userId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await svc.storage.from(BUCKET).remove([row.file_path])
  await svc.from('reports').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
