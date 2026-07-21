-- Comp/redemption codes: single-use codes the owner hands out for free access.
-- Redeeming sets profiles.access_type to the code's plan and profiles.comp_until
-- to now + days. The proxy denies access once comp_until has passed (a real paid
-- subscription has comp_until = null, so it's never affected).

create table if not exists redemption_codes (
  code       text primary key,
  plan       text not null default 'solo',   -- access_type to grant (solo = $300 Premium)
  days       int  not null default 30,        -- length of free access
  used_by    uuid references auth.users(id),  -- null until redeemed
  used_at    timestamptz,
  note       text,                            -- optional: who it was given to
  created_at timestamptz not null default now()
);

-- Secret by default: RLS on, no policies => anon/authenticated clients can't read
-- or enumerate codes. The redeem API uses the service role, which bypasses RLS.
alter table redemption_codes enable row level security;

alter table profiles add column if not exists comp_until timestamptz;
comment on column profiles.comp_until is
  'if set, access_type is a comp grant that expires at this time (null = normal/paid access)';

-- One ready-to-use code for the $300 Premium plan (single use, 30 days free).
insert into redemption_codes (code, plan, days, note)
values ('H7K9QP', 'solo', 30, 'Premium — 1 month free')
on conflict (code) do nothing;
