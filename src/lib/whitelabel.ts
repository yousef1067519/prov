'use client'

import { useEffect, useState } from 'react'

export interface WhiteLabel {
  enabled: boolean
  name: string          // brand name shown instead of "Prov"
  logo: string          // data URL
  primary: string       // hex
  accent: string        // hex
  footer: string
  domain: string
}

export const WHITELABEL_KEY = 'prov_whitelabel'

export const DEFAULT_WL: WhiteLabel = {
  enabled: false,
  name: 'Prov',
  logo: '',
  primary: '#FFD700',
  accent: '#CA8A04',
  footer: '',
  domain: '',
}

// Source of truth is the DB (profiles via /api/settings/white-label). localStorage is only
// a synchronous cache so the PDF generator (loadWhiteLabel) and first paint stay instant.
export function loadWhiteLabel(): WhiteLabel {
  if (typeof window === 'undefined') return DEFAULT_WL
  try { return { ...DEFAULT_WL, ...JSON.parse(localStorage.getItem(WHITELABEL_KEY) || '{}') } } catch { return DEFAULT_WL }
}

/** Write the local cache + notify listeners. Does NOT hit the DB (use pushWhiteLabel for that). */
export function saveWhiteLabel(wl: WhiteLabel) {
  try {
    localStorage.setItem(WHITELABEL_KEY, JSON.stringify(wl))
    window.dispatchEvent(new Event('whitelabel-change'))
  } catch {}
}

/** Fetch the persisted config from the DB and refresh the local cache. */
export async function fetchWhiteLabel(): Promise<WhiteLabel> {
  try {
    const res = await fetch('/api/settings/white-label')
    const data = await res.json()
    const wl = { ...DEFAULT_WL, ...(data.whiteLabel ?? {}) } as WhiteLabel
    saveWhiteLabel(wl)
    return wl
  } catch {
    return loadWhiteLabel()
  }
}

/** Persist to the DB, then update the local cache. */
export async function pushWhiteLabel(wl: WhiteLabel): Promise<boolean> {
  try {
    const res = await fetch('/api/settings/white-label', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(wl),
    })
    if (!res.ok) return false
    saveWhiteLabel(wl)
    return true
  } catch { return false }
}

/** Live white-label config: instant paint from cache, then refreshed from the DB. */
export function useWhiteLabel(): WhiteLabel {
  const [wl, setWl] = useState<WhiteLabel>(DEFAULT_WL)
  useEffect(() => {
    setWl(loadWhiteLabel())                 // instant from cache
    fetchWhiteLabel().then(setWl)           // then DB is authoritative
    const read = () => setWl(loadWhiteLabel())
    window.addEventListener('whitelabel-change', read)
    window.addEventListener('storage', read)
    return () => { window.removeEventListener('whitelabel-change', read); window.removeEventListener('storage', read) }
  }, [])
  return wl
}

/** hex (#rrggbb) → [r,g,b] for jsPDF. */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
