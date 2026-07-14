-- Saved PDF reports (metadata; the PDF file lives in the private 'reports' Storage bucket).
-- Safe + idempotent. Run in Supabase → SQL Editor.
create table if not exists reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  campaign_id   text,
  campaign_name text,
  file_path     text not null,
  created_at    timestamptz default now()
);
create index if not exists reports_user_idx on reports(user_id, created_at desc);
alter table reports enable row level security;
create policy "own reports" on reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
