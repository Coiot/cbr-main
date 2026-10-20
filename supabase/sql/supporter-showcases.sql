-- Requires supporter-credits.sql, account-sync.sql and map-saved-views.sql.
begin;

-- Shared private roster: the SVG and directory must honour the same payment/privacy rules.
create or replace function public.supporter_credit_roster()
returns table(user_id uuid, display_name text, favorite_civ text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not coalesce((select enabled from public.supporter_access_config where singleton),false) then
    raise exception 'Payment-based supporter access must be enabled before generating credits.';
  end if;
  return query
    with accounts as (
      select distinct on (lower(btrim(u.email))) lower(btrim(u.email)) as email,
        u.id,p.username,s.settings
      from auth.users u
      left join public.profiles p on p.id=u.id
      left join public.user_settings s on s.user_id=u.id
      where u.email_confirmed_at is not null and u.email is not null
      order by lower(btrim(u.email)),u.created_at desc,u.id
    ), active as (
      select p.email from public.supporter_payments p
        where p.revoked_at is null and p.expires_at > now()
      union
      select g.email from public.supporter_grants g
        where g.revoked_at is null and (g.expires_at is null or g.expires_at > now())
      union
      select a.email from public.supporter_grants g join accounts a on a.id=g.user_id
        where g.revoked_at is null and (g.expires_at is null or g.expires_at > now())
    )
    select a.id,
      case
        -- A new explicit private donation supersedes older public credit data.
        when d.kofi_paid_at is not null and not d.kofi_public then null
        else coalesce(nullif(btrim(a.username),''),nullif(btrim(d.legacy_name),''),
          case when d.kofi_public then nullif(btrim(d.kofi_name),'') end)
      end,
      case when coalesce(a.settings,'{}'::jsonb) ? 'favoriteCiv'
        then btrim(a.settings->>'favoriteCiv') else coalesce(d.legacy_civ,'') end
    from active x
    left join accounts a on a.email=x.email
    left join public.supporter_credit_details d on d.email=x.email
    where x.email is not null
    order by x.email;
end $$;
revoke all on function public.supporter_credit_roster() from public, anon, authenticated;
grant execute on function public.supporter_credit_roster() to service_role;

create or replace function public.get_supporter_credits()
returns table(display_name text, favorite_civ text)
language sql stable security definer set search_path = '' as $$
  select r.display_name,r.favorite_civ from public.supporter_credit_roster() r;
$$;
revoke all on function public.get_supporter_credits() from public,anon,authenticated;
grant execute on function public.get_supporter_credits() to service_role;

create table if not exists public.supporter_directory_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hidden boolean not null default false
);
alter table public.supporter_directory_preferences enable row level security;
drop policy if exists directory_preferences_owner on public.supporter_directory_preferences;
create policy directory_preferences_owner on public.supporter_directory_preferences to authenticated
  using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
revoke all on public.supporter_directory_preferences from public,anon,authenticated;
grant select,insert,update on public.supporter_directory_preferences to authenticated;
grant all on public.supporter_directory_preferences to service_role;

create table if not exists public.supporter_showcases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  introduction text not null default '' check(length(introduction)<=400),
  competitors text[] not null default '{}' check(cardinality(competitors)<=2),
  scenes jsonb not null default '[]' check(jsonb_typeof(scenes)='array' and jsonb_array_length(scenes)<=6),
  map_views uuid[] not null default '{}' check(cardinality(map_views)<=3),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.supporter_showcases enable row level security;
drop policy if exists showcases_owner on public.supporter_showcases;
create policy showcases_owner on public.supporter_showcases to authenticated
  using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
revoke all on public.supporter_showcases from public,anon,authenticated;
grant select,insert,update,delete on public.supporter_showcases to authenticated;
grant all on public.supporter_showcases to service_role;

create or replace function public.guard_supporter_showcase()
returns trigger language plpgsql set search_path = '' as $$
declare scene jsonb; view_id uuid;
begin
  if current_user in ('anon','authenticated') then
    if auth.uid() is distinct from new.user_id then raise exception 'Only the owner can save a showcase.' using errcode='42501'; end if;
    if tg_op='UPDATE' and (new.id,new.user_id) is distinct from (old.id,old.user_id) then
      raise exception 'Showcase identity cannot be changed.' using errcode='42501';
    end if;
    if not public.has_supporter_access() and not (tg_op='UPDATE' and not new.published and
      (new.introduction,new.competitors,new.scenes,new.map_views) is not distinct from
      (old.introduction,old.competitors,old.scenes,old.map_views)) then
      raise exception 'Current supporter access is required.' using errcode='42501';
    end if;
  end if;
  if exists(select 1 from unnest(new.competitors) c where c is null or length(btrim(c)) not between 1 and 80)
     or cardinality(new.competitors)<>(select count(distinct c) from unnest(new.competitors) c)
     or cardinality(new.map_views)<>(select count(distinct v) from unnest(new.map_views) v) then
    raise exception 'Choose distinct competitors and map views.' using errcode='23514';
  end if;
  if jsonb_typeof(new.scenes) is distinct from 'array' or jsonb_array_length(new.scenes)>6 then
    raise exception 'Choose up to six scenes.' using errcode='23514';
  end if;
  for scene in select value from jsonb_array_elements(new.scenes) loop
    if jsonb_typeof(scene) is distinct from 'object' or coalesce(scene->>'path','') !~ '^/albums/s[0-9]+/[A-Za-z0-9._-]+/$'
      or coalesce(scene->>'number','') !~ '^[1-9][0-9]{0,4}$' or not(scene ? 'path')
      or exists(select 1 from jsonb_object_keys(scene) k where k not in ('path','number')) then
      raise exception 'Invalid scene selection.' using errcode='23514';
    end if;
    if current_user in ('anon','authenticated') and
       (tg_op='INSERT' or not old.scenes @> jsonb_build_array(scene)) and not exists(
      select 1 from public.album_reactions r where r.user_id=new.user_id
        and regexp_replace(r.page_path,'/+$','')=regexp_replace(scene->>'path','/+$','')
        and r.scene_number=(scene->>'number')::integer
        and lower(regexp_replace(r.reaction_key,'[ _-]','','g')) in ('star','heart')) then
      raise exception 'Select scenes from your favourites.' using errcode='23514';
    end if;
  end loop;
  if (select count(*) from jsonb_array_elements(new.scenes))<>(select count(distinct value) from jsonb_array_elements(new.scenes)) then
    raise exception 'Choose distinct scenes.' using errcode='23514';
  end if;
  -- Unpublishing must always remain possible, including after a selected view becomes private.
  if new.published or tg_op='INSERT' or new.map_views is distinct from old.map_views then
    foreach view_id in array new.map_views loop
      if not exists(select 1 from public.map_saved_views v where v.id=view_id and v.user_id=new.user_id
        and v.visibility='public' and not v.is_hidden) then
        raise exception 'Choose your own public map views.' using errcode='23514';
      end if;
    end loop;
  end if;
  new.introduction:=btrim(new.introduction); new.updated_at:=now();
  return new;
