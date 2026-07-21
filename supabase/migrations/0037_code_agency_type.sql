-- Codes can now pin the redeemer to a specific agency vertical (so e.g. an IMA
-- code sets them up on the IMA system, skipping the front-screen picker).
alter table redemption_codes add column if not exists agency_type text
  check (agency_type is null or agency_type in ('ima', 'ugc', 'social', 'talent'));
comment on column redemption_codes.agency_type is
  'vertical to set on redemption; null = leave the redeemer''s current/default vertical alone';

update redemption_codes set agency_type = 'ima' where code = 'H7K9QP';
