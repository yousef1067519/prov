# ENTERPRISE_MIGRATION.md

Prov self-serve → enterprise repositioning. Living document: every route, page, and
table tagged KEEP / REWORK / REMOVE, plus a running log per workstream (§8 of the
rebuild prompt). Three pillars every decision serves: **institutional memory**,
**leverage per headcount**, **governance & scale**.

---

## 1. Pages (src/app)

| Page | Tag | Notes |
|---|---|---|
| `/` (landing) | REWORK | Credibility surface: case studies, security, ROI. Demote cinematic hero (§2); CTAs → /demo. |
| `/buy` | REMOVE | Self-serve checkout is dead. Route now redirects to `/demo`. |
| `/trial` | REMOVE | PLG mechanic. Redirects to `/demo`. |
| `/trial-ended` | REMOVE | Paywall upsell. Redirects to `/demo`. |
| `/demo` | **NEW** | Request-a-demo / gated application. Sales-led entry point. |
| `/security` | **NEW** (§8.10) | Data handling, RBAC, audit logs — the page enterprise buyers actually read. |
| `/login` | KEEP | Code-based login stays; accounts are admin-provisioned now. |
| `/onboarding` | REWORK | From "first win in minutes" to workspace/team setup. |
| `/dashboard` | REWORK | Rollup exec view; workspace + client scoping (§3 IA). |
| `/dashboard/performance` | REWORK → **Intelligence** | Flagship. §4.1. |
| `/dashboard/crm` | REWORK → **Pipeline** | Multi-stage deals CRM. §4.4. |
| `/dashboard/campaign`, `/campaign/[id]` | KEEP/REWORK | Scope under Client/Brand. |
| `/dashboard/discovery`, `/creators/[id]` | REWORK | Curated discovery + quality score + anti-collision. §4.2. |
| `/dashboard/templates` | REWORK | Workspace-level approved sequences. §4.3. |
| `/dashboard/contracts` | REWORK | Full lifecycle module. §5. |
| `/dashboard/invoices` | REWORK | Finance-grade engine. §6. |
| `/dashboard/compliance` | **NEW** | FTC module. §4.6. |
| `/dashboard/reports` | REWORK | Exec rollups + white-label. §4.5. |
| `/dashboard/team` | REWORK | Full RBAC roles + audit log. §4.7. |
| `/dashboard/settings` | KEEP/REWORK | Gains branding panel (drives reports/invoices/contracts headers). |
| `/dashboard/analytics`, `/workflows`, `/integrations`, `/portal` | KEEP | Workspace-scope them. |
| `/portal/[token]` (client portal) | KEEP | Becomes Client-Viewer surface; must be client-scoped (RLS). |
| `/admin` | KEEP | Internal ops; also where enterprise accounts are provisioned. |
| `/case-study/[slug]`, `/how-it-works`, `/privacy`, `/terms`, `/unsubscribe` | KEEP | Marketing/legal surfaces. |
| `/devlogin` | KEEP | Dev-only (already prod-blocked). |

## 2. API routes

