// One-off: create the private 'reports' Storage bucket for saved PDF reports.
// Run from prov/: node scripts/create_reports_bucket.mjs   (SUPABASE env sourced by caller)
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing SUPABASE env'); process.exit(1) }

const sb = createClient(url, key, { auth: { persistSession: false } })
const { data, error } = await sb.storage.createBucket('reports', {
  public: false,
  fileSizeLimit: '20MB',
  allowedMimeTypes: ['application/pdf'],
})
if (error) {
  if (/already exists/i.test(error.message)) { console.log("bucket 'reports' already exists ✓"); process.exit(0) }
  console.error('createBucket error:', error.message); process.exit(1)
}
console.log("bucket 'reports' created ✓", data?.name ?? '')
