-- 0008: Automated follow-ups + server-side Gmail tokens.
-- Run in the Supabase SQL editor. Safe to run multiple times.

-- Google OAuth refresh tokens, stored server-side so scheduled sends (cron)
-- can send from the user's Gmail without a browser session. Service-role
-- access only: RLS enabled with NO policies.
create table if not exists google_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  refresh_token text not null,
  updated_at timestamptz default now()
);
alter table google_tokens enable row level security;

-- Scheduled follow-up emails. The cron dispatcher sends due rows and skips
-- anyone who already replied or unsubscribed.
create table if not exists scheduled_emails (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid,
  recipient_email text not null,
  recipient_name text,
  recipient_type text not null default 'creator',
  subject text not null,
  body text not null,
  send_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sent','cancelled','failed')),
  fail_reason text,
  created_at timestamptz default now()
);
alter table scheduled_emails enable row level security;
create index if not exists scheduled_emails_due_idx on scheduled_emails(status, send_at);
create index if not exists scheduled_emails_owner_idx on scheduled_emails(owner_id);
