-- ══════════════════════════════════════════════════════════════════════
-- 0020 ENTERPRISE FOUNDATION (§8.1)
-- Multi-tenant hierarchy: Organization → Workspace → Client/Brand →
-- Campaign → Deal → Creator, plus RBAC (workspace_members + per-client
-- grants), audit log, and the sales-led demo_requests inbox.
-- Legacy bridge: one org + one workspace per existing owning profile;
-- workspaces.legacy_owner_id = the old user_id used as workspace key, so
-- existing user_id-scoped rows map 1:1 onto a workspace without rewrites.
-- ══════════════════════════════════════════════════════════════════════

-- ── Phase-2 legacy tables the live DB may be missing ────────────────
-- schema.sql grew after the initial deploy; these blocks are copied from it
-- verbatim (create-if-not-exists + re-creatable policies) so this file works
-- on any live state with one paste.
create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  type text not null check (type in ('influencer','sponsor')),
  creator_id uuid,
  sponsor_id uuid,
  counterparty_name text,
  body text not null,
  status text not null default 'draft' check (status in ('draft','sent','signed')),
  signed_date timestamptz,
  created_at timestamptz default now()
);
alter table contracts enable row level security;
drop policy if exists "own contracts" on contracts;
create policy "own contracts" on contracts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists contract_templates (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('influencer','sponsor')),
  name text not null,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  company text not null,
  contact_name text,
  email text,
  phone text,
  website text,
  budget_range text,
  stage text not null default 'Prospect'
    check (stage in ('Prospect','Contacted','Follow-up','Negotiating','Active Client','Lost')),
  notes text,
  last_contact date,
  next_followup date,
  created_at timestamptz default now()
);
alter table brands enable row level security;
drop policy if exists "own brands" on brands;
create policy "own brands" on brands for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  brand_id uuid references brands(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  number text,
  brand_name text,
  amount numeric not null default 0,
  status text not null default 'draft' check (status in ('draft','sent','paid','overdue')),
  due_date date,
  created_at timestamptz default now()
);
alter table invoices enable row level security;
drop policy if exists "own invoices" on invoices;
create policy "own invoices" on invoices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists email_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  provider text not null default 'gmail',
  address text not null,
  connected_at timestamptz default now()
);
alter table email_accounts enable row level security;
drop policy if exists "own email accounts" on email_accounts;
create policy "own email accounts" on email_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Roles & stages ──────────────────────────────────────────────────
do $$ begin
  create type workspace_role as enum ('owner','admin','account_manager','analyst','client_viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deal_stage as enum ('sourced','outreach','negotiating','contract','live','completed','lost');
exception when duplicate_object then null; end $$;

-- ── Core hierarchy ──────────────────────────────────────────────────
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  -- Legacy bridge: the profile id whose user_id-scoped rows this workspace owns.
  legacy_owner_id uuid unique references auth.users(id) on delete set null,
  -- Branding that drives white-label reports/invoices/contracts headers.
  branding jsonb not null default '{}',
  created_at timestamptz default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  industry text,
  contact_name text,
  contact_email text,
  notes text,
  is_sample boolean not null default false, -- sample workspaces only; never real client data
  created_at timestamptz default now()
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invited_email text,                -- pending invites have email but no user yet
  role workspace_role not null default 'account_manager',
  status text not null default 'active' check (status in ('invited','active','revoked')),
  created_at timestamptz default now(),
  unique (workspace_id, user_id)
);

-- Per-client grants. Only consulted for client_viewer (and optionally analyst):
-- other roles see all clients in their workspace.
create table if not exists member_client_access (
  member_id uuid not null references workspace_members(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  primary key (member_id, client_id)
);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  creator_id uuid references creators(id) on delete set null,
  sponsor_id uuid,
  owner_member_id uuid references workspace_members(id) on delete set null, -- account manager
  name text not null,
  stage deal_stage not null default 'sourced',
  value_cents bigint not null default 0,   -- money is integer cents, never floats
  currency text not null default 'USD',
  deliverables jsonb not null default '[]',
  contract_id uuid,
  invoice_id uuid,
  intelligence_id uuid,                    -- performance_campaigns link on completion
  won_strategy text,                       -- which outreach sequence won it
  notes text,
  stage_changed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_deals_ws_stage on deals (workspace_id, stage);
create index if not exists idx_deals_client on deals (client_id);
create index if not exists idx_deals_creator_active on deals (creator_id) where stage not in ('completed','lost');

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_user_id uuid,
  actor_email text,
  action text not null,          -- e.g. 'contract.approved', 'invoice.sent', 'role.changed'
  entity_type text not null,     -- 'contract' | 'invoice' | 'deal' | 'member' | ...
  entity_id uuid,
  meta jsonb not null default '{}',
  created_at timestamptz default now()
);
create index if not exists idx_audit_ws_time on audit_log (workspace_id, created_at desc);

