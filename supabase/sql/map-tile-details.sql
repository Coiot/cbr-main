-- Pending local/staging migration. This live layer has not been deployed.
-- Requires map-official-timeline.sql, supporter-access.sql and map_admins.
-- No imports from community snapshots or tile_overrides.
begin;
create table if not exists public.map_tile_details (
  history uuid not null, detail_key text not null,
  tile integer not null check(tile between 0 and 16919),
  field text not null check(field in ('population','religion','wonders','capital','puppeted','occupied','resistance','ideology','improvement','route','units','pillaged','notes','ruins')),
  -- Internal release-cutoff guard, not a timeline layer or a dated observation range.
  observed_turn integer not null check(observed_turn>=0),
  record jsonb not null, revision integer not null default 1,
  author uuid not null, author_name text not null, updated_at timestamptz not null default now(),
  primary key(history,detail_key)
);
create table if not exists public.map_tile_detail_history (
  id bigint generated always as identity primary key,
  history uuid not null,detail_key text not null,
  record jsonb not null,created_at timestamptz not null default now()
);
alter table public.map_tile_details enable row level security;
alter table public.map_tile_detail_history enable row level security;
revoke all on public.map_tile_details,public.map_tile_detail_history from public,anon,authenticated;
grant all on public.map_tile_details,public.map_tile_detail_history to service_role;
grant usage,select on sequence public.map_tile_detail_history_id_seq to service_role;

create or replace function public.can_edit_map_details(p_actor uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select p_actor is not null and (p_actor='88c12d80-cdc8-44cf-a174-a75c63bb5936'::uuid
    or coalesce((public.supporter_status_for(p_actor)->>'allowed')::boolean,false)
    or exists(select 1 from public.map_admins where user_id=p_actor and map_id='s5'));
$$;
revoke all on function public.can_edit_map_details(uuid) from public,anon,authenticated;
grant execute on function public.can_edit_map_details(uuid) to service_role;

create or replace function public.write_map_tile_detail(p_actor uuid,p_history uuid,p_turn integer,p_record jsonb,p_expected integer)
returns void language plpgsql security definer set search_path='' as $$
declare active public.map_releases; previous public.map_tile_details; author_label text;
  tile_id integer:=(p_record->>'tile')::integer; field_name text:=p_record->>'field'; record_key text;
begin
  if not public.can_edit_map_details(p_actor) then raise exception 'Map editor access is required.' using errcode='42501'; end if;
  select r.* into active from public.map_release_control c join public.map_releases r on r.id=c.active_release
    where c.map_id='s5' and c.enabled for share of c;
  if active.id is null or active.history<>p_history or p_turn is null or p_turn<active.first_turn or p_turn>active.last_turn then
    raise exception 'This turn is not published.';
  end if;
  if exists(select 1 from jsonb_object_keys(p_record) k where k not in ('tile','city','owner','field','value','author','reference'))
    or octet_length(p_record::text)>16000 then raise exception 'Invalid live map detail.'; end if;
  record_key:=case when field_name in ('ideology','capital') then field_name||':'||(p_record->>'owner') else tile_id::text||':'||field_name end;
  perform pg_advisory_xact_lock(hashtextextended(p_history::text||':'||record_key,1));
  select * into previous from public.map_tile_details where history=p_history and detail_key=record_key for update;
  if coalesce(previous.revision,0)<>p_expected or p_expected is null then raise exception 'This detail changed. Reload before saving.'; end if;
  select coalesce(nullif(btrim(username),''),'CBR editor') into author_label from public.profiles where id=p_actor;
  if author_label is null then raise exception 'An account profile is required.'; end if;
  if previous.revision is not null then insert into public.map_tile_detail_history(history,detail_key,record)
    values(p_history,record_key,to_jsonb(previous)); end if;
  p_record:=jsonb_set(p_record,'{author}',to_jsonb(author_label));
  insert into public.map_tile_details(history,detail_key,tile,field,observed_turn,record,revision,author,author_name)
    values(p_history,record_key,tile_id,field_name,p_turn,p_record,p_expected+1,p_actor,author_label)
  on conflict(history,detail_key) do update set tile=excluded.tile,observed_turn=excluded.observed_turn,record=excluded.record,
    revision=excluded.revision,author=excluded.author,author_name=excluded.author_name,updated_at=now();
end $$;
revoke all on function public.write_map_tile_detail(uuid,uuid,integer,jsonb,integer) from public,anon,authenticated;
grant execute on function public.write_map_tile_detail(uuid,uuid,integer,jsonb,integer) to service_role;
commit;
