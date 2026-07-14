// One-off: create the private 'campaign-content' Storage bucket for UGC files.
// Run from prov/: node scripts/create_content_bucket.mjs   (SUPABASE env sourced by caller)
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing SUPABASE env'); process.exit(1) }

const sb = createClient(url, key, { auth: { persistSession: false } })
// Free Supabase plans cap per-file uploads at 50MB. Larger UGC videos need a paid plan
// (raise the global limit in Project Settings → Storage) or an external store.
const { data, error } = await sb.storage.createBucket('campaign-content', {
  public: false,
  fileSizeLimit: '50MB',
})
if (error) {
  if (/already exists/i.test(error.message)) { console.log("bucket 'campaign-content' already exists ✓"); process.exit(0) }
  console.error('createBucket error:', error.message); process.exit(1)
}
console.log("bucket 'campaign-content' created ✓", data?.name ?? '')
