// Pull public YouTube video stats for a pasted link (watch, youtu.be, or Shorts).
// Public statistics need only an API key; falls back to the user's connected
// Google OAuth token when no key is configured.

import { getGoogleAccess } from './google'

export function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/shorts/')[1]?.split('/')[0] ?? null
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/embed/')[1]?.split('/')[0] ?? null
      return u.searchParams.get('v')
    }
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0] || null
  } catch { /* not a url */ }
  return null
}

function parseISODuration(duration: string): number {
  const m = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  return (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + (Number(m[3]) || 0)
}

export async function fetchYouTubeMetrics(videoUrl: string): Promise<{
  views: number
  likes: number
  comments: number
  watch_time_seconds: number
  video_id: string
  channel_id: string | null
  title: string | null
  thumbnail: string | null
} | null> {
  const videoId = extractVideoId(videoUrl)
  if (!videoId) return null

  try {
    const params = new URLSearchParams({ part: 'statistics,contentDetails,snippet', id: videoId })
    const headers: Record<string, string> = {}
    if (process.env.YOUTUBE_API_KEY) {
      params.set('key', process.env.YOUTUBE_API_KEY)
    } else {
      const access = await getGoogleAccess().catch(() => null)
      if (!access?.token) return null
      headers.Authorization = `Bearer ${access.token}`
    }

    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`, { headers })
    if (!res.ok) return null
    const data = await res.json()
    const item = data.items?.[0]
    if (!item) return null

    const stats = item.statistics ?? {}
    return {
      views: parseInt(stats.viewCount || '0', 10),
      likes: parseInt(stats.likeCount || '0', 10),
      comments: parseInt(stats.commentCount || '0', 10),
      watch_time_seconds: parseISODuration(item.contentDetails?.duration || 'PT0S'),
      video_id: videoId,
      channel_id: item.snippet?.channelId ?? null,
      title: item.snippet?.title ?? null,
      thumbnail: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url ?? null,
    }
  } catch (err) {
    console.error('YouTube metrics fetch failed:', err)
    return null
  }
}
