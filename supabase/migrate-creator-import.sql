-- Run this once in the Supabase SQL editor to unblock the scraper import.
-- Adds the columns + dedupe index that POST /api/creators/import needs.
-- Safe to run multiple times (all statements are IF NOT EXISTS).

alter table creators add column if not exists handle text;
alter table creators add column if not exists source text;
alter table creators add column if not exists language text;
alter table creators add column if not exists email text;
alter table creators add column if not exists country text;
alter table creators add column if not exists cpm_estimate numeric default 0;
alter table creators add column if not exists total_revenue_generated numeric default 0;
alter table creators add column if not exists campaigns_count integer default 0;
alter table creators add column if not exists followers_history jsonb default '[]';
alter table creators add column if not exists engagement_history jsonb default '[]';
alter table creators add column if not exists avg_views_history jsonb default '[]';

-- One row per (platform, handle) so re-scraping refreshes instead of duplicating.
-- Must be a real UNIQUE CONSTRAINT (not a partial index) so the importer's
-- upsert ON CONFLICT (platform, handle) can use it. Null handles stay distinct,
-- so rows without a handle never collide.
drop index if exists creators_platform_handle_idx;
alter table creators drop constraint if exists creators_platform_handle_key;
alter table creators add constraint creators_platform_handle_key unique (platform, handle);
