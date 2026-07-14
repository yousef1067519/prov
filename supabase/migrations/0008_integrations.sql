-- Feature 5 (partial): outbound notification webhooks (Slack + Zapier). Idempotent.
create table if not exists integration_settings (
  owner_id           uuid primary key references auth.users(id) on delete cascade,
  slack_webhook_url  text,
  zapier_webhook_url text,
  updated_at         timestamptz default now()
);
alter table integration_settings enable row level security;
drop policy if exists "own integrations" on integration_settings;
create policy "own integrations" on integration_settings for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
