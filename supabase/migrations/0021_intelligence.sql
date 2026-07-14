-- ══════════════════════════════════════════════════════════════════════
-- 0021 INTELLIGENCE (§8.2)
-- Performance Tracker → Intelligence. Every performance_campaigns row
-- becomes a permanent deal-intelligence record: deal economics (integer
-- cents, never floats), deliverables, the strategy that won it, negotiation
-- notes, an outcome rating, and the account manager who ran it. Full-text
-- searchable, owned by the workspace — institutional memory that survives
-- staff turnover.
-- RLS moves from agency_id = auth.uid() (0017) to workspace scoping via the
-- 0020 helpers (member_workspace_ids / role_in_workspace); the agency_id
-- check remains only as a cutover fallback for rows not yet stamped with a
-- workspace_id.
-- ══════════════════════════════════════════════════════════════════════

-- ── Deal-intelligence columns ────────────────────────────────────────
alter table performance_campaigns add column if not exists deal_value_cents bigint
  check (deal_value_cents is null or deal_value_cents >= 0);
alter table performance_campaigns add column if not exists currency text default 'USD';
alter table performance_campaigns add column if not exists deliverables jsonb default '[]';
alter table performance_campaigns add column if not exists winning_strategy text;
alter table performance_campaigns add column if not exists negotiation_notes text;
alter table performance_campaigns add column if not exists outcome_rating int
  check (outcome_rating >= 1 and outcome_rating <= 5);
alter table performance_campaigns add column if not exists category text;
alter table performance_campaigns add column if not exists account_manager_member_id uuid
  references workspace_members(id) on delete set null;

-- ── Full-text search ─────────────────────────────────────────────────
-- Generated tsvector over the queryable text of a record. Names weigh
-- heaviest, category next, negotiation notes last — so "fitness" surfaces
-- fitness-category deals before ones that merely mention it in notes.
alter table performance_campaigns add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(campaign_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(brand_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(creator_handle, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(negotiation_notes, '')), 'C')
  ) stored;

create index if not exists idx_perf_search on performance_campaigns using gin (search_tsv);
create index if not exists idx_perf_ws on performance_campaigns (workspace_id);
create index if not exists idx_perf_client on performance_campaigns (client_id);
create index if not exists idx_perf_category on performance_campaigns (category);
create index if not exists idx_perf_deal_value on performance_campaigns (deal_value_cents desc);
create index if not exists idx_perf_account_manager on performance_campaigns (account_manager_member_id);

-- ── Cutover backfill ─────────────────────────────────────────────────
-- Re-run the 0020 workspace stamp: catches records logged between 0020 and
-- 0021 that were inserted with only the legacy agency_id key. Never seeds
-- data — only links existing rows to their workspace.
update performance_campaigns pc set workspace_id = w.id
from workspaces w
where pc.workspace_id is null and w.legacy_owner_id = pc.agency_id;

-- ── RLS (mirrors the 0020 policy style) ──────────────────────────────
-- Read: any working member of the owning workspace (records are the whole
-- agency's memory, not one AM's). client_viewer is scoped to granted
-- clients only — deal economics and negotiation notes for other clients
-- must stay invisible (same shape as 0020's deals_read). Legacy fallback
-- keeps un-stamped rows visible to their original owner during cutover.
-- Write: working roles only (owner/admin/account_manager).
drop policy if exists "agency_own_performance" on performance_campaigns;
drop policy if exists perf_member_read on performance_campaigns;
drop policy if exists perf_working_write on performance_campaigns;

alter table performance_campaigns enable row level security;

create policy perf_member_read on performance_campaigns for select
  using (
    (workspace_id in (select member_workspace_ids())
     and (role_in_workspace(workspace_id) <> 'client_viewer'
          or client_id in (select visible_client_ids(workspace_id))))
    or (workspace_id is null and agency_id = auth.uid())
  );

create policy perf_working_write on performance_campaigns for all
  using (
    role_in_workspace(workspace_id) in ('owner', 'admin', 'account_manager')
    or (workspace_id is null and agency_id = auth.uid())
  )
  with check (
    role_in_workspace(workspace_id) in ('owner', 'admin', 'account_manager')
    or (workspace_id is null and agency_id = auth.uid())
  );
