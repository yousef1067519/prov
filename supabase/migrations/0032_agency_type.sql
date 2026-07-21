-- ICP expansion foundation: which type of agency this account runs.
-- Drives terminology, default pipeline stages, and (later) vertical modules.
-- 'ima' = influencer marketing agency (the original ICP, default for existing rows).
alter table profiles add column if not exists agency_type text not null default 'ima'
  check (agency_type in ('ima', 'ugc', 'social', 'talent'));

comment on column profiles.agency_type is
  'Vertical preset: ima (influencer marketing agency), ugc (UGC/content agency), social (social media agency w/ influencer arm), talent (creator talent management).';