create table if not exists demo_requests (
  id uuid primary key default gen_random_uuid(),
  agency_name text not null,
  contact_name text not null,
  email text not null,
  team_size text,
  clients_count text,
  monthly_deals text,
  message text,
  status text not null default 'new' check (status in ('new','contacted','qualified','won','lost')),
  created_at timestamptz default now()
);

-- ── Workspace scoping on existing business tables ───────────────────
-- Guarded: the live database may predate some repo tables (e.g. invoices,
-- brands, contracts were added to schema.sql after the initial deploy).
-- Missing tables are skipped — their own module migrations create them
-- with workspace_id built in.
do $$
declare t text;
begin
  foreach t in array array['campaigns','emails_sent','responses','contracts',
                           'invoices','reports','brands','performance_campaigns'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table %I add column if not exists workspace_id uuid references workspaces(id) on delete cascade', t);
    end if;
  end loop;
  if to_regclass('public.sponsors') is not null then
    alter table sponsors add column if not exists workspace_id uuid references workspaces(id);
  end if;
  if to_regclass('public.campaigns') is not null then
    alter table campaigns add column if not exists client_id uuid references clients(id) on delete set null;
  end if;
  if to_regclass('public.performance_campaigns') is not null then
    alter table performance_campaigns add column if not exists client_id uuid references clients(id) on delete set null;
    alter table performance_campaigns add column if not exists deal_id uuid references deals(id) on delete set null;
  end if;
end $$;

-- Curated-discovery fields on the shared creator catalog (§4.2)
alter table creators add column if not exists quality_score numeric;          -- 0-100 authenticity/quality
alter table creators add column if not exists vetting_status text not null default 'unvetted'
  check (vetting_status in ('unvetted','pending','vetted','rejected'));
alter table creators add column if not exists brand_safety_flags jsonb not null default '[]';

-- ── Legacy backfill: one org + one workspace per owning profile ─────
-- profiles' optional name columns vary by deploy (agency_name/full_name were
-- never in schema.sql; white_label_name sometimes is) — build the COALESCE
-- expression dynamically from whichever columns actually exist, so this
-- runs on any live profiles shape without erroring.
do $$
declare
  p record;
  oid uuid;
  name_expr text;
  candidates text[] := array['agency_name','full_name','white_label_name'];
  col text;
  parts text[] := '{}';
begin
  foreach col in array candidates loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'profiles' and column_name = col) then
      parts := array_append(parts, quote_ident(col));
    end if;
  end loop;
  parts := array_append(parts, 'split_part(email,''@'',1)');
  parts := array_append(parts, quote_literal('Agency'));
  name_expr := 'coalesce(' || array_to_string(parts, ', ') || ')';

  for p in execute format('select id, %s as nm from profiles pr where not exists (select 1 from workspaces w where w.legacy_owner_id = pr.id)', name_expr)
  loop
    insert into organizations (name) values (p.nm) returning id into oid;
    insert into workspaces (org_id, name, legacy_owner_id) values (oid, p.nm, p.id)
    on conflict (legacy_owner_id) do nothing;
  end loop;
end $$;

-- Owner memberships
insert into workspace_members (workspace_id, user_id, role, status)
select w.id, w.legacy_owner_id, 'owner', 'active'
from workspaces w
where w.legacy_owner_id is not null
on conflict (workspace_id, user_id) do nothing;

-- Legacy team_members → workspace_members (Admin→admin, Manager→account_manager,
-- Team Member→analyst). Guarded: table/columns may not exist on older live DBs.
do $$
begin
  if to_regclass('public.team_members') is not null
     and exists (select 1 from information_schema.columns
                 where table_name = 'team_members' and column_name = 'member_user_id') then
    insert into workspace_members (workspace_id, user_id, invited_email, role, status)
    select w.id,
           tm.member_user_id,
           tm.member_email,
           case tm.role when 'Admin' then 'admin'::workspace_role
                        when 'Manager' then 'account_manager'::workspace_role
                        else 'analyst'::workspace_role end,
           coalesce(tm.status, 'active')
    from team_members tm
    join workspaces w on w.legacy_owner_id = tm.owner_id
    where tm.member_user_id is not null
    on conflict (workspace_id, user_id) do nothing;
  end if;
end $$;

