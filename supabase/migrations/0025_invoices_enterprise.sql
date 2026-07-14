-- ══════════════════════════════════════════════════════════════════════
-- 0025 FINANCE-GRADE INVOICES & PAYMENTS (§8.6)
-- Extends the legacy invoices table into a real invoicing engine:
-- sequential per-workspace numbering, integer-cent money, tax in basis
-- points, status lifecycle, remittance snapshot; plus creator tax
-- profiles (1099 prep) and the invoice_balances exec-dashboard view.
-- ALL money columns are integer cents (bigint) — never floats.
-- Requires 0020 (workspaces, clients, deals, RLS helper fns).
-- ══════════════════════════════════════════════════════════════════════

-- ── Extend invoices ─────────────────────────────────────────────────
alter table invoices add column if not exists deal_id uuid references deals(id) on delete set null;
alter table invoices add column if not exists client_id uuid references clients(id) on delete set null;
-- Sequential per workspace. Assigned in the API via max+1 inside an
-- insert-retry loop; the unique index below makes races safe (the loser
-- of a race gets 23505 and retries with the next number).
alter table invoices add column if not exists invoice_number int;
-- Each item: { "description": text, "qty": int, "unit_cents": bigint }
alter table invoices add column if not exists line_items jsonb not null default '[]';
alter table invoices add column if not exists subtotal_cents bigint;
alter table invoices add column if not exists tax_bps int not null default 0;  -- basis points: 825 = 8.25% (exact)
alter table invoices add column if not exists tax_cents bigint;
alter table invoices add column if not exists total_cents bigint;
alter table invoices add column if not exists currency text not null default 'USD';
alter table invoices add column if not exists issue_date date;
alter table invoices add column if not exists terms text not null default 'net_30';
alter table invoices add column if not exists late_fee_note text;
alter table invoices add column if not exists sent_at timestamptz;
alter table invoices add column if not exists paid_at timestamptz;
alter table invoices add column if not exists stripe_payment_link text;
-- Agency bank / remit-to info, snapshotted from workspaces.branding.remittance
-- at creation so paid invoices keep the instructions they were issued with.
alter table invoices add column if not exists remittance jsonb not null default '{}';
-- due_date already exists on the legacy table.

alter table invoices add constraint invoices_terms_check
  check (terms in ('due_on_receipt','net_15','net_30','net_45')) not valid;
alter table invoices validate constraint invoices_terms_check;

-- Widen the status lifecycle: draft → sent → viewed → paid, plus
-- overdue (lazily derived from due_date) and void.
alter table invoices drop constraint if exists invoices_status_check;
alter table invoices add constraint invoices_status_check
  check (status in ('draft','sent','viewed','paid','overdue','void'));

-- Sequential numbering is unique PER WORKSPACE (partial: legacy rows may
-- have neither workspace_id nor invoice_number).
create unique index if not exists invoices_ws_number_key
  on invoices (workspace_id, invoice_number)
  where workspace_id is not null and invoice_number is not null;

create index if not exists idx_invoices_ws_status on invoices (workspace_id, status);
create index if not exists idx_invoices_ws_due on invoices (workspace_id, due_date);

-- ── Workspace-model RLS on invoices ─────────────────────────────────
-- Legacy policy "own invoices" (auth.uid() = user_id) stays for the
-- cutover bridge; these add the workspace paths. Finance data: working
-- roles only — client_viewer never reads invoices.
drop policy if exists invoices_ws_read on invoices;
create policy invoices_ws_read on invoices for select
  using (workspace_id is not null
         and role_in_workspace(workspace_id) in ('owner','admin','account_manager','analyst'));
drop policy if exists invoices_ws_write on invoices;
create policy invoices_ws_write on invoices for all
  using (workspace_id is not null
         and role_in_workspace(workspace_id) in ('owner','admin','account_manager'))
  with check (workspace_id is not null
         and role_in_workspace(workspace_id) in ('owner','admin','account_manager'));

-- ── Creator tax profiles (year-end 1099 prep) ───────────────────────
-- COMPLIANCE NOTE: we NEVER store a full TIN/SSN/EIN anywhere in this
-- system — only the last 4 digits (tin_last4). The signed W-9 itself
-- lives as a private Storage object (w9_file_path); the database holds
-- just enough to produce the year-end prep CSV.
create table if not exists creator_tax_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  creator_id uuid not null references creators(id) on delete cascade,
  legal_name text not null,
  tax_classification text not null default 'individual'
    check (tax_classification in ('individual','sole_proprietor','llc','c_corp','s_corp','partnership','other')),
  tin_last4 text check (tin_last4 is null or tin_last4 ~ '^[0-9]{4}$'),  -- LAST 4 ONLY, never the full TIN
  w9_file_path text,               -- private Storage path to the uploaded W-9
  address jsonb not null default '{}',  -- { line1, line2, city, state, postal_code, country }
  tax_year int not null default extract(year from now())::int,
  total_paid_cents bigint not null default 0,  -- integer cents, incremented on invoice mark_paid
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (workspace_id, creator_id, tax_year)
);
create index if not exists idx_tax_profiles_ws_year on creator_tax_profiles (workspace_id, tax_year);

-- RLS: finance data — owner/admin ONLY (stricter than invoices), same
-- policy style as 0020.
alter table creator_tax_profiles enable row level security;
drop policy if exists tax_profiles_admin_read on creator_tax_profiles;
create policy tax_profiles_admin_read on creator_tax_profiles for select
  using (role_in_workspace(workspace_id) in ('owner','admin'));
drop policy if exists tax_profiles_admin_write on creator_tax_profiles;
create policy tax_profiles_admin_write on creator_tax_profiles for all
  using (role_in_workspace(workspace_id) in ('owner','admin'))
  with check (role_in_workspace(workspace_id) in ('owner','admin'));

-- ── Exec-dashboard balances view ────────────────────────────────────
-- security_invoker: the view runs with the caller's rights, so the
-- invoices RLS above scopes it automatically.
create or replace view invoice_balances
  with (security_invoker = true) as
select
  workspace_id,
  coalesce(sum(total_cents) filter (where status in ('sent','viewed','overdue')), 0)::bigint as outstanding_cents,
  coalesce(sum(total_cents) filter (where status = 'overdue'
    or (status in ('sent','viewed') and due_date is not null and due_date < current_date)), 0)::bigint as overdue_cents,
  count(*) filter (where status = 'overdue'
    or (status in ('sent','viewed') and due_date is not null and due_date < current_date)) as overdue_count,
  coalesce(sum(total_cents) filter (where status = 'paid'
    and paid_at >= date_trunc('quarter', now())), 0)::bigint as paid_quarter_cents,
  count(*) filter (where status = 'draft') as draft_count
from invoices
where workspace_id is not null
group by workspace_id;
