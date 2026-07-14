-- ══════════════════════════════════════════════════════════════════════
-- 0022 CREATORS CURATED DISCOVERY + PIPELINE CRM (§8.3)
-- Shortlists become shared team objects (workspace-scoped, RLS mirrors
-- 0020), and a global creator_audience_overlap table powers audience-
-- overlap anti-collision warnings during discovery. The deals table and
-- RLS helper functions (member_workspace_ids / role_in_workspace) already
-- exist from 0020_enterprise_foundation.sql.
-- ══════════════════════════════════════════════════════════════════════

-- ── Shortlists: curated creator lists shared across the workspace ────
create table if not exists shortlists (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,   -- optional: shortlist for a specific client
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_shortlists_ws on shortlists (workspace_id);
create index if not exists idx_shortlists_client on shortlists (client_id);

create table if not exists shortlist_creators (
  shortlist_id uuid not null references shortlists(id) on delete cascade,
  creator_id uuid not null references creators(id) on delete cascade,
  note text,
  added_by uuid references auth.users(id) on delete set null,
  added_at timestamptz default now(),
  primary key (shortlist_id, creator_id)
);
create index if not exists idx_shortlist_creators_creator on shortlist_creators (creator_id);

-- ── Audience overlap: global, catalog-level signal ───────────────────
-- Pairs are stored once (direction-agnostic; readers must check both
-- orientations). Written by the scraper/enrichment pipeline via the
-- service role only — no client writes.
create table if not exists creator_audience_overlap (
  creator_a uuid not null references creators(id) on delete cascade,
  creator_b uuid not null references creators(id) on delete cascade,
  overlap_pct numeric not null check (overlap_pct >= 0 and overlap_pct <= 100),
  source text,                       -- e.g. 'comment_graph', 'panel', 'estimated'
  computed_at timestamptz default now(),
  primary key (creator_a, creator_b),
  check (creator_a <> creator_b)
);
create index if not exists idx_overlap_b on creator_audience_overlap (creator_b);

-- ── RLS (mirrors 0020 style) ─────────────────────────────────────────
alter table shortlists              enable row level security;
alter table shortlist_creators      enable row level security;
alter table creator_audience_overlap enable row level security;

-- Shortlists: client-scoped read mirroring 0020's deals_read (a client_viewer
-- only sees shortlists for granted clients); working roles mutate.
create policy shortlists_read on shortlists for select
  using (workspace_id in (select member_workspace_ids())
         and (client_id is null and role_in_workspace(workspace_id) <> 'client_viewer'
              or client_id in (select visible_client_ids(workspace_id))));
create policy shortlists_manage on shortlists for all
  using (role_in_workspace(workspace_id) in ('owner','admin','account_manager'))
  with check (role_in_workspace(workspace_id) in ('owner','admin','account_manager'));

-- Shortlist members follow the parent shortlist's visibility.
create policy shortlist_creators_read on shortlist_creators for select
  using (exists (select 1 from shortlists s where s.id = shortlist_id
                 and s.workspace_id in (select member_workspace_ids())
                 and (s.client_id is null and role_in_workspace(s.workspace_id) <> 'client_viewer'
                      or s.client_id in (select visible_client_ids(s.workspace_id)))));
create policy shortlist_creators_manage on shortlist_creators for all
  using (exists (select 1 from shortlists s where s.id = shortlist_id
                 and role_in_workspace(s.workspace_id) in ('owner','admin','account_manager')))
  with check (exists (select 1 from shortlists s where s.id = shortlist_id
                 and role_in_workspace(s.workspace_id) in ('owner','admin','account_manager')));

-- Audience overlap: global read for any signed-in user; writes are
-- service-role only (RLS with no insert/update/delete policies).
create policy overlap_read on creator_audience_overlap for select
  to authenticated using (true);
