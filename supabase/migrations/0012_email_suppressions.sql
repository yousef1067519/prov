-- Email suppression list (CAN-SPAM / GDPR opt-outs). When a recipient clicks the
-- unsubscribe link in outreach, we record (workspace owner, email) here and skip
-- them on future sends. Scoped per workspace so opting out of one agency doesn't
-- affect another.
create table if not exists email_suppressions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  email text not null,
  reason text default 'unsubscribe',
  created_at timestamptz default now(),
  unique (owner_id, email)
);
create index if not exists email_suppressions_owner_idx on email_suppressions(owner_id);