| Route group | Tag | Notes |
|---|---|---|
| `api/trial/signup` | REMOVE | Deleted with the trial flow. |
| `api/stripe/checkout` | REMOVE | Self-serve checkout gone. Webhook + portal KEPT (existing subs + future invoicing rails). |
| `api/credits` | REMOVE | Tier credit metering was a PLG monetization mechanic (built 2026-07-11, same day — superseded). A flat deliverability throttle remains in `emails/send`. |
| `api/demo` | **NEW** | Stores demo requests (`demo_requests` table) + notifies via Resend. |
| `api/emails/send` | REWORK | Plan-gating stripped → flat deliverability throttle; workspace-scoped; sequences come from approved templates (§4.3). |
| `api/performance/*` | REWORK → Intelligence | Add search/query + rollups; records permanent + workspace-owned. |
| `api/creators/*` | REWORK | Quality/vetting fields, anti-collision checks on search. |
| `api/campaigns/*`, `api/outreach/*`, `api/followups`, `api/replies` | REWORK | Workspace + client scoping via tenant ctx. |
| `api/contracts/generate` | REWORK | Template library + merge fields + lifecycle (§5). |
| `api/invoices` | REWORK | Real engine: sequential numbers, status, tax fields (§6). |
| `api/compliance/*` | **NEW** | Disclosure requirements, proof uploads, flags (§4.6). |
| `api/reports/*` | REWORK | White-label branding from workspace settings. |
| `api/team/*` | REWORK | 5-role RBAC + per-client grants + audit log. |
| `api/settings/white-label` | KEEP | Extends into the branding panel. |
| `api/admin/*`, `api/support/*`, `api/provbot/*` | KEEP | Internal ops unchanged. |
| `api/integrations/google/*`, `api/cron/*`, `api/unsubscribe` | KEEP | Infra; cron sends respect workspace scoping via stored owner ids. |
| `api/dev/login`, `api/auth/send-code`, `api/profile` | KEEP | Auth stays. |
| `api/ai/suggest`, `api/discovery/search`, `api/emails/generate` | KEEP | Utility AI; workspace-scope inputs. |
| `api/brands`, `api/sponsors/*` | REWORK | Sponsors/brands become Client/Brand-linked objects. |
| `api/portal/*` | KEEP/REWORK | Client-Viewer scoping enforced by RLS, not token-only. |

## 3. Supabase tables

| Table | Tag | Notes |
|---|---|---|
| `profiles` | REWORK | Loses paywall meaning of `access_type`; membership in a workspace is what grants access. Kept for identity/branding. |
| `trials` | REMOVE (freeze) | No new writes; kept read-only for historical data, dropped later. |
| **`organizations`** | **NEW** | Agency umbrella. |
| **`workspaces`** | **NEW** | Org → workspaces. Legacy mapping: one workspace per existing owner profile (`workspaces.legacy_owner_id`). |
| **`clients`** | **NEW** | Client/Brand inside a workspace. All work scopes to a client or "all clients". |
| **`deals`** | **NEW** | Pipeline: sourced → outreach → negotiating → contract → live → completed (+lost). Links creator, contract, invoice, intelligence record. |
| **`workspace_members`** | **NEW** | user × workspace × role (owner/admin/account_manager/analyst/client_viewer). |
| **`member_client_access`** | **NEW** | Per-client grants (Client-Viewer scoping). |
| **`audit_log`** | **NEW** | Every contract/invoice/compliance/role action. |
| **`demo_requests`** | **NEW** | Sales-led inbound. |
| `team_members` | REWORK → bridge | Legacy invites keep working; backfilled into `workspace_members`; retire after cutover. |
| `campaigns` | REWORK | + `workspace_id`, `client_id`. |
| `emails_sent`, `responses`, `scheduled_emails` | REWORK | + `workspace_id` (backfilled from `user_id`). |
| `creators` | KEEP (global catalog) | Discovery pool stays shared; + `quality_score`, `vetting_status`, `brand_safety_flags`. Workspace-private things (shortlists, deals) live in new scoped tables. Anti-collision uses `last_contacted_at`/`contacted_by` (0015) + active `deals`. |
| `creator_performance`, `performance_campaigns` | REWORK → Intelligence | + workspace/client/deal links, outcome rating, winning strategy. Permanent, workspace-owned. |
| `sponsors`, `brands` | REWORK | Attach to clients. |
| `contracts`, `contract_templates` | REWORK | Lifecycle status, versions, clause blocks, BYO uploads (§5). |
| `invoices` | REWORK | Sequential per-workspace numbering, tax, status flow (§6). |
| `content_items/_versions/_approvals`, `portal_messages` | KEEP | Scope under client. |
| `reports` | REWORK | White-label branding fields. |
| `team_activity_log`, `internal_notes` | KEEP | Feed the audit surface. |
| `email_suppressions`, `google_tokens`, `integration_settings`, `email_accounts` | KEEP | Infra. |
| `support_tickets`, `user_memory`, `ai_discoveries`, `creator_ai_insights`, `user_workflows` | KEEP | Workspace-scope later. |

