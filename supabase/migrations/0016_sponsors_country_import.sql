-- Sponsor scale-up: sponsors get a country (so campaigns can match brands in
-- the creator's market), a canonical niche (Tech/Beauty/… for the matching UI,
-- while industry keeps the real-world label like "cosmetics"), and a unique
-- website key so bulk imports upsert instead of duplicating. industry moves to
-- plain text — the niche_type enum can't hold real company-dataset labels.
alter table sponsors add column if not exists country text;
alter table sponsors add column if not exists email text; -- no-op if 0013 already ran
alter table sponsors add column if not exists niche text;
alter table sponsors alter column industry type text using industry::text;
-- Note: NOT partial — Postgres allows multiple NULLs in a unique index anyway,
-- and a partial index can't be targeted by ON CONFLICT upserts.
create unique index if not exists sponsors_website_key on sponsors(website);
create index if not exists sponsors_country_idx on sponsors(country);
create index if not exists sponsors_niche_idx on sponsors(niche);
