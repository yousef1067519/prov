import type { Influencer } from './types'

// Bundled sample creators so Creator Discovery works before the Supabase
// `creators` table is seeded. Deterministic (no random) to avoid hydration drift.
const NICHES = ['Tech', 'Gaming', 'Finance', 'Beauty', 'Fitness', 'Food', 'Fashion', 'Travel', 'Education', 'Business', 'Lifestyle']
const PLATFORMS = ['YouTube', 'TikTok', 'Instagram', 'Twitch', 'LinkedIn']
const COUNTRIES = ['USA', 'Canada', 'UK', 'Australia', 'Germany', 'France', 'Brazil', 'India']
const FIRST = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery', 'Quinn', 'Drew', 'Skyler', 'Cameron', 'Hayden', 'Parker', 'Reese']
const LAST = ['Martin', 'Allen', 'Brooks', 'Vance', 'Sharma', 'Kim', 'Lopez', 'Okafor', 'Rossi', 'Nguyen', 'Walsh', 'Bauer', 'Costa', 'Singh', 'Reed', 'Pearce']
const SUFFIX = ['Pro', 'HQ', 'Daily', 'Labs', 'Academy', 'Central', 'Studio', 'Live']

function build(): Influencer[] {
  const out: Influencer[] = []
  let n = 0
  for (let ni = 0; ni < NICHES.length; ni++) {
    for (let k = 0; k < 8; k++, n++) {
      const first = FIRST[n % FIRST.length]
      const last = LAST[(n * 3) % LAST.length]
      const subscribers = 60000 + ((n * 37) % 940) * 1000
      const avg_views = Math.round(subscribers * (0.05 + (n % 5) * 0.02))
      const engagement_rate = Number((3 + (n % 12) + ((n % 3) * 0.3)).toFixed(1))
      out.push({
        id: `sample-${n}`,
        name: `${first} ${last} ${SUFFIX[n % SUFFIX.length]}`,
        niche: NICHES[ni],
        platform: PLATFORMS[n % PLATFORMS.length],
        subscribers,
        avg_views,
        engagement_rate,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@${SUFFIX[n % SUFFIX.length].toLowerCase()}.co`,
        country: COUNTRIES[n % COUNTRIES.length],
        created_at: new Date().toISOString(),
      })
    }
  }
  return out
}

export const SAMPLE_CREATORS: Influencer[] = build()
