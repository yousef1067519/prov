-- Plan tiers for the credit system: Standard ($99, credit-limited) and
-- VIP ($299, unlimited). Existing 'lifetime' subscribers are grandfathered
-- and treated as VIP everywhere in the app.
alter type access_type add value if not exists 'standard';
alter type access_type add value if not exists 'vip';

-- Credit usage is computed live from emails_sent (rolling 4h window + rolling
-- 7d week) — no counter tables to drift. This index makes those counts cheap.
create index if not exists idx_emails_sent_user_created
  on emails_sent (user_id, created_at desc);
