-- Migration: bring live `creators` table in line with schema.sql for the scraper importer.
-- Safe + idempotent: every statement is IF NOT EXISTS, re-runnable with no side effects.
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run.

-- Columns the /api/creators/import endpoint writes (these had drifted from schema.sql):
alter table creators add column if not exists handle   text;
alter table creators add column if not exists source   text;
alter table creators add column if not exists language text;

-- Other schema.sql columns (added defensively in case they also drifted):
alter table creators add column if not exists cpm_estimate            numeric default 0;
alter table creators add column if not exists total_revenue_generated numeric default 0;
alter table creators add column if not exists campaigns_count         integer default 0;
alter table creators add column if not exists followers_history       jsonb   default '[]';
alter table creators add column if not exists engagement_history      jsonb   default '[]';
alter table creators add column if not exists avg_views_history       jsonb   default '[]';

-- Dedupe key the importer upserts on: one row per (platform, handle).
create unique index if not exists creators_platform_handle_idx
  on creators(platform, handle) where handle is not null;
