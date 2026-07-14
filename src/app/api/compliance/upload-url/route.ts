import { NextRequest, NextResponse } from 'next/server'
import { apiCtx, serviceClient } from '@/lib/apiUser'

const BUCKET = 'compliance-proofs' // PRIVATE bucket — proof of FTC disclosure per deliverable

// POST { disclosureId, filename } → one-time signed upload URL (same pattern
// as campaign-content). Path is workspace-scoped so proofs never mix tenants.
export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { disclosureId, filename } = await req.json().catch(() => ({}))
  if (!disclosureId || !filename) return NextResponse.json({ error: 'disclosureId and filename required' }, { status: 400 })

  const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
  const path = `${ctx.workspaceId}/${disclosureId}/${crypto.randomUUID()}-${safe}`
  const { data, error } = await serviceClient().storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ path: data.path, token: data.token })
}

// GET ?path= → short-lived signed view URL for a stored proof.
export async function GET(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const path = req.nextUrl.searchParams.get('path')
  if (!path || !path.startsWith(`${ctx.workspaceId}/`)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
  }
  const { data, error } = await serviceClient().storage.from(BUCKET).createSignedUrl(path, 600)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ url: data.signedUrl })
}
