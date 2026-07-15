-- 0028: Self-hosted AI blog (replaces the Babylovegrowth subscription).
-- blog_posts: articles rendered at /blog. blog_topics: the generation queue the
-- daily cron works through. Content is public marketing material — RLS allows
-- anonymous READ of published posts only; all writes go through the service role.

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  meta_description text,
  content_html text not null,
  hero_image_url text,
  keywords text[] not null default '{}',
  seed_keyword text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists blog_posts_published_idx on blog_posts (published, created_at desc);

create table if not exists blog_topics (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  status text not null default 'queued' check (status in ('queued','generating','done','failed')),
  position int not null default 0,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists blog_topics_status_idx on blog_topics (status, position);

alter table blog_posts enable row level security;
alter table blog_topics enable row level security;

-- Public read of published posts (the site renders server-side, but this keeps an
-- anon read safe too). No anon/auth write policies: only the service role writes.
create policy blog_posts_public_read on blog_posts for select using (published = true);

-- Seed the topic queue: buyer-intent topics for influencer-marketing agencies.
insert into blog_topics (topic, position) values
  ('How influencer marketing agencies price sponsorship deals in 2026', 1),
  ('FTC disclosure requirements for sponsored content: an agency checklist', 2),
  ('How to write influencer outreach emails that actually get replies', 3),
  ('Influencer contract essentials: the clauses every agency deal needs', 4),
  ('How agencies vet creators: quality scores, brand safety, and red flags', 5),
  ('Audience overlap: why two creators can reach the same followers and how to avoid paying twice', 6),
  ('How to structure a creator kill fee (with example schedules)', 7),
  ('Usage rights in influencer deals: how long should a brand license content?', 8),
  ('CPM benchmarks for YouTube sponsorships by niche', 9),
  ('How to build an influencer marketing agency team: roles and responsibilities', 10),
  ('Spreadsheets vs software: when an agency should stop running deals in Google Sheets', 11),
  ('How to onboard a new brand client at an influencer agency', 12),
  ('Follow-up sequences: how many emails before a creator deal goes cold?', 13),
  ('The AI clause: handling synthetic media and AI content in creator contracts', 14),
  ('How to invoice brands as an influencer agency (numbering, tax, and terms)', 15),
  ('What is institutional memory and why agencies lose money without it', 16),
  ('Case study framework: turning a completed creator campaign into a sales asset', 17),
  ('Exclusivity clauses in influencer contracts: how much is too much?', 18),
  ('How to run influencer whitelisting and paid amplification deals', 19),
  ('Creator payment terms: net-30, split payments, and escrow explained', 20),
  ('How agencies should track creator performance across campaigns', 21),
  ('UGC vs influencer marketing: which should your client budget for?', 22),
  ('How to price retainers vs per-campaign fees as an agency', 23),
  ('Negotiating with creator managers and talent agencies: a field guide', 24),
  ('Client reporting for influencer campaigns: metrics brands actually care about', 25),
  ('How to handle a creator who misses a deliverable deadline', 26),
  ('Building a white-label client portal experience for agency clients', 27),
  ('GDPR and CASL rules for influencer outreach from agencies', 28),
  ('The account manager handoff: transferring creator relationships without losing deals', 29),
  ('How influencer agencies win their first 10 brand clients', 30)
on conflict do nothing;
