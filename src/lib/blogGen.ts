import type { SupabaseClient } from '@supabase/supabase-js'
import { aiChat } from './claude'

// AI blog article generation (self-hosted Babylovegrowth replacement).
// Writes a full SEO article for a topic and saves it to blog_posts as a draft
// (or published when BLOG_AUTOPUBLISH=true). Costs pennies per article on
// deepseek-chat vs the subscription it replaces.

function slugify(value: string): string {
  return value.toLowerCase().normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export interface GeneratedPost {
  id: string
  slug: string
  title: string
  published: boolean
}

export async function generateBlogPost(sb: SupabaseClient, topic: string): Promise<GeneratedPost> {
  const raw = await aiChat({
    maxTokens: 4000,
    jsonMode: true,
    system:
      'You are the content writer for Prov (prov.agency), a platform influencer-marketing agencies use to run their whole deal pipeline: creator discovery, outreach, contracts, invoices, FTC compliance, and permanent deal intelligence. You write practical, specific, non-generic articles for agency founders and account managers. Write from real operational knowledge of how sponsorship deals work; include concrete examples, frameworks, and checklists. ' +
      'CRITICAL — do NOT fabricate statistics. Never cite a specific survey percentage, study, "X% of agencies", dollar figure, or "by [year], N%..." claim unless it is genuinely well-known common knowledge. Instead use hedged, honest language: "many agencies", "a common range is", "in our experience", "often". Fabricated stats presented as fact are worse than no stats. Return ONLY JSON.',
    messages: [{
      role: 'user',
      content: `Write a complete SEO blog article on: "${topic}"

Return this exact JSON shape:
{
  "title": "compelling, specific title under 65 characters",
  "meta_description": "search-optimized summary, 140-160 characters",
  "keywords": ["4-7 relevant keyword phrases"],
  "content_html": "the full article as clean HTML"
}

content_html rules:
- 1200-1800 words. Use <h2> for sections (5-8 of them), <h3> sparingly, <p>, <ul>/<ol>, <strong>.
- NO <h1> (the page renders the title), no <html>/<head>/<body>, no inline styles, no images, no scripts.
- Open with a strong 2-3 sentence hook paragraph — no "In today's fast-paced world" filler.
- Practical and specific to influencer-marketing agencies. Include at least one checklist or numbered framework.
- End with a short section titled something natural (not "Conclusion") that mentions, in one sentence, that Prov (prov.agency) handles this workflow for agencies — subtle, not an ad.`,
    }],
  })

  let parsed: { title?: string; meta_description?: string; keywords?: string[]; content_html?: string }
  try {
    parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
  } catch {
    throw new Error('Model returned unparseable JSON for topic: ' + topic)
  }
  const title = String(parsed.title ?? topic).slice(0, 120)
  const content_html = String(parsed.content_html ?? '')
  if (content_html.length < 500) throw new Error('Generated article too short for topic: ' + topic)

  // Unique slug: append a counter if a post with this slug already exists.
  const base = slugify(title) || slugify(topic) || 'post'
  let slug = base
  for (let i = 2; i < 20; i++) {
    const { data: clash } = await sb.from('blog_posts').select('id').eq('slug', slug).maybeSingle()
    if (!clash) break
    slug = `${base}-${i}`
  }

  const publish = process.env.BLOG_AUTOPUBLISH === 'true'
  const { data, error } = await sb.from('blog_posts').insert({
    slug,
    title,
    meta_description: String(parsed.meta_description ?? '').slice(0, 200) || null,
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 8).map(k => String(k).slice(0, 80)) : [],
    seed_keyword: topic.slice(0, 200),
    content_html,
    published: publish,
    published_at: publish ? new Date().toISOString() : null,
  }).select('id, slug, title, published').single()
  if (error) throw new Error(error.message)
  return data as GeneratedPost
}

/** Pull the next queued topic, generate its article, and update the queue. */
export async function generateNextQueuedPost(sb: SupabaseClient): Promise<GeneratedPost | null> {
  const { data: next } = await sb
    .from('blog_topics')
    .select('id, topic')
    .eq('status', 'queued')
    .order('position')
    .limit(1)
    .maybeSingle()
  if (!next) return null

  await sb.from('blog_topics').update({ status: 'generating' }).eq('id', next.id)
  try {
    const post = await generateBlogPost(sb, next.topic)
    await sb.from('blog_topics').update({ status: 'done', error: null }).eq('id', next.id)
    return post
  } catch (e) {
    await sb.from('blog_topics').update({ status: 'failed', error: String(e).slice(0, 500) }).eq('id', next.id)
    throw e
  }
}
