import { NextRequest, NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'
import { aiChat, aiEnabled } from '@/lib/claude'

// POST { url } — quick-add a contact from a social profile URL.
// Platform + handle are parsed deterministically from the URL (no scraping —
// Instagram/TikTok block server-side fetches anyway). Niche is a best-effort AI
// guess from the handle text alone, clearly optional. Inserts into the
// workspace-private contacts table with the same dedupe rule as bulk import.

const PATTERNS: Array<{ platform: string; re: RegExp }> = [
  { platform: 'Instagram', re: /instagram\.com\/([A-Za-z0-9._]{2,30})/ },
  { platform: 'TikTok', re: /tiktok\.com\/@([A-Za-z0-9._]{2,24})/ },
  { platform: 'YouTube', re: /youtube\.com\/@([A-Za-z0-9._-]{2,30})/ },
  { platform: 'Twitch', re: /twitch\.tv\/([A-Za-z0-9_]{2,25})/ },
  { platform: 'Twitter/X', re: /(?:twitter|x)\.com\/([A-Za-z0-9_]{2,15})/ },
]
const NOT_HANDLES = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'watch', 'channel', 'shorts', 'video', 'hashtag', 'search', 'home', 'i', 'intent'])

export async function POST(req: NextRequest) {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.workspaceId) return NextResponse.json({ error: 'No workspace is attached to your account yet.' }, { status: 400 })

  const b = await req.json().catch(() => ({}))
  const url = String(b.url ?? '').trim().slice(0, 300)
  if (!url) return NextResponse.json({ error: 'Paste a profile URL first.' }, { status: 400 })

  let platform: string | null = null
  let handle: string | null = null
  for (const p of PATTERNS) {
    const m = url.match(p.re)
    if (m && !NOT_HANDLES.has(m[1].toLowerCase())) { platform = p.platform; handle = m[1]; break }
  }
  if (!platform || !handle) {
    return NextResponse.json({ error: 'Couldn’t read a profile from that URL. Paste a link like instagram.com/creator, tiktok.com/@creator, or youtube.com/@creator.' }, { status: 400 })
  }

  // Dedupe: same rule as bulk import (handle, else name — here handle always exists).
  const { data: existing } = await ctx.sb
    .from('contacts').select('id, name').eq('workspace_id', ctx.workspaceId).ilike('handle', handle).limit(1).maybeSingle()
  if (existing) {
    return NextResponse.json({ error: `@${handle} is already in your contacts (${existing.name}).` }, { status: 409 })
  }

  // Readable name from the handle: "fit.with.mia" -> "Fit With Mia".
  const name = handle.replace(/[._-]+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase()) || handle

  // Best-effort niche guess from the handle text only — never blocks the add.
  let niche: string | null = null
  if (aiEnabled()) {
    try {
      const out = await aiChat({
        maxTokens: 10,
        messages: [{
          role: 'user',
          content: `A creator's ${platform} handle is "@${handle}". If the handle text clearly suggests a content niche, answer with ONE word from: Tech, Beauty, Fitness, Gaming, Food, Travel, Finance, Fashion, Lifestyle, Business, Education. If it's not clear, answer exactly: none`,
        }],
      })
      const guess = out.trim().split(/\s/)[0]
      if (/^(Tech|Beauty|Fitness|Gaming|Food|Travel|Finance|Fashion|Lifestyle|Business|Education)$/i.test(guess)) {
        niche = guess[0].toUpperCase() + guess.slice(1).toLowerCase()
      }
    } catch { /* niche stays null */ }
  }

  const { data, error } = await ctx.sb.from('contacts').insert({
    workspace_id: ctx.workspaceId,
    name,
    handle,
    platform,
    niche,
    source: 'url',
  }).select('id, name, handle, platform, niche, followers, email, notes, created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, contact: data })
}
