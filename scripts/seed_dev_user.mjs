// One-off: create a dev test user + profile so per-user features (white-label, ProvBot
// memory, support tickets) are testable on localhost. Reversible — see DELETE note below.
// Run from prov/: node scripts/seed_dev_user.mjs   (env sourced from .env.local by caller)
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing SUPABASE env'); process.exit(1) }

const sb = createClient(url, key, { auth: { persistSession: false } })

// Use the EXISTING auth user (the owner). The gap is a missing profiles row, not a missing user.
const { data: list, error: listErr } = await sb.auth.admin.listUsers()
if (listErr) { console.error('listUsers error:', JSON.stringify(listErr)); process.exit(1) }
const user = list?.users?.[0]
if (!user) { console.error('No auth users exist to attach a profile to.'); process.exit(1) }

// Create the missing profile for that user (upsert is safe if a trigger already made one).
const { error: upErr } = await sb.from('profiles').upsert(
  { id: user.id, email: user.email, access_type: 'lifetime' },
  { onConflict: 'id' },
)
if (upErr) { console.error('profile upsert error:', upErr.message); process.exit(1) }

console.log('PROFILE_READY for ' + user.email + ' (id ' + user.id.slice(0, 8) + '…)')
