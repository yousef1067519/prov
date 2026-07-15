import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/apiUser'
import { generateNextQueuedPost } from '@/lib/blogGen'

// Daily blog writer. Hit once a day by Vercel Cron (vercel.json): takes the next
// queued topic from blog_topics and writes one article. Drafts by default —
// set BLOG_AUTOPUBLISH=true to publish without review.
export const maxDuration = 120 // article generation can exceed the default 10s

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization') ?? ''
  const manual = req.headers.get('x-cron-secret') ?? ''
  if (!secret || (auth !== `Bearer ${secret}` && manual !== secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ ok: false, skipped: 'DEEPSEEK_API_KEY not set' })
  }

  try {
    const post = await generateNextQueuedPost(serviceClient())
    if (!post) return NextResponse.json({ ok: true, generated: 0, note: 'topic queue empty' })
    return NextResponse.json({ ok: true, generated: 1, slug: post.slug, published: post.published })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 300) }, { status: 500 })
  }
}
