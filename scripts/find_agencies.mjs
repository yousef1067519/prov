// Lead finder: influencer marketing agencies (IMAs) + business phone numbers, for
// sales cold-calling. Uses the Google Places API (New) Text Search — a ToS-compliant,
// structured source that returns each business's public name, phone, website, and
// address. No HTML scraping, no brittle selectors.
//
// SETUP (one time):
//   1. Google Cloud console → enable "Places API (New)" and create an API key.
//      https://console.cloud.google.com/apis/library/places.googleapis.com
//      (Google gives $200/mo free credit; a full run here costs cents.)
//   2. Add to prov/.env.local:   GOOGLE_PLACES_API_KEY=your_key_here
//
// RUN (from prov/):   node scripts/find_agencies.mjs
//   Output: scripts/leads_agencies.csv  (open in Excel/Sheets, sort, start dialing)
//
// COLD-CALLING NOTE: these are public *business* listings, fine for B2B outreach.
// Before calling US numbers at scale, scrub against the National DNC where it applies
// and honor any "do not call" request on first contact. Nothing here auto-dials.
//
// Tune the CITIES and QUERIES arrays below to your market.

import { readFileSync, writeFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const KEY = env.GOOGLE_PLACES_API_KEY
if (!KEY) {
  console.error(
    'Missing GOOGLE_PLACES_API_KEY in .env.local.\n' +
    'Enable "Places API (New)" at\n' +
    '  https://console.cloud.google.com/apis/library/places.googleapis.com\n' +
    'create an API key, then add:  GOOGLE_PLACES_API_KEY=your_key_here',
  )
  process.exit(1)
}

// --- Tune these to your target market ---------------------------------------
const QUERIES = [
  'influencer marketing agency',
  'creator management agency',
  'UGC agency',
  'talent agency for influencers',
  'social media marketing agency',
]
const CITIES = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Miami, FL', 'Austin, TX',
  'San Francisco, CA', 'Atlanta, GA', 'Dallas, TX', 'Seattle, WA', 'Boston, MA',
  'London, UK', 'Toronto, Canada', 'Sydney, Australia', 'Dubai, UAE',
]
const PAGES_PER_SEARCH = 2   // 20 results/page, up to 3 (Places caps text search at 60)
const OUT = new URL('./leads_agencies.csv', import.meta.url)
// ----------------------------------------------------------------------------

const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress',
  'places.nationalPhoneNumber', 'places.internationalPhoneNumber',
  'places.websiteUri', 'places.rating', 'places.userRatingCount',
  'places.googleMapsUri', 'places.businessStatus',
  'nextPageToken',
].join(',')

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function searchText(textQuery, pageToken) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({ textQuery, pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Places API ${res.status}: ${detail.slice(0, 300)}`)
  }
  return res.json()
}

const byId = new Map()   // dedupe: an agency can match multiple query×city combos

for (const city of CITIES) {
  for (const q of QUERIES) {
    const textQuery = `${q} in ${city}`
    let pageToken
    for (let page = 0; page < PAGES_PER_SEARCH; page++) {
      let data
      try {
        data = await searchText(textQuery, pageToken)
      } catch (e) {
        console.error(`  ! ${textQuery} (page ${page + 1}): ${e.message}`)
        break
      }
      const places = data.places ?? []
      let added = 0
      for (const p of places) {
        if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue
        if (byId.has(p.id)) continue
        byId.set(p.id, {
          name: p.displayName?.text ?? '',
          phone: p.nationalPhoneNumber || p.internationalPhoneNumber || '',
          website: p.websiteUri ?? '',
          searched_market: city,
          matched_query: q,
          address: p.formattedAddress ?? '',
          rating: p.rating ?? '',
          reviews: p.userRatingCount ?? '',
          maps_url: p.googleMapsUri ?? '',
        })
        added++
      }
      console.log(`  ${textQuery} — page ${page + 1}: +${added} (total ${byId.size})`)
      pageToken = data.nextPageToken
      if (!pageToken) break
      await sleep(1200)   // let the page token settle + stay polite to the API
    }
  }
}

// CSV — quote every field and escape embedded quotes so phones/addresses can't break rows.
const cols = ['name', 'phone', 'website', 'searched_market', 'matched_query', 'address', 'rating', 'reviews', 'maps_url']
const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
const rows = [...byId.values()]
// Callable leads (have a phone) first, then by review count as a rough size/legitimacy proxy.
rows.sort((a, b) => (b.phone ? 1 : 0) - (a.phone ? 1 : 0) || (Number(b.reviews) || 0) - (Number(a.reviews) || 0))

const csv = [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n')
writeFileSync(OUT, csv, 'utf8')

const withPhone = rows.filter(r => r.phone).length
console.log(`\nDone. ${rows.length} unique agencies (${withPhone} with a phone number).`)
console.log(`Wrote ${OUT.pathname.replace(/^\//, '')}`)
