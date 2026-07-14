-- Feature 2: Team Workspace. Self-contained + idempotent (the live DB was missing team_members).
-- Run in Supabase → SQL Editor.

-- team_members (create if missing) + status column
create table if not exists team_members (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references auth.users(id) on delete cascade,
  member_email text not null,
  role         text not null default 'Team Member' check (role in ('Admin', 'Manager', 'Team Member')),
  status       text not null default 'active' check (status in ('pending', 'active', 'removed')),
  created_at   timestamptz default now()
);
alter table team_members add column if not exists status text not null default 'active';
alter table team_members enable row level security;
drop policy if exists "own team" on team_members;
create policy "own team" on team_members for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Team activity log
create table if not exists team_activity_log (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  actor_email   text,
  action        text not null,
  resource_type text,
  resource_id   text,
  meta          jsonb default '{}',
  created_at    timestamptz default now()
);
create index if not exists team_activity_owner_idx on team_activity_log(owner_id, created_at desc);
alter table team_activity_log enable row level security;
drop policy if exists "own activity" on team_activity_log;
create policy "own activity" on team_activity_log for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Internal notes (per campaign)
create table if not exists internal_notes (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  text not null,
  owner_id     uuid not null references auth.users(id) on delete cascade,
  author_email text,
  note         text not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists internal_notes_campaign_idx on internal_notes(campaign_id, created_at);
alter table internal_notes enable row level security;
drop policy if exists "own notes" on internal_notes;
create policy "own notes" on internal_notes for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
