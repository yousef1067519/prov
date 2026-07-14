-- Client Portal persistence (moves the agency-side config from localStorage → DB).
-- Adds the client columns on campaigns and the content_approvals / portal_messages
-- tables that /api/portal/[token] (public read) and /api/portal/admin (agency write) use.
-- Idempotent — safe to run more than once.

alter table campaigns add column if not exists client_name text;
alter table campaigns add column if not exists client_email text;
alter table campaigns add column if not exists client_access_token text;

-- Unique token so a client portal link maps to exactly one campaign.
create unique index if not exists campaigns_client_access_token_idx
  on campaigns(client_access_token) where client_access_token is not null;

create table if not exists content_approvals (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  access_token text,
  title text not null default '',
  content_url text,
  preview text,
  status text not null default 'pending' check (status in ('pending','approved','changes_requested')),
  comments text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists content_approvals_token_idx on content_approvals(access_token);

create table if not exists portal_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  access_token text,
  sender text not null default 'client' check (sender in ('client','agency')),
  message text not null,
  created_at timestamptz default now()
);
create index if not exists portal_messages_token_idx on portal_messages(access_token);
