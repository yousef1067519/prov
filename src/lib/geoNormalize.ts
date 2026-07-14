// Normalizes scraped country/language values to the canonical forms the search
// dropdowns use (src/lib/geo.ts), so filters actually match the data.

const COUNTRY_ALIASES: Record<string, string> = {
  'usa': 'United States', 'us': 'United States', 'u.s.': 'United States', 'u.s.a.': 'United States',
  'united states of america': 'United States', 'america': 'United States',
  'uk': 'United Kingdom', 'u.k.': 'United Kingdom', 'great britain': 'United Kingdom',
  'britain': 'United Kingdom', 'england': 'United Kingdom',
  'uae': 'United Arab Emirates', 'u.a.e.': 'United Arab Emirates',
  'korea': 'South Korea', 'south korea': 'South Korea',
  'russia': 'Russia', 'russian federation': 'Russia',
}

/** Canonical country name, or null when unknown/empty. */
export function normalizeCountry(raw: unknown): string | null {
  const s = String(raw ?? '').trim()
  if (!s || /^unknown$/i.test(s) || s === '-' || s === 'N/A') return null
  return COUNTRY_ALIASES[s.toLowerCase()] ?? s
}

// Country → primary language (mirrors the seed backfill).
const COUNTRY_LANG: Record<string, string> = {}
const add = (lang: string, countries: string[]) => countries.forEach(c => (COUNTRY_LANG[c] = lang))
add('English', ['United States', 'United Kingdom', 'Canada', 'Australia', 'Ireland', 'New Zealand', 'South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Singapore', 'Philippines', 'United Arab Emirates'])
add('German', ['Germany', 'Austria', 'Switzerland'])
add('French', ['France', 'Belgium'])
add('Spanish', ['Spain', 'Mexico', 'Argentina', 'Colombia', 'Chile', 'Peru', 'Venezuela', 'Ecuador'])
add('Portuguese', ['Brazil', 'Portugal'])
add('Italian', ['Italy'])
add('Dutch', ['Netherlands'])
add('Japanese', ['Japan'])
add('Korean', ['South Korea'])
add('Hindi', ['India'])
add('Mandarin Chinese', ['China', 'Taiwan', 'Hong Kong'])
add('Russian', ['Russia'])
add('Arabic', ['Saudi Arabia', 'Egypt', 'Qatar'])
add('Turkish', ['Turkey'])
add('Indonesian', ['Indonesia'])
add('Vietnamese', ['Vietnam'])
add('Swedish', ['Sweden'])
add('Polish', ['Poland'])

/** Infer a language from a (canonical) country; null if unknown. */
export function languageFromCountry(country: string | null): string | null {
  if (!country) return null
  return COUNTRY_LANG[country] ?? null
}
