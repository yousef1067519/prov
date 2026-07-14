import { NextRequest, NextResponse } from 'next/server'
import { apiCtx, serviceClient } from '@/lib/apiUser'

const BUCKET = 'campaign-content'

// POST { campaignId, filename } → a one-time signed URL the browser uploads the file to
// directly (keeps large files off the API/serverless body-size limit).
export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { campaignId, filename } = await req.json().catch(() => ({}))
  if (!campaignId || !filename) return NextResponse.json({ error: 'campaignId and filename required' }, { status: 400 })

  const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
  const path = `${ctx.userId}/${campaignId}/${crypto.randomUUID()}-${safe}`
  const { data, error } = await serviceClient().storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ path: data.path, token: data.token })
}
