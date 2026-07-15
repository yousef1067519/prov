-- 0027: Workspace contacts — an agency's own creator/influencer rolodex, brought over
-- from their existing spreadsheets. Workspace-PRIVATE: this is never the shared 40k
-- discovery catalog (`creators`). Each agency's imported contacts belong only to them.

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  handle text,               -- @handle / username
  platform text,             -- YouTube / Instagram / TikTok / …
  niche text,
  followers bigint,
  email text,
  notes text,
  source text default 'import',
  created_at timestamptz default now()
);

create index if not exists contacts_workspace_idx on contacts(workspace_id);
create index if not exists contacts_ws_handle_idx on contacts(workspace_id, lower(handle));

alter table contacts enable row level security;

-- Any member of the workspace can read its contacts; working roles can mutate.
-- Mirrors the clients policies from 0020 (same helper functions).
create policy contacts_member_read on contacts for select
  using (workspace_id in (select member_workspace_ids()));
create policy contacts_manage on contacts for all
  using (role_in_workspace(workspace_id) in ('owner','admin','account_manager'))
  with check (role_in_workspace(workspace_id) in ('owner','admin','account_manager'));
