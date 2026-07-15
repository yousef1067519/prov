import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, serviceClient } from '@/lib/admin'
import { generateBlogPost, generateNextQueuedPost } from '@/lib/blogGen'

// Admin-only blog management: list posts + topic queue, generate an article now,
// publish/unpublish, delete, and add topics to the queue.
export const maxDuration = 120

export async function GET() {
  if (!await getAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sb = serviceClient()
  const [{ data: posts }, { data: topics }] = await Promise.all([
    sb.from('blog_posts').select('id, slug, title, published, created_at, published_at').order('created_at', { ascending: false }).limit(200),
    sb.from('blog_topics').select('id, topic, status, position, error').order('position').limit(200),
  ])
  return NextResponse.json({ posts: posts ?? [], topics: topics ?? [] })
}

export async function POST(req: NextRequest) {
  if (!await getAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sb = serviceClient()
  const b = await req.json().catch(() => ({}))

  if (b.action === 'add_topic') {
    const topic = String(b.topic ?? '').trim().slice(0, 300)
    if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })
    const { data: last } = await sb.from('blog_topics').select('position').order('position', { ascending: false }).limit(1).maybeSingle()
    const { error } = await sb.from('blog_topics').insert({ topic, position: (last?.position ?? 0) + 1 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // action === 'generate' — custom topic, or the next queued one.
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ error: 'DEEPSEEK_API_KEY is not set (top up / configure DeepSeek first)' }, { status: 400 })
  }
  try {
    const topic = String(b.topic ?? '').trim()
    const post = topic
      ? await generateBlogPost(sb, topic.slice(0, 300))
      : await generateNextQueuedPost(sb)
    if (!post) return NextResponse.json({ error: 'Topic queue is empty — add a topic first' }, { status: 400 })
    return NextResponse.json({ ok: true, post })
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!await getAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const id = String(b.id ?? '')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const publish = b.action === 'publish'
  const { error } = await serviceClient().from('blog_posts').update({
    published: publish,
    published_at: publish ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!await getAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  const topicId = req.nextUrl.searchParams.get('topicId')
  const sb = serviceClient()
  if (id) {
    const { error } = await sb.from('blog_posts').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  if (topicId) {
    const { error } = await sb.from('blog_topics').delete().eq('id', topicId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'id or topicId required' }, { status: 400 })
}
