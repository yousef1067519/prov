-- Prov complete schema — IMA automation platform

-- Enums
create type platform_type as enum ('YouTube', 'TikTok', 'Instagram', 'Twitch', 'LinkedIn');
create type niche_type as enum ('Food','Gaming','Education','Beauty','Business','Lifestyle','Tech','Fitness','Finance','Fashion','Travel');
create type access_type as enum ('trial', 'lifetime', 'none');
create type campaign_status as enum ('draft', 'active', 'closed', 'won');
create type email_status as enum ('pending', 'sent', 'opened', 'clicked', 'replied', 'bounced');
create type recipient_type as enum ('creator', 'sponsor');

-- Profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  access_type access_type not null default 'none',
  trial_start timestamptz,
  trial_end timestamptz,
  trial_ip inet,
  lifetime_purchased_at timestamptz,
  -- White labeling (Feature 5)
  white_label_enabled boolean default false,
  white_label_domain text,
  white_label_logo_url text,
  white_label_colors jsonb default '{}',
  white_label_name text,
  white_label_footer text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- IP trial dedup
create table trials (
  id uuid primary key default gen_random_uuid(),
  ip_address inet not null,
  email text not null,
  status text not null default 'pending',
  created_at timestamptz default now()
);
create unique index trials_ip_idx on trials(ip_address);

-- Creators (from CSV)
create table creators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  niche niche_type not null,
  platform platform_type not null,
  subscribers integer not null default 0,
  avg_views integer not null default 0,
  engagement_rate numeric(5,2) not null default 0,
  email text,
  country text,
  language text,
  handle text,
  source text,
  cpm_estimate numeric default 0,
  total_revenue_generated numeric default 0,
  campaigns_count integer default 0,
  followers_history jsonb default '[]',
  engagement_history jsonb default '[]',
  avg_views_history jsonb default '[]',
  created_at timestamptz default now()
);
create index creators_niche_idx on creators(niche);
create index creators_platform_idx on creators(platform);
create index creators_subscribers_idx on creators(subscribers desc);
-- Dedupe key for the scraper/importer: one row per (platform, handle).
-- A real unique constraint (not partial) so upsert ON CONFLICT can use it.
alter table creators add constraint creators_platform_handle_key unique (platform, handle);

-- Per-creator performance log (Feature 2: Creator Performance Tracking).
create table if not exists creator_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  creator_id text not null,
  date date not null default current_date,
  followers integer not null default 0,
  engagement numeric(5,2) not null default 0,
  avg_views integer not null default 0,
  created_at timestamptz default now(),
  unique (creator_id, date)
);
create index creator_perf_creator_idx on creator_performance(creator_id);

-- Sponsors
create table sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry niche_type not null,
  website text,
  typical_budget text not null default '$1,000 - $5,000',
  description text,
  created_at timestamptz default now()
);
create index sponsors_industry_idx on sponsors(industry);

-- Campaigns
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'New Campaign',
  niche niche_type,
  status campaign_status not null default 'draft',
  creator_ids uuid[] default '{}',
  sponsor_ids uuid[] default '{}',
  client_name text,
  client_email text,
  client_access_token text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Client Portal (Feature 4)
create table if not exists content_approvals (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  access_token text,
  title text not null,
  content_url text,
  preview text,
  status text not null default 'pending' check (status in ('pending','approved','changes_requested')),
  comments text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index content_approvals_token_idx on content_approvals(access_token);

create table if not exists portal_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  access_token text,
  sender text not null default 'client' check (sender in ('client','agency')),
  message text not null,
  created_at timestamptz default now()
);
create index portal_messages_token_idx on portal_messages(access_token);
create index campaigns_user_idx on campaigns(user_id);

-- Emails sent
create table emails_sent (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_email text not null,
  recipient_name text,
  recipient_type recipient_type not null,
  subject text not null,
  body text not null,
  status email_status not null default 'pending',
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  tracking_id uuid default gen_random_uuid(),
  sent_at timestamptz,
  created_at timestamptz default now()
);
create index emails_campaign_idx on emails_sent(campaign_id);
create index emails_tracking_idx on emails_sent(tracking_id);

