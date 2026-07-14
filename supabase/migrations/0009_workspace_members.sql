-- Make team members real: link their auth user + let them access the owner's workspace.
-- Idempotent. Run in Supabase → SQL Editor.

-- Link a member row to the actual auth user who accepted the invite.
alter table team_members add column if not exists member_user_id uuid references auth.users(id);
create index if not exists team_members_member_user_idx on team_members(member_user_id);

-- A member must be able to SELECT their own membership row (the "own team" policy only
-- lets the owner see it). Add a second select policy for the member side.
drop policy if exists "see own membership" on team_members;
create policy "see own membership" on team_members for select using (member_user_id = auth.uid());

-- True when the current user is an active member of `owner`'s workspace.
create or replace function is_workspace_member(owner uuid) returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from team_members tm
    where tm.owner_id = owner and tm.member_user_id = auth.uid() and tm.status = 'active'
  );
$$;

-- Open the workspace-shared tables to active members (owner OR member of that owner).
do $$
declare t text;
begin
  foreach t in array array['internal_notes', 'content_items', 'content_versions', 'team_activity_log', 'ai_discoveries', 'reports', 'integration_settings'] loop
    if exists (select 1 from information_schema.tables where table_name = t) then
      execute format('drop policy if exists "workspace %1$s" on %1$I', t);
      -- These tables use owner_id, except reports/ai_discoveries which use user_id.
      if t in ('reports', 'ai_discoveries') then
        execute format('create policy "workspace %1$s" on %1$I for all using (auth.uid() = user_id or is_workspace_member(user_id)) with check (auth.uid() = user_id or is_workspace_member(user_id))', t);
      else
        execute format('create policy "workspace %1$s" on %1$I for all using (auth.uid() = owner_id or is_workspace_member(owner_id)) with check (auth.uid() = owner_id or is_workspace_member(owner_id))', t);
      end if;
    end if;
  end loop;
end $$;
