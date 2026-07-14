import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { fetchYouTubeMetrics } from '@/lib/youtubeMetrics'

// POST /api/performance/youtube-metrics { url } — server-side auto-pull
// (the Google token lives in an httpOnly cookie, so this can't run client-side).
export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json().catch(() => ({}))
  if (!url) return NextResponse.json({ error: 'Provide a YouTube url' }, { status: 400 })

  const metrics = await fetchYouTubeMetrics(String(url))
  if (!metrics) {
    return NextResponse.json({ error: 'Could not fetch metrics for that link — enter them manually.' }, { status: 422 })
  }
  return NextResponse.json({ ok: true, metrics })
}
