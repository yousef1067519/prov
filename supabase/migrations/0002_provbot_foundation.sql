-- Phase 1 of the ProvBot system: support tickets + per-user assistant memory.
-- Safe + idempotent. Run in Supabase Dashboard → SQL Editor → New query → paste → Run.
--
-- Admin model: the /admin dashboard reads ALL tickets via the SERVICE ROLE key (which
-- bypasses RLS) behind a server-side ADMIN_EMAILS allowlist check — the same pattern the
-- creators/import route uses. So there is intentionally NO "admin can see all" RLS policy
-- here; end-users get owner-only access, and admin access lives in the API layer.

-- ── Support tickets (ProvBot escalation) ───────────────────────
create table if not exists support_tickets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  message    text not null,
  status     text not null default 'open'   check (status   in ('open','in_progress','resolved')),
  priority   text not null default 'medium' check (priority in ('low','medium','high')),
  metadata   jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists support_tickets_user_idx    on support_tickets(user_id);
create index if not exists support_tickets_status_idx  on support_tickets(status);
create index if not exists support_tickets_created_idx on support_tickets(created_at desc);

alter table support_tickets enable row level security;
-- End-users may create their own tickets and read only their own. Admin sees all via service role.
create policy "own tickets read"   on support_tickets for select using (auth.uid() = user_id);
create policy "own tickets insert" on support_tickets for insert with check (auth.uid() = user_id);

-- ── Per-user ProvBot memory (one row per user) ─────────────────
create table if not exists user_memory (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  profile         jsonb not null default '{}',  -- { name?, preferences?: { tone?, responseLength? } }
  history_summary text  not null default '',
  facts           jsonb not null default '[]',  -- [{ key, value, timestamp }]
  updated_at      timestamptz default now()
);
alter table user_memory enable row level security;
create policy "own memory" on user_memory for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
