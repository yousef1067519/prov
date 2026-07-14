import { NextRequest, NextResponse } from 'next/server'
import { apiCtx, serviceClient } from '@/lib/apiUser'
import { logActivity } from '@/lib/activity'

const BUCKET = 'campaign-content'
const TTL = 3600
type Ctx = { params: Promise<{ id: string }> }

// GET — content items for a campaign, each with a fresh signed download URL.
export async function GET(_req: NextRequest, ctx: Ctx) {
  const c = await apiCtx()
  if (!c) return NextResponse.json({ content: [] })
  const { id: campaignId } = await ctx.params
  const svc = serviceClient()
  const { data } = await c.sb
    .from('content_items')
    .select('id, title, description, file_path, file_type, file_size, status, review_comment, version_num, uploaded_at')
    .eq('owner_id', c.userId).eq('campaign_id', campaignId)
    .order('uploaded_at', { ascending: false })

  const content = await Promise.all((data ?? []).map(async it => {
    const { data: signed } = await svc.storage.from(BUCKET).createSignedUrl(it.file_path, TTL)
    return { ...it, url: signed?.signedUrl ?? null }
  }))
  return NextResponse.json({ content })
}

// POST — record an uploaded file as a content item (v1) after the browser uploaded it to Storage.
export async function POST(req: NextRequest, ctx: Ctx) {
  const c = await apiCtx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: campaignId } = await ctx.params
  const b = await req.json().catch(() => ({}))
  if (!b.title || !b.file_path) return NextResponse.json({ error: 'title and file_path required' }, { status: 400 })

  const id = crypto.randomUUID()
  const { data, error } = await c.sb.from('content_items').insert({
    id, campaign_id: campaignId, owner_id: c.userId,
    title: String(b.title).slice(0, 200),
    description: b.description ? String(b.description).slice(0, 1000) : null,
    file_path: b.file_path, file_type: b.file_type ?? 'document', file_size: Number(b.file_size || 0),
    status: 'pending', version_num: 1,
  }).select('id, title, status, file_type, version_num, uploaded_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await c.sb.from('content_versions').insert({ content_id: id, owner_id: c.userId, version_num: 1, file_path: b.file_path, notes: 'Initial upload' })
  await logActivity(c.sb, c.userId, { actorEmail: c.email ?? undefined, action: 'uploaded_content', resourceType: 'campaign', resourceId: campaignId, meta: { title: b.title } })
  return NextResponse.json({ item: data })
}
