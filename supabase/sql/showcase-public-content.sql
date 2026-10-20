-- Apply after showcase-competitor-limit.sql and scene-collections.sql.
begin;
create or replace function public.valid_showcase_pins(pins jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare pin jsonb; key text;
begin
  if pins is null or jsonb_typeof(pins)<>'array' or jsonb_array_length(pins)>100 or octet_length(pins::text)>65536 then return false; end if;
  for pin in select value from jsonb_array_elements(pins) loop
    if jsonb_typeof(pin)<>'object' then return false; end if;
    foreach key in array array['map_id','name','tile_key','city_name','owner_name'] loop
      if jsonb_typeof(pin->key) is distinct from 'string' then return false; end if;
    end loop;
    if exists(select 1 from jsonb_object_keys(pin) k where k not in ('map_id','name','tile_key','city_name','owner_name'))
      or pin->>'map_id' !~ '^[A-Za-z0-9_-]{1,64}$' or length(btrim(pin->>'name')) not between 1 and 40
      or pin->>'tile_key' !~ '^[0-9]{1,3},[0-9]{1,3}$' or length(pin->>'city_name')>80 or length(pin->>'owner_name')>80 then return false; end if;
  end loop;
  return jsonb_array_length(pins)=(select count(distinct jsonb_build_array(p->>'map_id',p->>'tile_key',lower(btrim(p->>'name')))) from jsonb_array_elements(pins) p);
end $$;
revoke all on function public.valid_showcase_pins(jsonb) from public,anon;
grant execute on function public.valid_showcase_pins(jsonb) to authenticated,service_role;
alter table public.supporter_showcases add column if not exists map_pins jsonb not null default '[]';
alter table public.supporter_showcases drop constraint if exists supporter_showcases_map_pins_check;
alter table public.supporter_showcases add constraint supporter_showcases_map_pins_check check(public.valid_showcase_pins(map_pins));
create index if not exists showcase_note_history_lookup on public.tile_edits(map_id,tile_key,id);
create index if not exists showcase_note_author_lookup on public.tile_edits((coalesce(edited_by,user_id)),map_id,tile_key,id);
-- Cache just note text/locations, including drafts. Publication is checked at read time.
-- Public showcase reads must never decompress whole map snapshot payloads.
create table if not exists public.showcase_snapshot_notes (
  snapshot_id uuid not null references public.map_snapshots(id) on delete cascade,
  tile_key text not null,
  note text not null,
  primary key(snapshot_id,tile_key)
);
create table if not exists public.showcase_snapshot_note_state (
  snapshot_id uuid primary key references public.map_snapshots(id) on delete cascade,
  indexed_at timestamptz not null default now()
);
alter table public.showcase_snapshot_notes enable row level security;
alter table public.showcase_snapshot_note_state enable row level security;
revoke all on public.showcase_snapshot_notes,public.showcase_snapshot_note_state from public,anon,authenticated;
grant all on public.showcase_snapshot_notes,public.showcase_snapshot_note_state to service_role;
create index if not exists showcase_snapshot_notes_lookup on public.showcase_snapshot_notes(tile_key,md5(note));
create or replace function public.index_showcase_snapshot_notes(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  delete from public.showcase_snapshot_notes where snapshot_id=p_id;
  insert into public.showcase_snapshot_notes(snapshot_id,tile_key,note)
  select distinct on(e.value->>'tile_key') s.id,e.value->>'tile_key',btrim(e.value->'payload'->>'notes')
  from public.map_snapshots s cross join lateral jsonb_array_elements(case when jsonb_typeof(s.payload)='array' then s.payload else '[]'::jsonb end) with ordinality e(value,position)
  where s.id=p_id and e.value->>'tile_key' ~ '^[0-9]{1,3},[0-9]{1,3}$' and nullif(btrim(e.value->'payload'->>'notes'),'') is not null
  order by e.value->>'tile_key',e.position desc;
  insert into public.showcase_snapshot_note_state(snapshot_id,indexed_at) select id,now() from public.map_snapshots where id=p_id
    on conflict(snapshot_id) do update set indexed_at=excluded.indexed_at;
end $$;
revoke all on function public.index_showcase_snapshot_notes(uuid) from public,anon,authenticated;
grant execute on function public.index_showcase_snapshot_notes(uuid) to service_role;
create or replace function public.sync_showcase_snapshot_notes()
returns trigger language plpgsql security definer set search_path='' as $$
begin perform public.index_showcase_snapshot_notes(new.id); return new; end $$;
revoke all on function public.sync_showcase_snapshot_notes() from public,anon,authenticated;
drop trigger if exists sync_showcase_snapshot_notes on public.map_snapshots;
create trigger sync_showcase_snapshot_notes after insert or update of payload on public.map_snapshots for each row execute function public.sync_showcase_snapshot_notes();
select public.index_showcase_snapshot_notes(s.id) from public.map_snapshots s
  where not exists(select 1 from public.showcase_snapshot_note_state n where n.snapshot_id=s.id);


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
      (new.introduction,new.competitors,new.scenes,new.map_views,new.map_pins) is not distinct from
      (old.introduction,old.competitors,old.scenes,old.map_views,old.map_pins)) then
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
    'introduction',s.introduction,'competitors',s.competitors,'scenes',s.scenes,'map_pins',s.map_pins,
    'is_showrunner',exists(select 1 from public.showcase_showrunners where user_id=s.user_id),
    'active',coalesce((public.supporter_status_for(s.user_id)->>'allowed')::boolean,false),
    'map_views',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'title',v.title,'description',v.description,'settings',v.settings)
      order by array_position(s.map_views,v.id)) from public.map_saved_views v
      where v.id=any(s.map_views) and v.user_id=s.user_id and v.visibility='public' and not v.is_hidden),'[]'::jsonb))
  from public.supporter_showcases s left join public.profiles p on p.id=s.user_id
  left join public.user_settings u on u.user_id=s.user_id where s.id=p_id and s.published;
