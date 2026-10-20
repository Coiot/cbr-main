-- Requires supporter-access.sql and supporter-showcases.sql. Repeatable migration.
begin;
create or replace function public.valid_collection_scenes(scenes jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare s jsonb;
begin
  if jsonb_typeof(scenes) is distinct from 'array' or jsonb_array_length(scenes)>100 then return false; end if;
  for s in select value from jsonb_array_elements(scenes) loop
    if jsonb_typeof(s) is distinct from 'object'
      or coalesce(s->>'path','') !~ '^/albums/(s[0-9]+/[A-Za-z0-9._-]+|pr/s[0-9]+pr[0-9]+)/$'
      or jsonb_typeof(s->'number') is distinct from 'number'
      or coalesce(s->>'number','') !~ '^[1-9][0-9]{0,4}$'
      or (s ? 'note' and (jsonb_typeof(s->'note') is distinct from 'string' or length(s->>'note')>400))
      or exists(select 1 from jsonb_object_keys(s) k where k not in ('path','number','note')) then return false; end if;
  end loop;
  return jsonb_array_length(scenes)=(select count(distinct (entry.value->>'path',entry.value->>'number')) from jsonb_array_elements(scenes) entry);
end $$;
create table if not exists public.scene_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(length(btrim(title)) between 1 and 80),
  description text not null default '' check(length(description)<=600),
  scenes jsonb not null default '[]' check(public.valid_collection_scenes(scenes)),
  published boolean not null default false,
  featured boolean not null default false,
  is_hidden boolean not null default false,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scene_collections_owner on public.scene_collections(user_id);
create index if not exists scene_collections_public on public.scene_collections(updated_at desc,id) where published and not is_hidden;
alter table public.scene_collections enable row level security;
drop policy if exists collections_owner on public.scene_collections;
create policy collections_owner on public.scene_collections for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.scene_collections from public,anon,authenticated;
grant select on public.scene_collections to authenticated;
grant all on public.scene_collections to service_role;

-- All owner mutations serialize per account, including limits and concurrent scene additions.
-- Saves use revisions so an old editor cannot silently overwrite another tab's changes.
create or replace function public.change_scene_collection(p_action text,p_id uuid default null,p_revision integer default null,p_draft jsonb default '{}',p_scenes jsonb default '[]')
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); c public.scene_collections; item jsonb;
begin
  if uid is null then raise exception 'Sign in to manage collections.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('scene-collections:'||uid::text,0));
  if p_id is not null then
    select * into c from public.scene_collections where id=p_id and user_id=uid for update;
    if not found then raise exception 'Collection unavailable.' using errcode='P0002'; end if;
  end if;
  if p_action='delete' and p_id is not null then
    delete from public.scene_collections where id=c.id; return jsonb_build_object('id',c.id);
  elsif p_action='private' and p_id is not null then
    update public.scene_collections set published=false,featured=false,revision=revision+1,updated_at=now() where id=c.id returning * into c;
    return to_jsonb(c)-'user_id';
  end if;
  if not coalesce((public.supporter_status_for(uid)->>'allowed')::boolean,false) then
    raise exception 'Current supporter access is required.' using errcode='42501';
  end if;
  if p_action not in ('save','add') or p_action is null then raise exception 'Unknown action.' using errcode='22023'; end if;
  if p_id is null then
    if (select count(*) from public.scene_collections where user_id=uid)>=20 then raise exception 'Collection limit reached.' using errcode='23514'; end if;
    c.user_id:=uid; c.title:=btrim(p_draft->>'title'); c.description:=''; c.scenes:='[]'; c.published:=false; c.featured:=false;
  elsif p_action='save' and p_revision is distinct from c.revision then
    raise exception 'This collection changed in another tab.' using errcode='40001';
  end if;
  if p_action='save' then
    c.title:=btrim(p_draft->>'title'); c.description:=btrim(coalesce(p_draft->>'description',''));
    c.scenes:=coalesce(p_draft->'scenes','[]'); c.published:=coalesce((p_draft->>'published')::boolean,false);
    c.featured:=coalesce((p_draft->>'featured')::boolean,false) and c.published;
  else
    if not public.valid_collection_scenes(p_scenes) then raise exception 'Invalid scenes.' using errcode='23514'; end if;
    for item in select value from jsonb_array_elements(p_scenes) loop
      if not exists(select 1 from jsonb_array_elements(c.scenes) s where s->>'path'=item->>'path' and s->>'number'=item->>'number') then
        c.scenes:=c.scenes||jsonb_build_array(item);
      end if;
    end loop;
  end if;
  if c.featured and (select count(*) from public.scene_collections where user_id=uid and featured and id is distinct from p_id)>=3 then
    raise exception 'Choose up to three featured collections.' using errcode='23514';
  end if;
  if p_id is null then
    insert into public.scene_collections(user_id,title,description,scenes,published,featured)
      values(uid,c.title,c.description,c.scenes,c.published,c.featured) returning * into c;
  else
    update public.scene_collections set title=c.title,description=c.description,scenes=c.scenes,published=c.published,featured=c.featured,
      revision=revision+1,updated_at=now() where id=p_id returning * into c;
  end if;
  return to_jsonb(c)-'user_id';
end $$;
revoke all on function public.change_scene_collection(text,uuid,integer,jsonb,jsonb) from public;
grant execute on function public.change_scene_collection(text,uuid,integer,jsonb,jsonb) to authenticated;

create or replace function public.get_scene_collection(p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',c.id,'title',c.title,'description',c.description,'scenes',c.scenes,
    'display_name',case when nullif(btrim(p.username),'') is not null and position('@' in p.username)=0 then p.username else 'CBR reader' end,
    'showcase_id',s.id,'updated_at',c.updated_at)
  from public.scene_collections c left join public.profiles p on p.id=c.user_id
    left join public.supporter_showcases s on s.user_id=c.user_id and s.published
  where c.id=p_id and c.published and not c.is_hidden;
$$;
create or replace function public.list_scene_collections(p_search text default '',p_offset integer default 0,p_showcase uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
  with matching as (
    select c.*,case when nullif(btrim(p.username),'') is not null and position('@' in p.username)=0 then p.username else 'CBR reader' end as display_name,s.id as showcase_id
    from public.scene_collections c left join public.profiles p on p.id=c.user_id
    left join public.supporter_showcases s on s.user_id=c.user_id and s.published
    where c.published and not c.is_hidden
      and (p_showcase is null or (s.id=p_showcase and c.featured))
      and (coalesce(btrim(p_search),'')='' or position(lower(left(btrim(p_search),80)) in lower(c.title))>0)
  ), page as (select * from matching order by updated_at desc,id limit 24 offset greatest(0,least(coalesce(p_offset,0),100000)))
  select jsonb_build_object('total',(select count(*) from matching),'entries',coalesce((select jsonb_agg(jsonb_build_object(
    'id',id,'title',title,'description',description,'scene_count',jsonb_array_length(scenes),'display_name',display_name,'showcase_id',showcase_id) order by updated_at desc,id) from page),'[]'::jsonb));
$$;
revoke all on function public.get_scene_collection(uuid),public.list_scene_collections(text,integer,uuid) from public;
grant execute on function public.get_scene_collection(uuid),public.list_scene_collections(text,integer,uuid) to anon,authenticated;
notify pgrst,'reload schema';
commit;
