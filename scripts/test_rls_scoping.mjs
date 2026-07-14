// §8.1 RLS self-test: verifies a client_viewer cannot read another client's rows.
// Run AFTER applying 0020_enterprise_foundation.sql:  node scripts/test_rls_scoping.mjs
// Uses the service role to build a fixture (org → workspace → 2 clients → 2 deals,
// viewer granted client A only), then queries as the viewer via the anon key and
// asserts client B is invisible. Cleans up after itself.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const viewerEmail = `rls-test-viewer-${Date.now()}@example.com`
const viewerPassword = `Rls-${crypto.randomUUID()}`
let failures = 0
const check = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) failures++ }

// ── Fixture ──────────────────────────────────────────────────────────
const { data: viewer, error: userErr } = await svc.auth.admin.createUser({
  email: viewerEmail, password: viewerPassword, email_confirm: true,
})
if (userErr) { console.error('fixture user failed:', userErr.message); process.exit(1) }

const { data: org } = await svc.from('organizations').insert({ name: 'RLS Test Org' }).select().single()
const { data: ws } = await svc.from('workspaces').insert({ org_id: org.id, name: 'RLS Test WS' }).select().single()
const { data: clientA } = await svc.from('clients').insert({ workspace_id: ws.id, name: 'Client A' }).select().single()
const { data: clientB } = await svc.from('clients').insert({ workspace_id: ws.id, name: 'Client B' }).select().single()
const { data: member } = await svc.from('workspace_members')
  .insert({ workspace_id: ws.id, user_id: viewer.user.id, role: 'client_viewer', status: 'active' }).select().single()
await svc.from('member_client_access').insert({ member_id: member.id, client_id: clientA.id })
const { data: dealA } = await svc.from('deals')
  .insert({ workspace_id: ws.id, client_id: clientA.id, name: 'Deal A', stage: 'live' }).select().single()
const { data: dealB } = await svc.from('deals')
  .insert({ workspace_id: ws.id, client_id: clientB.id, name: 'Deal B', stage: 'live' }).select().single()

// ── Act as the viewer through the anon key (RLS enforced) ───────────
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { error: signInErr } = await anon.auth.signInWithPassword({ email: viewerEmail, password: viewerPassword })
if (signInErr) { console.error('viewer sign-in failed:', signInErr.message); process.exit(1) }

const { data: visClients } = await anon.from('clients').select('id, name')
const clientIds = new Set((visClients ?? []).map(c => c.id))
check('viewer sees granted Client A', clientIds.has(clientA.id))
check('viewer does NOT see Client B', !clientIds.has(clientB.id))

const { data: visDeals } = await anon.from('deals').select('id, name')
const dealIds = new Set((visDeals ?? []).map(d => d.id))
check('viewer sees Client A deal', dealIds.has(dealA.id))
check('viewer does NOT see Client B deal', !dealIds.has(dealB.id))

const { error: writeErr } = await anon.from('deals')
  .update({ name: 'hacked' }).eq('id', dealA.id)
const { data: afterWrite } = await svc.from('deals').select('name').eq('id', dealA.id).single()
check('viewer cannot write deals', afterWrite.name === 'Deal A' || Boolean(writeErr))

const { data: visAudit } = await anon.from('audit_log').select('id').limit(1)
check('viewer cannot read audit_log', (visAudit ?? []).length === 0)

const { data: visDemo } = await anon.from('demo_requests').select('id').limit(1)
check('authenticated user cannot read demo_requests', (visDemo ?? []).length === 0)

// ── Cleanup ──────────────────────────────────────────────────────────
await svc.from('organizations').delete().eq('id', org.id) // cascades ws→clients→deals→members
await svc.auth.admin.deleteUser(viewer.user.id)

console.log(failures === 0 ? '\nAll RLS scoping checks passed.' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
