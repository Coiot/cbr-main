-- Personal, turn-specific edits and public notes by author. No legacy-map import.
begin;
create table if not exists public.map_view_layers (
  view_id uuid primary key references public.map_saved_views(id) on delete cascade,
  history uuid not null,layer jsonb not null,revision integer not null default 1,
  public_end_turn integer not null,updated_at timestamptz not null default now(),
  check(octet_length(layer::text)<=1048576)
);
create table if not exists public.map_tile_notes (
  history uuid not null,tile integer not null check(tile between 0 and 16919),
  author uuid not null references auth.users(id) on delete cascade,
  body text not null check(length(body)<=2000),revision integer not null,
  is_deleted boolean not null default false,is_hidden boolean not null default false,
  public_end_turn integer not null,updated_at timestamptz not null default now(),
  primary key(history,tile,author)
);
create table if not exists public.map_tile_note_history (
  id bigint generated always as identity primary key,history uuid not null,tile integer not null,
  author uuid not null,record jsonb not null,changed_by uuid not null,created_at timestamptz not null default now()
);
alter table public.map_view_layers enable row level security;
alter table public.map_tile_notes enable row level security;
alter table public.map_tile_note_history enable row level security;
revoke all on public.map_view_layers,public.map_tile_notes,public.map_tile_note_history from public,anon,authenticated;
grant all on public.map_view_layers,public.map_tile_notes,public.map_tile_note_history to service_role;
grant usage,select on sequence public.map_tile_note_history_id_seq to service_role;

