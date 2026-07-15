import { createClient } from '@supabase/supabase-js'
import { SITE_URL, BLOG_BASE_PATH } from '../constants'
import { slugify } from '../format'
import type { BlogArticle, BlogArticleSummary, BlogSitemapEntry } from '../types'

// Self-hosted blog data client (blog_posts table, 0028) — replaces the
// babylovegrowth-next-js-blog API client with our own Supabase reads.
// Server-only: uses the service role; published-only filters are applied here.

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder',
    { auth: { persistSession: false } },
  )
}

const SUMMARY_COLS = 'id, slug, title, meta_description, hero_image_url, created_at'

type PostRow = BlogArticleSummary & {
  content_html: string
  keywords: string[] | null
  seed_keyword: string | null
  published: boolean
  updated_at: string
}

function toArticle(row: PostRow): BlogArticle {
  const canonical = SITE_URL ? `${SITE_URL}${BLOG_BASE_PATH}/${row.slug}` : undefined
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    meta_description: row.meta_description,
    hero_image_url: row.hero_image_url,
    created_at: row.created_at,
    content_html: row.content_html,
    keywords: row.keywords ?? [],
    seedKeyword: row.seed_keyword,
    published: row.published,
    updated_at: row.updated_at,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: row.title,
      description: row.meta_description ?? undefined,
      datePublished: row.created_at,
      dateModified: row.updated_at,
      ...(row.hero_image_url ? { image: row.hero_image_url } : {}),
      ...(canonical ? { mainEntityOfPage: canonical, url: canonical } : {}),
      author: { '@type': 'Organization', name: 'Prov', url: SITE_URL || undefined },
      publisher: { '@type': 'Organization', name: 'Prov', url: SITE_URL || undefined },
    },
    faqJsonLd: null,
  }
}

export const blog = {
  async getAllArticles(): Promise<BlogArticleSummary[]> {
    const { data } = await db()
      .from('blog_posts')
      .select(SUMMARY_COLS)
      .eq('published', true)
      .order('created_at', { ascending: false })
    return (data as BlogArticleSummary[]) ?? []
  },

  async getArticleBySlug(slug: string): Promise<BlogArticle | null> {
    const { data } = await db()
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle()
    return data ? toArticle(data as PostRow) : null
  },

  async getArticlesByTag(tagSlug: string): Promise<BlogArticleSummary[]> {
    // Small catalog: fetch published posts with keywords and filter by slugified keyword.
    const { data } = await db()
      .from('blog_posts')
      .select(`${SUMMARY_COLS}, keywords, seed_keyword`)
      .eq('published', true)
      .order('created_at', { ascending: false })
    const rows = (data as (BlogArticleSummary & { keywords: string[] | null; seed_keyword: string | null })[]) ?? []
    return rows
      .filter(r => [r.seed_keyword ?? '', ...(r.keywords ?? [])].some(k => slugify(k) === tagSlug))
      .map(({ id, slug, title, meta_description, hero_image_url, created_at }) => (
        { id, slug, title, meta_description, hero_image_url, created_at }
      ))
  },

  async getSitemapEntries(): Promise<BlogSitemapEntry[]> {
    const { data } = await db()
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
    return (data as BlogSitemapEntry[]) ?? []
  },
}
