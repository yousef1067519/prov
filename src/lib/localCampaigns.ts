// Client-side campaign store. In dev-bypass the Supabase insert fails the
// auth.users FK, so saved campaigns live here and are merged into the lists
// that read /api/campaigns (Reports, Client Portal). Mirrors the app's
// "localStorage + best-effort API" pattern.

export interface SavedCampaign {
  id: string
  name: string
  niche?: string
  status?: string
  creator_ids?: string[]
  sponsor_ids?: string[]
  created_at?: string
}

export const CAMPAIGNS_KEY = 'prov_campaigns'

export function getLocalCampaigns(): SavedCampaign[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(CAMPAIGNS_KEY) || '[]') } catch { return [] }
}

export function saveLocalCampaign(c: SavedCampaign): SavedCampaign {
  const all = getLocalCampaigns()
  const i = all.findIndex(x => x.id === c.id)
  if (i >= 0) all[i] = { ...all[i], ...c }
  else all.unshift(c)
  try {
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(all))
    window.dispatchEvent(new Event('campaigns-change'))
  } catch {}
  return c
}

export function newCampaignId(): string {
  return 'camp-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/** Merge API campaigns with locally-saved ones, de-duped by id, newest first. */
export function mergeCampaigns<T extends { id: string; created_at?: string }>(api: T[], local: SavedCampaign[]): (T | SavedCampaign)[] {
  const ids = new Set(api.map(c => c.id))
  const merged: (T | SavedCampaign)[] = [...api, ...local.filter(c => !ids.has(c.id))]
  return merged.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
}
