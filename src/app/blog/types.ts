// Blog types — self-hosted (backed by the blog_posts table, 0028). Previously
// re-exported from the babylovegrowth-next-js-blog package.

export interface BlogArticleSummary {
  id: string
  slug: string
  title: string
  meta_description: string | null
  hero_image_url: string | null
  created_at: string
}

export interface BlogArticle extends BlogArticleSummary {
  content_html: string
  keywords: string[]
  seedKeyword: string | null
  published: boolean
  updated_at: string
  jsonLd: Record<string, unknown> | null
  faqJsonLd: Record<string, unknown> | null
}

export interface BlogTag {
  slug: string
  name: string
}

export interface BlogSitemapEntry {
  slug: string
  updated_at: string
}
