// Tracks whether a specific user has completed the activation flow (launched a
// first campaign). Keyed per-account so testing different logins in the same
// browser each start fresh. Stored in localStorage + a keyed cookie.

const BASE = 'prov_onboarded'
const keyFor = (user?: string) => `${BASE}:${(user || 'anon').toLowerCase()}`

export function isOnboarded(user?: string): boolean {
  if (typeof document === 'undefined') return true
  const k = keyFor(user)
  if (document.cookie.split('; ').some(c => c.startsWith(k + '='))) return true
  try { return localStorage.getItem(k) === '1' } catch { return false }
}

export function markOnboarded(user?: string) {
  const k = keyFor(user)
  try {
    localStorage.setItem(k, '1')
    document.cookie = `${k}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  } catch {}
}
