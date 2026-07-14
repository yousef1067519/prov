-- Prevents two different Prov customers from cold-emailing the same creator
-- at the same time. The creators table is shared across all workspaces (that's
-- the point — one growing database instead of everyone re-scraping); this adds
-- a lock so a creator someone recently contacted drops out of search results
-- for everyone else until the cooldown expires.
alter table creators add column if not exists last_contacted_at timestamptz;
alter table creators add column if not exists contacted_by uuid references auth.users(id) on delete set null;
create index if not exists creators_last_contacted_idx on creators(last_contacted_at);
