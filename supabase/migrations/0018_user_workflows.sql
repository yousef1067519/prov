-- Workflow Orchestration: agencies define their own ordered path through the
-- Performance Tracker (e.g. "Dealclosing Speedrun": capture → proven results → email).
-- Steps live in a JSONB array; the executor walks them in position order.

create table if not exists user_workflows (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  description text,
  icon text default '⚡',
  is_default boolean default false,

  -- Ordered steps: [{ step_id, position, section_type, title, description,
  --                   enabled, required, estimated_time_minutes, tips }]
  steps jsonb not null default '[]',

  -- Usage tracking
  runs_started int default 0,
  runs_completed int default 0,
  last_used_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_workflows_agency on user_workflows(agency_id);

-- Only one default workflow per agency (partial unique index — a table
-- constraint can't take a WHERE clause).
create unique index idx_workflows_one_default
  on user_workflows(agency_id) where is_default;

alter table user_workflows enable row level security;
create policy "agency_own_workflows"
  on user_workflows for all
  using (agency_id = auth.uid())
  with check (agency_id = auth.uid());