end $$;
drop trigger if exists guard_supporter_showcase on public.supporter_showcases;
create trigger guard_supporter_showcase before insert or update on public.supporter_showcases
  for each row execute function public.guard_supporter_showcase();

create or replace function public.get_supporter_showcase(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',s.id,'display_name',case when nullif(btrim(p.username),'') is not null
    and position('@' in p.username)=0 then p.username else 'CBR supporter' end,
    'flair',left(coalesce(u.settings->>'customFlair',''),40),'favorite_civ',coalesce(u.settings->>'favoriteCiv',''),
    'introduction',s.introduction,'competitors',s.competitors,'scenes',s.scenes,
    'active',coalesce((public.supporter_status_for(s.user_id)->>'allowed')::boolean,false),
    'map_views',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'title',v.title,'description',v.description,'settings',v.settings)
      order by array_position(s.map_views,v.id)) from public.map_saved_views v
      where v.id=any(s.map_views) and v.user_id=s.user_id and v.visibility='public' and not v.is_hidden),'[]'::jsonb))
  from public.supporter_showcases s left join public.profiles p on p.id=s.user_id
  left join public.user_settings u on u.user_id=s.user_id where s.id=p_id and s.published;
$$;
revoke all on function public.get_supporter_showcase(uuid) from public;
grant execute on function public.get_supporter_showcase(uuid) to anon,authenticated;

create or replace function public.lookup_supporter_showcases(p_user_ids uuid[])
returns table(user_id uuid,showcase_id uuid) language sql stable security definer set search_path = '' as $$
  select s.user_id,s.id from public.supporter_showcases s
  where s.published and s.user_id=any(p_user_ids[1:100]);
$$;
revoke all on function public.lookup_supporter_showcases(uuid[]) from public;
grant execute on function public.lookup_supporter_showcases(uuid[]) to anon,authenticated;

create or replace function public.list_supporter_directory(p_search text default '',p_civ text default '',p_offset integer default 0)
returns jsonb language sql stable security definer set search_path = '' as $$
  with roster as materialized (
    select r.*,s.id as showcase_id,s.introduction,left(coalesce(u.settings->>'customFlair',''),40) as flair
    from public.supporter_credit_roster() r
    left join public.supporter_showcases s on s.user_id=r.user_id and s.published
    left join public.user_settings u on u.user_id=r.user_id
    left join public.supporter_directory_preferences d on d.user_id=r.user_id
    where not coalesce(d.hidden,false) and lower(coalesce(btrim(r.display_name),''))<>'coiot'
  ), visible as (
    select * from roster where nullif(btrim(display_name),'') is not null and position('@' in display_name)=0
  ), matching as (
    select * from visible where (coalesce(btrim(p_search),'')='' or position(lower(left(btrim(p_search),80)) in lower(display_name))>0)
      and (coalesce(p_civ,'')='' or favorite_civ=p_civ)
  ), page as (
    select * from matching order by lower(display_name),coalesce(user_id::text,''),favorite_civ
      limit 24 offset greatest(0,least(coalesce(p_offset,0),100000))
  ) select jsonb_build_object(
    'entries',coalesce((select jsonb_agg(jsonb_build_object('display_name',display_name,'favorite_civ',favorite_civ,
      'showcase_id',showcase_id,'introduction',case when showcase_id is not null then introduction else '' end,
      'flair',case when showcase_id is not null then flair else '' end)) from page),'[]'::jsonb),
    'total',(select count(*) from matching),
    'civs',coalesce((select jsonb_agg(c order by c) from (select distinct favorite_civ as c from visible where favorite_civ<>'') choices),'[]'::jsonb),
    'anonymous_count',(select count(*) from roster where nullif(btrim(display_name),'') is null or position('@' in display_name)>0));
$$;
revoke all on function public.list_supporter_directory(text,text,integer) from public;
grant execute on function public.list_supporter_directory(text,text,integer) to anon,authenticated;
notify pgrst,'reload schema';
commit;