$$;

-- Only a published showcase, or its signed-in owner preview, can enumerate public creations.
-- Never return owner IDs, account settings, payments, private content, or snapshot payloads.
create or replace function public.get_showcase_public_content(p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  with target as materialized (
    select user_id,map_pins from public.supporter_showcases where id=p_id and (published or user_id=auth.uid())
  ), collections as (
    select c.id,c.title,c.description,jsonb_array_length(c.scenes) as scene_count,c.featured,c.updated_at
    from public.scene_collections c join target t on c.user_id=t.user_id where c.published and not c.is_hidden
  ), views as (
    select v.id,v.map_id,v.title,v.description,v.settings,v.updated_at
    from public.map_saved_views v join target t on v.user_id=t.user_id
    where v.visibility='public' and not v.is_hidden
      and public.map_view_source_available(v.map_id,coalesce(v.settings->>'snapshot',''))
      and public.map_view_source_available(v.map_id,coalesce(v.settings->>'compare',''))
  ), public_notes as materialized (
    select o.map_id,o.tile_key,o.snapshot_id,o.updated_at,nullif(btrim(o.payload->>'notes'),'') as note,
      coalesce(s.episode_label,'Live map') as source_label
    from public.tile_overrides o left join public.map_snapshots s on s.id=o.snapshot_id and s.map_id=o.map_id
    where o.map_id='s5' and (o.snapshot_id is null or s.is_published)
      and nullif(btrim(o.payload->>'notes'),'') is not null and exists(select 1 from target)
  ), note_keys as (
    select distinct map_id,tile_key from public_notes
    union select distinct e.map_id,e.tile_key from public.tile_edits e join target t
      on coalesce(e.edited_by,e.user_id)=t.user_id
      where e.map_id='s5' and nullif(btrim(e.payload->>'notes'),'') is not null
  ), history as materialized (
    select e.id,e.map_id,e.tile_key,coalesce(e.edited_by,e.user_id) as author,
      e.edited_at as at,
      nullif(btrim(e.payload->>'notes'),'') as note,
      lag(nullif(btrim(e.payload->>'notes'),'')) over(partition by e.map_id,e.tile_key order by e.id) as previous_note
    from public.tile_edits e join note_keys k on k.map_id=e.map_id and k.tile_key=e.tile_key
  ), notes as (
    select distinct on(o.map_id,o.tile_key,o.note) o.*
    from public_notes o cross join target t
    join lateral(select h.author from history h where h.map_id=o.map_id and h.tile_key=o.tile_key
      and h.note=o.note and h.note is distinct from h.previous_note and h.at<=o.updated_at
      order by h.id desc limit 1) a on a.author=t.user_id
    order by o.map_id,o.tile_key,o.note,o.updated_at desc
  ), authored_notes as (
    select h.map_id,h.tile_key,h.note,min(h.at) as authored_at
    from history h join target t on h.author=t.user_id
    where h.note is not null and h.note is distinct from h.previous_note
    group by h.map_id,h.tile_key,h.note
  ), archived_notes as (
    select a.map_id,a.tile_key,p.id as snapshot_id,a.authored_at as updated_at,a.note,p.episode_label as source_label
    from authored_notes a join lateral(
      select s.id,s.episode_label from public.showcase_snapshot_notes n join public.map_snapshots s on s.id=n.snapshot_id
      where n.tile_key=a.tile_key and md5(n.note)=md5(a.note) and n.note=a.note
        and s.map_id=a.map_id and s.is_published and s.created_at>=a.authored_at
      order by s.episode_at desc,s.created_at desc limit 1
    ) p on true
    where not exists(select 1 from notes n where n.map_id=a.map_id and n.tile_key=a.tile_key and n.note=a.note)
  ), all_notes as (select * from notes union all select * from archived_notes), snapshots as (
    select s.id,s.map_id,s.episode_label,s.episode_at from public.map_snapshots s join target t on s.created_by=t.user_id where s.is_published
  ), comments as (
    select c.id,c.page_path,c.message,c.created_at from public.album_comments c join target t on c.user_id=t.user_id
    where c.page_path ~ '^/albums/(s[0-9]+|mk[0-9]+|pr)/[A-Za-z0-9._-]+/$'
  ) select jsonb_build_object(
    'collections',coalesce((select jsonb_agg(to_jsonb(c) order by c.featured desc,c.updated_at desc,c.id) from collections c),'[]'::jsonb),
    'map_views',coalesce((select jsonb_agg(to_jsonb(v) order by v.updated_at desc,v.id) from views v),'[]'::jsonb),
    'map_pins',t.map_pins,
    'map_notes',coalesce((select jsonb_agg(to_jsonb(n) order by n.updated_at desc,n.map_id,n.tile_key) from all_notes n),'[]'::jsonb),
    'snapshots',coalesce((select jsonb_agg(to_jsonb(s) order by s.episode_at desc,s.id) from snapshots s),'[]'::jsonb),
    'comments',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc,c.id) from comments c),'[]'::jsonb)
  ) from target t;
$$;
revoke all on function public.get_showcase_public_content(uuid) from public;
grant execute on function public.get_showcase_public_content(uuid) to anon,authenticated;
notify pgrst,'reload schema';
commit;
