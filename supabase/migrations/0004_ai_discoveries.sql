-- AI Discovery search history (moves saved searches off localStorage → DB).
-- Safe + idempotent. Run in Supabase → SQL Editor.
create table if not exists ai_discoveries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  query        text not null,
  filters      jsonb default '{}',
  result_count integer default 0,
  results      jsonb default '[]',
  created_at   timestamptz default now()
);
create index if not exists ai_discoveries_user_idx on ai_discoveries(user_id, created_at desc);
alter table ai_discoveries enable row level security;
create policy "own discoveries" on ai_discoveries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
