import type { SupabaseClient } from '@supabase/supabase-js'

// Per-user ProvBot memory. Matches the user_memory table (one row per user, RLS owner-only).
export type Tone = 'formal' | 'casual'
export type ResponseLength = 'short' | 'detailed'
export interface UserMemory {
  profile: { name?: string; preferences?: { tone?: Tone; responseLength?: ResponseLength } }
  history_summary: string
  facts: { key: string; value: string; timestamp: string }[]
}

const EMPTY: UserMemory = { profile: {}, history_summary: '', facts: [] }

export async function loadMemory(sb: SupabaseClient, userId: string): Promise<UserMemory> {
  const { data } = await sb
    .from('user_memory')
    .select('profile, history_summary, facts')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return structuredClone(EMPTY)
  return {
    profile: (data.profile as UserMemory['profile']) ?? {},
    history_summary: (data.history_summary as string) ?? '',
    facts: (data.facts as UserMemory['facts']) ?? [],
  }
}

export async function saveMemory(sb: SupabaseClient, userId: string, mem: UserMemory): Promise<void> {
  await sb.from('user_memory').upsert(
    {
      user_id: userId,
      profile: mem.profile,
      history_summary: mem.history_summary,
      facts: mem.facts,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
}

// Never persist secrets/sensitive data (per the spec's DO NOT STORE list).
const SENSITIVE = /\b(password|passwd|api[\s-]?key|secret|token|ssn|credit\s?card|cvv|bank)\b/i

/**
 * Deterministic, no-LLM extraction of long-term-useful info from a user message.
 * Keeps memory updates cheap and predictable. Returns updated memory + whether it changed.
 */
export function applyMemoryUpdates(message: string, mem: UserMemory): { mem: UserMemory; changed: boolean } {
  let changed = false
  const next: UserMemory = {
    profile: { ...mem.profile, preferences: { ...mem.profile.preferences } },
    history_summary: mem.history_summary,
    facts: [...mem.facts],
  }
  const prefs = next.profile.preferences!

  const name = message.match(/\b(?:my name is|i am|i'm|call me)\s+([A-Z][a-zA-Z]{1,20})/)
  if (name && next.profile.name !== name[1]) { next.profile.name = name[1]; changed = true }

  const aboutReplies = /\b(answer|answers|response|responses|repl|keep it)\b/i.test(message)
  if (aboutReplies && /\b(short|brief|concise|quick)\b/i.test(message)) {
    if (prefs.responseLength !== 'short') { prefs.responseLength = 'short'; changed = true }
  } else if (aboutReplies && /\b(detailed|thorough|in[-\s]?depth|long|comprehensive)\b/i.test(message)) {
    if (prefs.responseLength !== 'detailed') { prefs.responseLength = 'detailed'; changed = true }
  }

  const aboutTone = /\b(tone|style|prefer|sound)\b/i.test(message)
  if (aboutTone && /\b(formal|professional)\b/i.test(message)) {
    if (prefs.tone !== 'formal') { prefs.tone = 'formal'; changed = true }
  } else if (aboutTone && /\b(casual|friendly|relaxed|informal)\b/i.test(message)) {
    if (prefs.tone !== 'casual') { prefs.tone = 'casual'; changed = true }
  }

  const remember = message.match(/\bremember (?:that )?(.{4,140})/i)
  if (remember && !SENSITIVE.test(remember[1])) {
    const value = remember[1].trim().replace(/[.!?]+$/, '')
    if (!next.facts.some(f => f.value.toLowerCase() === value.toLowerCase())) {
      const key = value.toLowerCase().split(/\s+/).slice(0, 4).join('-')
      next.facts.push({ key, value, timestamp: new Date().toISOString() })
      if (next.facts.length > 50) next.facts = next.facts.slice(-50) // cap growth
      changed = true
    }
  }

  if (next.profile.preferences && Object.keys(next.profile.preferences).length === 0) delete next.profile.preferences
  return { mem: next, changed }
}

/** Compact memory block for the system prompt. */
export function memoryToPrompt(mem: UserMemory): string {
  const lines: string[] = []
  if (mem.profile.name) lines.push(`User's name: ${mem.profile.name}`)
  if (mem.profile.preferences?.tone) lines.push(`Preferred tone: ${mem.profile.preferences.tone}`)
  if (mem.profile.preferences?.responseLength) lines.push(`Preferred response length: ${mem.profile.preferences.responseLength}`)
  if (mem.history_summary) lines.push(`Context summary: ${mem.history_summary}`)
  if (mem.facts.length) lines.push(`Known facts about the user:\n${mem.facts.slice(-15).map(f => `- ${f.value}`).join('\n')}`)
  return lines.length ? lines.join('\n') : 'No stored memory yet.'
}
