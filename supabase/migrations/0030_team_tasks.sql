-- 0030: Team assignments — the manager assigns work to members, members see their
-- own queue on the dashboard, and either side can comment. Workspace-scoped;
-- mirrors the RLS pattern of 0027 (member read, working-role write).

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  notes text,
  status text not null default 'open' check (status in ('open','in_progress','done')),
  assignee_email text,               -- member's email (matches team invite email)
  due_date date,
  -- lightweight comment thread: [{ by, text, at }]
  comments jsonb not null default '[]',
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_workspace_idx on tasks (workspace_id, status);
create index if not exists tasks_assignee_idx on tasks (workspace_id, lower(assignee_email));

alter table tasks enable row level security;

create policy tasks_member_read on tasks for select
  using (workspace_id in (select member_workspace_ids()));
create policy tasks_manage on tasks for all
  using (role_in_workspace(workspace_id) in ('owner','admin','account_manager'))
  with check (role_in_workspace(workspace_id) in ('owner','admin','account_manager'));
