begin;

-- Merge only the edited keys while holding the row lock. Concurrent theme,
-- favorite-civ and map-contrast saves must not replace each other's settings.
create or replace function public.patch_user_settings(
  expected_user_id uuid, patch jsonb, only_missing boolean default false
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare saved jsonb;
begin
  if auth.uid() is null or auth.uid() is distinct from expected_user_id then
    raise exception 'Account changed. Sign in and retry.' using errcode = '42501';
  end if;
  if patch is null or jsonb_typeof(patch) <> 'object' then
    raise exception 'Settings patch must be an object.' using errcode = '22023';
  end if;
  insert into public.profiles(id,email)
    values(auth.uid(),auth.jwt()->>'email') on conflict(id) do nothing;
  insert into public.user_settings(user_id,settings,updated_at)
    values(auth.uid(),patch,now())
    on conflict(user_id) do update set
      settings = case when only_missing
        then excluded.settings || public.user_settings.settings
        else public.user_settings.settings || excluded.settings end,
      updated_at = now()
    returning settings into saved;
  return saved;
end $$;
revoke all on function public.patch_user_settings(uuid,jsonb,boolean) from public, anon;
grant execute on function public.patch_user_settings(uuid,jsonb,boolean) to authenticated;

-- Profile owners may edit their name, but only the verifier or administrator
-- may grant donation access. Keep existing owner RLS policies in force.
create or replace function public.protect_supporter_access()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user in ('anon','authenticated') then
    if tg_op = 'INSERT' then
      if coalesce(new.can_edit,false) then
        raise exception 'Supporter access is managed by the verifier.' using errcode = '42501';
      end if;
    elsif new.can_edit is distinct from old.can_edit then
      raise exception 'Supporter access is managed by the verifier.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_supporter_access on public.profiles;
create trigger protect_supporter_access before insert or update on public.profiles
for each row execute function public.protect_supporter_access();

notify pgrst, 'reload schema';
commit;
