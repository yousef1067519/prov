-- Run AFTER 0033 (in a separate transaction — new enum values can't be used in
-- the transaction that created them).
--
-- Every new signup (password or Google OAuth) starts on the free trial: full
-- dashboard access, 25 one-time send credits (see src/lib/credits.ts). When the
-- credits run out, sending is blocked with an upgrade prompt — the account and
-- its data stay intact. Existing profiles are untouched.
alter table profiles alter column access_type set default 'trial';

create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  begin
    insert into profiles (id, email, access_type) values (new.id, new.email, 'trial')
      on conflict (id) do nothing;
  exception when others then
    null; -- never block auth signup if the profile insert fails
  end;
  return new;
end;
$$;
