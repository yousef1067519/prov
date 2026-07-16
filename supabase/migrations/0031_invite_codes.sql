-- 0031: one-time invite codes for team members. The manager invites → the member
-- gets a personal code by email → they redeem it at /join (new or existing account).
-- The code is the linking key, so the member's signup email doesn't have to match
-- the invite email. Cleared on redemption: strictly single-use.

alter table team_members add column if not exists invite_code text;
create unique index if not exists team_members_invite_code_idx on team_members (invite_code) where invite_code is not null;
