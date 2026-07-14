-- Feature 3: Content Management — UGC files, approval status, version history.
-- File bytes live in the private 'campaign-content' Storage bucket. Idempotent.

create table if not exists content_items (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  text not null,
  owner_id     uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  description  text,
  file_path    text not null,
  file_type    text,                 -- video | image | document
  file_size    bigint default 0,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_comment text,
  reviewed_by  text,
  reviewed_at  timestamptz,
  version_num  integer not null default 1,
  uploaded_at  timestamptz default now()
);
create index if not exists content_items_campaign_idx on content_items(campaign_id, uploaded_at desc);
alter table content_items enable row level security;
drop policy if exists "own content" on content_items;
create policy "own content" on content_items for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table if not exists content_versions (
  id          uuid primary key default gen_random_uuid(),
  content_id  uuid not null references content_items(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  version_num integer not null,
  file_path   text not null,
  notes       text,
  uploaded_at timestamptz default now()
);
create index if not exists content_versions_content_idx on content_versions(content_id, version_num desc);
alter table content_versions enable row level security;
drop policy if exists "own versions" on content_versions;
create policy "own versions" on content_versions for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
