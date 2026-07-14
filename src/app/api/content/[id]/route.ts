import { NextRequest, NextResponse } from 'next/server'
import { apiCtx, serviceClient } from '@/lib/apiUser'

const BUCKET = 'campaign-content'
const TTL = 3600
type Ctx = { params: Promise<{ id: string }> }

// GET — a content item + its version history, with signed download URLs.
export async function GET(_req: NextRequest, ctx: Ctx) {
  const c = await apiCtx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const svc = serviceClient()

  const { data: item } = await c.sb.from('content_items').select('*').eq('id', id).eq('owner_id', c.userId).maybeSingle()
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: versions } = await c.sb.from('content_versions')
    .select('id, version_num, file_path, notes, uploaded_at').eq('content_id', id).order('version_num', { ascending: false })

  const withUrls = await Promise.all((versions ?? []).map(async v => {
    const { data: signed } = await svc.storage.from(BUCKET).createSignedUrl(v.file_path, TTL)
    return { ...v, url: signed?.signedUrl ?? null }
  }))
  return NextResponse.json({ item, versions: withUrls })
}

// DELETE — remove the item, all its versions, and their files from Storage.
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const c = await apiCtx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params

  const { data: item } = await c.sb.from('content_items').select('id').eq('id', id).eq('owner_id', c.userId).maybeSingle()
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: versions } = await c.sb.from('content_versions').select('file_path').eq('content_id', id)
  const paths = (versions ?? []).map(v => v.file_path)
  if (paths.length) await serviceClient().storage.from(BUCKET).remove(paths)
  await c.sb.from('content_items').delete().eq('id', id).eq('owner_id', c.userId) // cascades versions
  return NextResponse.json({ ok: true })
}
