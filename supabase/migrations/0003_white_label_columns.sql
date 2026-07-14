-- Add the white-label columns to the live profiles table (they exist in schema.sql but
-- had drifted from the deployed DB). Safe + idempotent. Run in Supabase → SQL Editor.
alter table profiles add column if not exists white_label_enabled  boolean default false;
alter table profiles add column if not exists white_label_domain   text;
alter table profiles add column if not exists white_label_logo_url text;
alter table profiles add column if not exists white_label_colors   jsonb default '{}';
alter table profiles add column if not exists white_label_name     text;
alter table profiles add column if not exists white_label_footer   text;
