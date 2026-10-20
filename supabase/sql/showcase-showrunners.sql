-- Apply after supporter-showcases.sql. Showrunner status grants showcase editing only.
begin;
create table if not exists public.showcase_showrunners (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.showcase_showrunners enable row level security;
revoke all on public.showcase_showrunners from public,anon,authenticated;
grant all on public.showcase_showrunners to service_role;

-- Verified Coiot account; mutable public usernames never grant access.
insert into public.showcase_showrunners(user_id)
select id from public.profiles where id='88c12d80-cdc8-44cf-a174-a75c63bb5936' and username='Coiot'
on conflict do nothing;

create or replace function public.can_edit_supporter_showcase()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (public.has_supporter_access() or
    exists(select 1 from public.showcase_showrunners where user_id=auth.uid()));
$$;
revoke all on function public.can_edit_supporter_showcase() from public,anon;
grant execute on function public.can_edit_supporter_showcase() to authenticated;

create or replace function public.get_my_showcase_access()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in to check showcase access.' using errcode='42501'; end if;
  return jsonb_build_object('allowed',public.can_edit_supporter_showcase(),
    'is_showrunner',exists(select 1 from public.showcase_showrunners where user_id=auth.uid()),
    'status',public.supporter_status_for(auth.uid())->>'status');
end $$;
revoke all on function public.get_my_showcase_access() from public,anon;
grant execute on function public.get_my_showcase_access() to authenticated;

create or replace function public.guard_supporter_showcase()
returns trigger language plpgsql set search_path = '' as $$
declare scene jsonb; view_id uuid;
begin
  if current_user in ('anon','authenticated') then
    if auth.uid() is distinct from new.user_id then raise exception 'Only the owner can save a showcase.' using errcode='42501'; end if;
    if tg_op='UPDATE' and (new.id,new.user_id) is distinct from (old.id,old.user_id) then
      raise exception 'Showcase identity cannot be changed.' using errcode='42501';
    end if;
    if not public.can_edit_supporter_showcase() and not (tg_op='UPDATE' and not new.published and
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

create or replace function public.get_supporter_showcase(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',s.id,'display_name',case when nullif(btrim(p.username),'') is not null
    and position('@' in p.username)=0 then p.username else 'CBR supporter' end,
    'flair',left(coalesce(u.settings->>'customFlair',''),40),'favorite_civ',coalesce(u.settings->>'favoriteCiv',''),
    'introduction',s.introduction,'competitors',s.competitors,'scenes',s.scenes,
    'is_showrunner',exists(select 1 from public.showcase_showrunners where user_id=s.user_id),
    'active',coalesce((public.supporter_status_for(s.user_id)->>'allowed')::boolean,false),
    'map_views',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'title',v.title,'description',v.description,'settings',v.settings)
      order by array_position(s.map_views,v.id)) from public.map_saved_views v
      where v.id=any(s.map_views) and v.user_id=s.user_id and v.visibility='public' and not v.is_hidden),'[]'::jsonb))
  from public.supporter_showcases s left join public.profiles p on p.id=s.user_id
  left join public.user_settings u on u.user_id=s.user_id where s.id=p_id and s.published;
$$;

create or replace function public.list_supporter_directory(p_search text default '',p_civ text default '',p_offset integer default 0)
returns jsonb language sql stable security definer set search_path = '' as $$
  with roster as materialized (
    select r.*,s.id as showcase_id,s.introduction,left(coalesce(u.settings->>'customFlair',''),40) as flair
    from public.supporter_credit_roster() r
    left join public.supporter_showcases s on s.user_id=r.user_id and s.published
    left join public.user_settings u on u.user_id=r.user_id
    left join public.supporter_directory_preferences d on d.user_id=r.user_id
    where not coalesce(d.hidden,false) and not exists(select 1 from public.showcase_showrunners where user_id=r.user_id)
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

create or replace function public.list_showrunner_showcases()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.get_supporter_showcase(s.id) order by lower(p.username),s.id),'[]'::jsonb)
  from public.showcase_showrunners r join public.supporter_showcases s on s.user_id=r.user_id and s.published
  join public.profiles p on p.id=r.user_id
  left join public.supporter_directory_preferences d on d.user_id=r.user_id
  where not coalesce(d.hidden,false);
$$;
revoke all on function public.list_showrunner_showcases() from public;
grant execute on function public.list_showrunner_showcases() to anon,authenticated;
notify pgrst,'reload schema';
commit;
