-- New-user signups were failing with an empty 500 because the on_auth_user_created trigger
-- (handle_new_user → insert into profiles) errored and aborted the auth user creation.
-- Make it exception-safe so a profile-insert problem can never block signup. Idempotent.
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  begin
    insert into profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  exception when others then
    null; -- never block auth signup if the profile insert fails
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure handle_new_user();
