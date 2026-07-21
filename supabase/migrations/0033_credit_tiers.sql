-- Credit-tier plans: Starter ($75, small credit bundle), Premium ($300, larger
-- bundle — internally 'solo'), and free trial (one-time credit bundle on signup).
-- Credits are computed live from emails_sent (rolling windows) exactly like the
-- original 0019 system — no counter tables to drift.
--
-- NOTE: 'solo' was referenced by app code since the Solo-plan launch but never
-- added to the access_type enum — this migration fixes that latent bug too.
alter type access_type add value if not exists 'solo';
alter type access_type add value if not exists 'starter';
alter type access_type add value if not exists 'trial';

-- 0019's index already covers (user_id, created_at desc) for cheap rolling counts.
