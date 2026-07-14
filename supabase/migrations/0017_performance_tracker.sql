-- Performance Tracker: Store completed campaign metrics as permanent assets
-- Solves: agencies lose deal value when campaigns end (no proof for future negotiations)
-- Solution: every completed campaign becomes a queryable performance record

create table if not exists performance_campaigns (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  creator_id uuid not null references creators(id) on delete cascade,

  -- Campaign metadata
  campaign_name text not null,
  brand_name text not null,
  creator_handle text not null,
  product_promoted text,
  campaign_date_posted timestamptz,
  campaign_status text not null default 'completed' check (campaign_status in ('active', 'completed', 'archived')),

  -- Platform & media links
  platforms jsonb default '{}', -- {youtube: {video_id, channel_id, url}, instagram: {post_id, url}, ...}

  -- Metrics (auto-pulled from YouTube or manual entry)
  metrics jsonb not null default '{
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "watch_time_seconds": 0,
    "clicks": 0,
    "sales": 0,
    "conversions": 0,
    "revenue_generated": 0,
    "engagement_rate": 0,
    "estimated_cpm": 0,
    "estimated_cpc": 0,
    "estimated_cpa": 0
  }',

  -- Calculated fields
  performance_score int default 0 check (performance_score >= 0 and performance_score <= 100),
  roi_generated numeric(10, 2),

  -- Attachments & notes
  attachments jsonb default '{}', -- {invoices: [...], contracts: [...], screenshots: [...], ...}
  notes text,
  brand_feedback text,

  -- Case study (future)
  is_case_study boolean default false,
  case_study_data jsonb,
  case_study_slug text unique,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for fast queries
create index idx_perf_agency on performance_campaigns(agency_id);
create index idx_perf_creator on performance_campaigns(creator_id);
create index idx_perf_campaign on performance_campaigns(campaign_id);
create index idx_perf_score on performance_campaigns(performance_score desc);
create index idx_perf_revenue on performance_campaigns(((metrics->>'revenue_generated')::numeric) desc);
create index idx_perf_views on performance_campaigns(((metrics->>'views')::bigint) desc);
create index idx_perf_date on performance_campaigns(campaign_date_posted desc);

-- RLS: Each agency sees only their own performance data
alter table performance_campaigns enable row level security;
create policy "agency_own_performance"
  on performance_campaigns for all
  using (agency_id = auth.uid())
  with check (agency_id = auth.uid());

-- AI Insights (nightly analysis by ProvBot)
create table if not exists creator_ai_insights (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references auth.users(id) on delete cascade,
  creator_id uuid not null references creators(id) on delete cascade,

  insight_type text not null, -- 'performance_pattern', 'platform_preference', 'brand_fit', 'trend', 'recommendation'
  insight_text text not null,
  metric_value numeric(10, 2), -- e.g. +0.8% trend
  confidence_score numeric(3, 2), -- 0-1 scale

  is_actionable boolean default false,
  next_action_recommendation text,

  generated_at timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_insights_agency on creator_ai_insights(agency_id);
create index idx_insights_creator on creator_ai_insights(creator_id);
create index idx_insights_type on creator_ai_insights(insight_type);

alter table creator_ai_insights enable row level security;
create policy "agency_own_insights"
  on creator_ai_insights for all
  using (agency_id = auth.uid())
  with check (agency_id = auth.uid());
