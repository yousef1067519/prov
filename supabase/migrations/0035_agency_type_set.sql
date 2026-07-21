-- Onboarding: track whether the user has explicitly chosen their agency vertical.
-- agency_type already exists (0032) but defaults to 'ima', so it can't tell us
-- "not chosen yet". This flag flips true the first time they pick in onboarding.
alter table profiles add column if not exists agency_type_set boolean not null default false;

comment on column profiles.agency_type_set is
  'true once the user has explicitly chosen their agency vertical in onboarding';