## 4. Components / lib

| Item | Tag | Notes |
|---|---|---|
| `ConversionModal`, `TrialMilestoneBanner`, `lib/trialStatus.ts` | REMOVE | Milestone paywall machinery. `lib/firstWin.ts` KEPT — its metrics feed Intelligence. |
| `CreditMeter`, `lib/credits.ts` | REMOVE | Superseded same-day by the enterprise pivot. Flat `DELIVERABILITY_WINDOW` throttle lives in `emails/send`. |
| `PricingSection` | REWORK | Growth Agency / Enterprise (custom) + Request-a-demo. No card wall. Transparent-pricing promise kept as trust copy. |
| `prov-animated-hero`, `prov-intro-overlay` | DEMOTE | Off the critical path; single restrained hero. |
| `lib/sampleSponsors.ts` | REWORK | Sample data only in explicitly-labeled sample workspaces — never seeded into paying workspaces. |
| `lib/apiUser.ts` (`apiCtx`) | REWORK | Now resolves org/workspace/role/client-grants via `lib/tenant.ts`; legacy `userId`-as-workspace-key preserved during cutover. |
| `DashboardShell` sidebar | REWORK | §3 IA: workspace switcher, client selector, new nav (Dashboard · Creators · Pipeline · Outreach · Contracts · Invoices · Compliance · Reports · Team · Settings). |

## 5. Workstream log

### §8.1 Foundation — CODE COMPLETE (2026-07-11); RLS VERIFY PENDING DB APPLY
- `supabase/migrations/0020_enterprise_foundation.sql`: organizations, workspaces,
  clients, deals, workspace_members (+role enum), member_client_access, audit_log,
  demo_requests; `workspace_id` added & backfilled on campaigns/emails_sent/responses/
  contracts/invoices/reports; RLS helper fns + policies on all new tables; legacy
  backfill (one org+workspace per owning profile, team_members → workspace_members).
- `src/lib/tenant.ts`: tenant context (workspace, role, client grants) + `requireRole`.
- `apiCtx` extended: returns `workspaceId` + enterprise role; legacy semantics intact.
- Removed: /trial, /trial-ended, /buy (→ /demo redirects), api/trial/signup,
  api/stripe/checkout, api/credits, ConversionModal, TrialMilestoneBanner,
  trialStatus.ts, credits.ts, CreditMeter. Added /demo + api/demo.
- Send throttle: flat deliverability window (no plan gating).
- RLS self-test: scripts/test_rls_scoping.mjs (client-viewer cannot read other clients).
- Marketing CTAs swept: Nav/Footer/Hero/how-it-works/login/TrialSection/animated-hero
  → /demo; PricingSection → Growth Agency ($2,000/mo positioning) + Enterprise (custom).
- Verified: tsc clean, prod build clean, /demo 200, /trial|/buy|/trial-ended → 307 /demo.
- NOT DONE until: (1) 0020 applied to the live Supabase (SQL editor), (2)
  `node scripts/test_rls_scoping.mjs` passes, (3) per-route workspace_id adoption —
  the apiCtx bridge scopes everything to the legacy owner key today; each §8.2+
  workstream moves its module onto workspace_id/tenantCtx natively.
- 2026-07-12: 0020 made single-paste-safe for the LIVE db (it predates repo
  schema.sql): creates missing Phase-2 tables (contracts, contract_templates,
  brands, invoices, email_accounts) first; all alters/backfills guarded with
  to_regclass. Live DB had failed on `relation "invoices" does not exist`.

### §8.2–§8.4 (agents + fixes) — CODE COMPLETE 2026-07-12
- 0021 intelligence (search columns + tsvector + RLS), api/performance/rollups,
  api/performance/list filters. 0022 shortlists/audience-overlap + api/deals,
  api/shortlists. 0023 sequences + api/sequences(+stats), sequence_id stamped in
  emails/send. Agent UIs partial in places — compile-verified; polish pass later.