create or replace function public.is_map_layer_moderator(p_actor uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select p_actor is not null and (p_actor='88c12d80-cdc8-44cf-a174-a75c63bb5936'::uuid or exists(select 1 from public.map_admins where map_id='s5' and user_id=p_actor));
$$;
create or replace function public.can_manage_map_layers(p_actor uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select p_actor is not null and (public.is_map_layer_moderator(p_actor) or coalesce((public.supporter_status_for(p_actor)->>'allowed')::boolean,false));
$$;

create or replace function public.save_map_view_layer(p_actor uuid,p_id uuid,p_expected integer,p_title text,p_description text,p_visibility text,p_settings jsonb,p_layer jsonb,p_history uuid,p_cap integer)
returns setof public.map_saved_views language plpgsql security definer set search_path='' as $$
declare active public.map_releases; target uuid:=coalesce(p_id,gen_random_uuid()); existing public.map_saved_views; old_revision integer; old_cap integer;
begin
  if not public.can_manage_map_layers(p_actor) then raise exception 'Current supporter access is required.' using errcode='42501'; end if;
  select r.* into active from public.map_release_control c join public.map_releases r on r.id=c.active_release where c.map_id='s5' and c.enabled for share of c;
  if active.id is null or active.history<>p_history or p_cap is distinct from active.last_turn then raise exception 'The public map changed. Reload before saving.'; end if;
  if not public.valid_map_view_settings(p_settings) or p_settings->>'snapshot' not like 'timeline:'||p_history::text||':%'
    or not public.map_view_source_available('s5',p_settings->>'snapshot') or not public.map_view_source_available('s5',p_settings->>'compare')
    or p_settings->>'overlay' in ('population','religion') then raise exception 'Choose a published timeline view.'; end if;
  if p_layer->>'format' is distinct from 'cbr-map-view-layer' or p_layer->'version' is distinct from '1'::jsonb or p_layer->>'history' is distinct from p_history::text
    or jsonb_typeof(p_layer->'edits') is distinct from 'array' or jsonb_typeof(p_layer->'notes') is distinct from 'array'
    or jsonb_array_length(p_layer->'edits')+jsonb_array_length(p_layer->'notes')>5000 or octet_length(p_layer::text)>1048576 then raise exception 'Invalid personal layer.'; end if;
  if exists(select 1 from jsonb_array_elements(p_layer->'edits') e where (e->>'turn')::integer not between 0 and p_cap or e->>'field' not in ('wonders','capital','puppeted','occupied','resistance','ideology','improvement','route','units','pillaged','ruins')) then raise exception 'Invalid or unreleased edit.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target::text,5));
  select * into existing from public.map_saved_views where id=target for update;
  if p_id is not null and (existing.id is null or existing.user_id<>p_actor or existing.is_hidden) then raise exception 'Only the view owner can update it.' using errcode='42501'; end if;
  select revision,public_end_turn into old_revision,old_cap from public.map_view_layers where view_id=target;
  if old_cap>p_cap then raise exception 'This view has edits beyond the current public endpoint. Save a new view instead.'; end if;
  if p_expected is null or coalesce(old_revision,0)<>p_expected then raise exception 'This view changed in another session. Reopen it before saving.'; end if;
  if existing.id is null then
    insert into public.map_saved_views(id,user_id,map_id,title,description,visibility,settings) values(target,p_actor,'s5',p_title,p_description,p_visibility,p_settings);
  else
    update public.map_saved_views set title=p_title,description=p_description,visibility=p_visibility,settings=p_settings where id=target;
  end if;
  insert into public.map_view_layers(view_id,history,layer,revision,public_end_turn) values(target,p_history,p_layer,p_expected+1,p_cap)
  on conflict(view_id) do update set layer=excluded.layer,history=excluded.history,revision=excluded.revision,public_end_turn=excluded.public_end_turn,updated_at=now();
  return query select * from public.map_saved_views where id=target;
end $$;

create or replace function public.write_map_tile_note(p_actor uuid,p_history uuid,p_tile integer,p_text text,p_expected integer,p_cap integer)
returns void language plpgsql security definer set search_path='' as $$
declare active public.map_releases; previous public.map_tile_notes;
begin
  if p_actor is null or p_tile not between 0 and 16919 or p_text is null or length(p_text)>2000 or p_expected is null then raise exception 'Invalid tile note.'; end if;
  select r.* into active from public.map_release_control c join public.map_releases r on r.id=c.active_release where c.map_id='s5' and c.enabled for share of c;
  if active.id is null or active.history<>p_history or p_cap is distinct from active.last_turn then raise exception 'The public map changed. Reload before saving.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_history::text||':'||p_tile||':'||p_actor,6));
  select * into previous from public.map_tile_notes where history=p_history and tile=p_tile and author=p_actor for update;
  if not public.can_manage_map_layers(p_actor) and not coalesce(btrim(p_text)='' and previous.author=p_actor,false) then raise exception 'Current supporter access is required.' using errcode='42501'; end if;
  if coalesce(previous.revision,0)<>p_expected then raise exception 'Your note changed in another session. Reload before saving.'; end if;
  if previous.author is not null then insert into public.map_tile_note_history(history,tile,author,record,changed_by) values(p_history,p_tile,p_actor,to_jsonb(previous),p_actor); end if;
  insert into public.map_tile_notes(history,tile,author,body,revision,is_deleted,public_end_turn)
    values(p_history,p_tile,p_actor,btrim(p_text),p_expected+1,btrim(p_text)='',p_cap)
  on conflict(history,tile,author) do update set body=excluded.body,revision=excluded.revision,is_deleted=excluded.is_deleted,public_end_turn=excluded.public_end_turn,updated_at=now();
end $$;

create or replace function public.moderate_map_tile_note(p_actor uuid,p_history uuid,p_tile integer,p_author uuid,p_hidden boolean,p_expected integer)
returns void language plpgsql security definer set search_path='' as $$
declare previous public.map_tile_notes;
begin
  if not public.is_map_layer_moderator(p_actor) then raise exception 'Map administrator access is required.' using errcode='42501'; end if;
  select * into strict previous from public.map_tile_notes where history=p_history and tile=p_tile and author=p_author for update;
  if previous.revision is distinct from p_expected then raise exception 'This note changed. Reload before moderating.'; end if;
  insert into public.map_tile_note_history(history,tile,author,record,changed_by) values(p_history,p_tile,p_author,to_jsonb(previous),p_actor);
  update public.map_tile_notes set is_hidden=p_hidden,revision=revision+1,updated_at=now() where history=p_history and tile=p_tile and author=p_author;
end $$;

create or replace function public.map_note_counts(p_history uuid)
returns table(tile integer,count bigint) language sql stable security definer set search_path='' as $$
  select n.tile,count(*) from public.map_tile_notes n join public.map_release_control c on c.map_id='s5' and c.enabled
  join public.map_releases r on r.id=c.active_release and r.history=n.history
  where n.history=p_history and n.public_end_turn<=r.last_turn and not n.is_deleted and not n.is_hidden group by n.tile;
$$;
create or replace function public.read_map_tile_notes(p_history uuid,p_tile integer,p_actor uuid,p_offset integer)
returns table(author uuid,author_name text,body text,revision integer,is_deleted boolean,is_hidden boolean,updated_at timestamptz)
language sql stable security definer set search_path='' as $$
  select n.author,coalesce(nullif(btrim(p.username),''),'CBR reader'),n.body,n.revision,n.is_deleted,n.is_hidden,n.updated_at
  from public.map_tile_notes n left join public.profiles p on p.id=n.author
  join public.map_release_control c on c.map_id='s5' and c.enabled join public.map_releases r on r.id=c.active_release and r.history=n.history
  where n.history=p_history and n.tile=p_tile and n.public_end_turn<=r.last_turn
    and ((not n.is_deleted and not n.is_hidden) or n.author=p_actor or public.is_map_layer_moderator(p_actor))
  order by (n.author=p_actor) desc nulls last,n.updated_at desc,n.author limit 50 offset greatest(0,p_offset);
$$;
-- Only the validating API can call these functions or access payload tables.
revoke all on function public.is_map_layer_moderator(uuid),public.can_manage_map_layers(uuid),
 public.save_map_view_layer(uuid,uuid,integer,text,text,text,jsonb,jsonb,uuid,integer),
 public.write_map_tile_note(uuid,uuid,integer,text,integer,integer),public.moderate_map_tile_note(uuid,uuid,integer,uuid,boolean,integer),
 public.map_note_counts(uuid),public.read_map_tile_notes(uuid,integer,uuid,integer) from public,anon,authenticated;
grant execute on function public.is_map_layer_moderator(uuid),public.can_manage_map_layers(uuid),
 public.save_map_view_layer(uuid,uuid,integer,text,text,text,jsonb,jsonb,uuid,integer),
 public.write_map_tile_note(uuid,uuid,integer,text,integer,integer),public.moderate_map_tile_note(uuid,uuid,integer,uuid,boolean,integer),
 public.map_note_counts(uuid),public.read_map_tile_notes(uuid,integer,uuid,integer) to service_role;
commit;