-- Stamp workspace_id onto legacy rows (each guarded — table may not exist live)
do $$
begin
  if to_regclass('public.campaigns') is not null then
    update campaigns c set workspace_id = w.id from workspaces w where c.workspace_id is null and w.legacy_owner_id = c.user_id;
  end if;
  if to_regclass('public.emails_sent') is not null then
    update emails_sent e set workspace_id = w.id from workspaces w where e.workspace_id is null and w.legacy_owner_id = e.user_id;
  end if;
  if to_regclass('public.responses') is not null then
    update responses r set workspace_id = w.id from workspaces w where r.workspace_id is null and w.legacy_owner_id = r.user_id;
  end if;
  if to_regclass('public.contracts') is not null then
    update contracts ct set workspace_id = w.id from workspaces w where ct.workspace_id is null and w.legacy_owner_id = ct.user_id;
  end if;
  if to_regclass('public.invoices') is not null then
    update invoices i set workspace_id = w.id from workspaces w where i.workspace_id is null and w.legacy_owner_id = i.user_id;
  end if;
  if to_regclass('public.reports') is not null then
    update reports rp set workspace_id = w.id from workspaces w where rp.workspace_id is null and w.legacy_owner_id = rp.user_id;
  end if;
  if to_regclass('public.brands') is not null then
    update brands b set workspace_id = w.id from workspaces w where b.workspace_id is null and w.legacy_owner_id = b.user_id;
  end if;
  if to_regclass('public.performance_campaigns') is not null then
    update performance_campaigns pc set workspace_id = w.id from workspaces w where pc.workspace_id is null and w.legacy_owner_id = pc.agency_id;
  end if;
end $$;

-- ── RLS ─────────────────────────────────────────────────────────────
-- Helper: workspaces the current auth user belongs to.
create or replace function member_workspace_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select workspace_id from workspace_members
  where user_id = auth.uid() and status = 'active'
$$;

-- Helper: role in a given workspace ('' when not a member).
create or replace function role_in_workspace(ws uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role::text from workspace_members
     where workspace_id = ws and user_id = auth.uid() and status = 'active' limit 1),
    '')
$$;

-- Helper: client ids the current user may see in a workspace.
-- Non-viewer roles see every client; client_viewer only granted ones.
create or replace function visible_client_ids(ws uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  select c.id from clients c
  where c.workspace_id = ws
    and (
      role_in_workspace(ws) in ('owner','admin','account_manager','analyst')
      or exists (
        select 1 from member_client_access mca
        join workspace_members wm on wm.id = mca.member_id
        where mca.client_id = c.id
          and wm.user_id = auth.uid() and wm.status = 'active'
      )
    )
$$;

alter table organizations       enable row level security;
alter table workspaces          enable row level security;
alter table clients             enable row level security;
alter table workspace_members   enable row level security;
alter table member_client_access enable row level security;
alter table deals               enable row level security;
alter table audit_log           enable row level security;
alter table demo_requests       enable row level security;

-- Organizations: visible via any of their workspaces.
create policy org_member_read on organizations for select
  using (exists (select 1 from workspaces w where w.org_id = organizations.id
                 and w.id in (select member_workspace_ids())));

create policy ws_member_read on workspaces for select
  using (id in (select member_workspace_ids()));
create policy ws_admin_update on workspaces for update
  using (role_in_workspace(id) in ('owner','admin'))
  with check (role_in_workspace(id) in ('owner','admin'));

-- Clients: read = visible set (client_viewer sees only granted clients).
create policy client_visible_read on clients for select
  using (id in (select visible_client_ids(workspace_id)));
create policy client_manage on clients for all
  using (role_in_workspace(workspace_id) in ('owner','admin','account_manager'))
  with check (role_in_workspace(workspace_id) in ('owner','admin','account_manager'));

-- Members: any member can see the roster; only owner/admin mutate.
create policy members_read on workspace_members for select
  using (workspace_id in (select member_workspace_ids()));
create policy members_manage on workspace_members for all
  using (role_in_workspace(workspace_id) in ('owner','admin'))
  with check (role_in_workspace(workspace_id) in ('owner','admin'));

create policy mca_read on member_client_access for select
  using (exists (select 1 from workspace_members wm where wm.id = member_id
                 and wm.workspace_id in (select member_workspace_ids())));
create policy mca_manage on member_client_access for all
  using (exists (select 1 from workspace_members wm where wm.id = member_id
                 and role_in_workspace(wm.workspace_id) in ('owner','admin')))
  with check (exists (select 1 from workspace_members wm where wm.id = member_id
                 and role_in_workspace(wm.workspace_id) in ('owner','admin')));

-- Deals: client-scoped read (a client_viewer only sees granted clients' deals);
-- writes for working roles.
create policy deals_read on deals for select
  using (workspace_id in (select member_workspace_ids())
         and (client_id is null and role_in_workspace(workspace_id) <> 'client_viewer'
              or client_id in (select visible_client_ids(workspace_id))));
create policy deals_write on deals for all
  using (role_in_workspace(workspace_id) in ('owner','admin','account_manager'))
  with check (role_in_workspace(workspace_id) in ('owner','admin','account_manager'));

-- Audit log: readable by owner/admin/analyst; INSERT via service role only.
create policy audit_read on audit_log for select
  using (role_in_workspace(workspace_id) in ('owner','admin','analyst'));

-- Demo requests: no client access at all (service role handles inserts+reads).
-- (RLS enabled with no policies = deny-all for anon/authenticated.)

-- ── Retire the trial gate ───────────────────────────────────────────
-- trials table frozen: revoke writes (kept read-only for history).
do $$ begin
  if to_regclass('public.trials') is not null then
    revoke insert, update, delete on trials from anon, authenticated;
  end if;
end $$;