### §8.5 Contracts — CODE COMPLETE 2026-07-12
- 0024: lifecycle statuses, versioning, clause library with 12 seeded stock
  clauses (parties, deliverables, compensation, usage/IP, exclusivity, FTC,
  approvals, kill fee, AI/synthetic media, morals/termination, dispute/law,
  original-content warranty), BYO workspace templates (.docx/.pdf upload),
  workspace RLS. api/contracts (+/[id] versioned edits + lifecycle actions,
  /clauses, /templates). src/lib/contract-pdf.ts (branded header, numbered
  clauses, signature blocks, non-removable legal-note footer). ContractsPanel
  rebuilt: lifecycle table, clause wizard w/ deal merge fields, clause editor.
- Storage: create private bucket `contracts` in the dashboard.

### §8.6 Invoices — CODE COMPLETE 2026-07-12
- 0025 (agent) verified. invoice-money.ts fixed (BigInt-literal compile error).
  api/invoices rebuilt: sequential per-workspace numbers (insert-retry on
  unique conflict), integer-cent totals w/ half-up tax rounded once, lazy
  overdue flagging, balances. api/invoices/[id] (draft edits + send/paid/void,
  audited), /payment-link (Stripe, guarded), api/tax/creators (W-9 last-4 only,
  1099-prep CSV export), api/workspace/branding. invoice-pdf.ts finance-grade,
  agency-branded. InvoicesPanel rebuilt — fake SEED rows removed (§2 rule).

### §8.7 Compliance — CODE COMPLETE 2026-07-12
- 0026: deliverable_disclosures (placement rules, proof path, verified_by/at),
  client-scoped RLS. api/compliance (+upload-url signed upload/view, workspace-
  prefixed paths). /dashboard/compliance: exposure banner, filters, mark-live →
  upload proof → verify/flag flow, all status changes audited.
- Storage: create private bucket `compliance-proofs` in the dashboard.

### §8.8 Reports — covered for v1
- White-label existed (api/settings/white-label + ReportBranding in
  pdf-generator + BrandingSettings); per-client/quarter rollups now come from
  api/performance/rollups. workspaces.branding is the enterprise source going
  forward (api/workspace/branding).

### §8.9 Team & Roles — CODE COMPLETE 2026-07-12
- api/team/roles: list workspace members w/ grants, role changes (last-owner
  protection), per-client grant/revoke — owner/admin only, all audited.
  TeamPanel gains "Roles & client access" section (5 roles + client checkboxes
  for client viewers). Legacy invite flow intact (backfilled by 0020).

### §8.10 Demo/security — CODE COMPLETE 2026-07-12
- /security page (honest claims only: RLS isolation, RBAC, audit trail,
  encryption via Supabase/AWS, provisioned onboarding, data ownership; no
  fabricated certifications). Footer links it. /demo + enterprise pricing
  landed in §8.1.

### §3 IA — sidebar restructured
- Nav groups: Work (Creators, Curated Discovery, Pipeline, Outreach, Send,
  Track) · Business (Contracts, Invoices & Payments, Compliance, Intelligence,
  Reports, Analytics, Client Portal) · Workspace (Team & Roles, Clients &
  Brands, Integrations, Branding, Settings). Workspace switcher + client
  selector: deferred until multi-workspace accounts exist.

### Deployment checklist
1. Paste migrations in order into Supabase SQL editor: 0020 → 0021 → 0022 →
   0023 → 0024 → 0025 → 0026.
2. Create private Storage buckets: `contracts`, `compliance-proofs`.
3. Run `node scripts/test_rls_scoping.mjs` — must pass before calling RLS done.
4. Verified locally: tsc clean + prod build clean (2026-07-12).
5. DONE 2026-07-13: 0020–0026 applied to live Supabase, both Storage buckets
   created, `node scripts/test_rls_scoping.mjs` — all checks PASS. Enterprise
   foundation is live and RLS-verified.
