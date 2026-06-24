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
  created_at timestamptz default now()
);
create index creators_niche_idx on creators(niche);
create index creators_platform_idx on creators(platform);
create index creators_subscribers_idx on creators(subscribers desc);

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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
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