-- Responses (inbound replies)
create table responses (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  email_id uuid references emails_sent(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  from_email text not null,
  from_name text,
  message text not null,
  recipient_type recipient_type,
  ai_suggestion text,
  sent_response text,
  deal_status text default 'interested',
  created_at timestamptz default now()
);
create index responses_campaign_idx on responses(campaign_id);

-- RLS
alter table profiles enable row level security;
alter table trials enable row level security;
alter table creators enable row level security;
alter table sponsors enable row level security;
alter table campaigns enable row level security;
alter table emails_sent enable row level security;
alter table responses enable row level security;

-- Profiles policies
create policy "own profile" on profiles for all using (auth.uid() = id);

-- Trials — service role only
create policy "service trials" on trials for all using (true) with check (true);

-- Creators — any authenticated user with access
create policy "authed creators" on creators for select using (
  exists (
    select 1 from profiles p where p.id = auth.uid()
    and (p.access_type = 'lifetime' or (p.access_type = 'trial' and p.trial_end > now()))
  )
);

-- Sponsors — same as creators
create policy "authed sponsors" on sponsors for select using (
  exists (
    select 1 from profiles p where p.id = auth.uid()
    and (p.access_type = 'lifetime' or (p.access_type = 'trial' and p.trial_end > now()))
  )
);

-- Campaigns — own campaigns only
create policy "own campaigns" on campaigns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Emails — own emails only
create policy "own emails" on emails_sent for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Responses — own responses only
create policy "own responses" on responses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into profiles(id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure handle_new_user();

-- updated_at helper
create or replace function update_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated_at before update on profiles for each row execute procedure update_updated_at();
create trigger campaigns_updated_at before update on campaigns for each row execute procedure update_updated_at();

-- ── Contracts ──────────────────────────────────────────────────
create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  type text not null check (type in ('influencer','sponsor')),
  creator_id uuid,
  sponsor_id uuid,
  counterparty_name text,
  body text not null,
  status text not null default 'draft' check (status in ('draft','sent','signed')),
  signed_date timestamptz,
  created_at timestamptz default now()
);
alter table contracts enable row level security;
create policy "own contracts" on contracts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists contract_templates (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('influencer','sponsor')),
  name text not null,
  body text not null,
  created_at timestamptz default now()
);

-- ── Phase 2: CRM / brands pipeline ─────────────────────────────
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  company text not null,
  contact_name text,
  email text,
  phone text,
  website text,
  budget_range text,
  stage text not null default 'Prospect'
    check (stage in ('Prospect','Contacted','Follow-up','Negotiating','Active Client','Lost')),
  notes text,
  last_contact date,
  next_followup date,
  created_at timestamptz default now()
);
alter table brands enable row level security;
create policy "own brands" on brands for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Phase 2: invoicing ─────────────────────────────────────────
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  brand_id uuid references brands(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  number text,
  brand_name text,
  amount numeric not null default 0,
  status text not null default 'draft' check (status in ('draft','sent','paid','overdue')),
  due_date date,
  created_at timestamptz default now()
);
alter table invoices enable row level security;
create policy "own invoices" on invoices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Phase 2: team workspace ────────────────────────────────────
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  member_email text not null,
  role text not null default 'Team Member' check (role in ('Admin','Manager','Team Member')),
  created_at timestamptz default now()
);
alter table team_members enable row level security;
create policy "own team" on team_members for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ── Phase 2: connected email accounts ──────────────────────────
create table if not exists email_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  provider text not null default 'gmail',
  address text not null,
  connected_at timestamptz default now()
);
alter table email_accounts enable row level security;
create policy "own email accounts" on email_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Phase 2: agency branding on profiles ───────────────────────
alter table profiles add column if not exists agency_name text;
alter table profiles add column if not exists agency_title text;
alter table profiles add column if not exists company_name text;
alter table profiles add column if not exists company_email text;
alter table profiles add column if not exists company_website text;
alter table profiles add column if not exists company_phone text;
alter table profiles add column if not exists company_logo_url text;

-- ── ProvBot system: support tickets + per-user assistant memory ─
-- Admin dashboard reads all tickets via service role + ADMIN_EMAILS allowlist (no admin RLS).
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
create policy "own tickets read"   on support_tickets for select using (auth.uid() = user_id);
create policy "own tickets insert" on support_tickets for insert with check (auth.uid() = user_id);

create table if not exists user_memory (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  profile         jsonb not null default '{}',
  history_summary text  not null default '',
  facts           jsonb not null default '[]',
  updated_at      timestamptz default now()
);
alter table user_memory enable row level security;
create policy "own memory" on user_memory for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- AI Discovery search history (saved searches, off localStorage → DB).
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

-- Saved PDF reports (file in the private 'reports' Storage bucket).
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

-- Feature 2: Team Workspace
alter table team_members add column if not exists status text not null default 'active'
  check (status in ('pending', 'active', 'removed'));
alter table campaigns add column if not exists assigned_to uuid references auth.users(id);

create table if not exists team_activity_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  actor_email text, action text not null, resource_type text, resource_id text,
  meta jsonb default '{}', created_at timestamptz default now()
);
create index if not exists team_activity_owner_idx on team_activity_log(owner_id, created_at desc);
alter table team_activity_log enable row level security;
create policy "own activity" on team_activity_log for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table if not exists internal_notes (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  author_email text, note text not null,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index if not exists internal_notes_campaign_idx on internal_notes(campaign_id, created_at);
alter table internal_notes enable row level security;
create policy "own notes" on internal_notes for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Feature 5 (partial): outbound notification webhooks
create table if not exists integration_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  slack_webhook_url text, zapier_webhook_url text, updated_at timestamptz default now()
);
alter table integration_settings enable row level security;
create policy "own integrations" on integration_settings for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
