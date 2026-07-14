-- ══════════════════════════════════════════════════════════════════════
-- 0023 OUTREACH SEQUENCES (§8.4)
-- Team-standardized outreach sequences: a workspace-owned library of
-- multi-step email sequences (subject/body/day offsets) with a governance
-- status flow — draft → approved → archived. Only approved sequences are
-- offered in the campaign composer; approval is owner/admin-only (enforced
-- at the API layer, audited into audit_log).
-- Sends get stamped with the sequence that produced them (emails_sent +
-- scheduled_emails.sequence_id) so per-sequence performance — sends, reply
-- rate, wins — is queryable forever. Institutional memory, not folklore.
-- RLS mirrors 0020: read = any active workspace member; write = working
-- roles (owner/admin/account_manager) via the 0020 helpers
-- member_workspace_ids() / role_in_workspace().
-- ══════════════════════════════════════════════════════════════════════

create table if not exists outreach_sequences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  -- Which built-in Prov strategy seeded this sequence (null for from-scratch).
  strategy_key text,
  -- Ordered steps: [{ subject, body, days_after_previous }]. Step 0 is the
  -- initial send (days_after_previous 0); later steps are follow-up offsets
  -- relative to the previous step.
  steps jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft','approved','archived')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_sequences_ws_status on outreach_sequences (workspace_id, status);

-- ── Stamp sends with their sequence ──────────────────────────────────
alter table emails_sent      add column if not exists sequence_id uuid references outreach_sequences(id) on delete set null;
alter table scheduled_emails add column if not exists sequence_id uuid references outreach_sequences(id) on delete set null;
create index if not exists idx_emails_sent_sequence on emails_sent (sequence_id) where sequence_id is not null;
create index if not exists idx_scheduled_emails_sequence on scheduled_emails (sequence_id) where sequence_id is not null;

-- ── RLS (mirrors the 0020 policy style) ──────────────────────────────
-- Read: any active member of the owning workspace — the library is the whole
-- team's playbook. Write: working roles only. The stricter approval rule
-- (only owner/admin may set status = 'approved') is enforced in
-- /api/sequences, which also writes the audit_log row on approve/archive.
alter table outreach_sequences enable row level security;

drop policy if exists sequences_member_read on outreach_sequences;
drop policy if exists sequences_working_write on outreach_sequences;

create policy sequences_member_read on outreach_sequences for select
  using (workspace_id in (select member_workspace_ids()));

create policy sequences_working_write on outreach_sequences for all
  using (role_in_workspace(workspace_id) in ('owner', 'admin', 'account_manager'))
  with check (role_in_workspace(workspace_id) in ('owner', 'admin', 'account_manager'));
