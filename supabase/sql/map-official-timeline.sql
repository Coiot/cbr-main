-- Apply after map-saved-views.sql. Starts disabled: no public cutover on migration.
begin;
create table if not exists public.map_releases (
  id text primary key check(id ~ '^[0-9a-f]{64}$'),
  history uuid not null,
  first_turn integer not null check(first_turn>=0),
  last_turn integer not null check(last_turn>=first_turn and last_turn<=100000),
  bookmarks jsonb not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.map_release_control (
  map_id text primary key check(map_id='s5'),
  active_release text references public.map_releases(id),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.map_release_control(map_id) values('s5') on conflict do nothing;
create table if not exists public.map_publication_log (
  id bigint generated always as identity primary key,
  previous_release text, release_id text not null,
  actor uuid not null, created_at timestamptz not null default now()
);
create table if not exists public.map_city_contributions (
  history uuid not null, turn integer not null, city_id integer not null,
  field text not null check(field in ('population','religion','wonders')),
  value jsonb not null, reference text not null default '' check(length(reference)<=200),
  revision integer not null default 1, author uuid not null,
  author_name text not null, hidden boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(history,turn,city_id,field)
);
create table if not exists public.map_contribution_history (
  id bigint generated always as identity primary key,
  history uuid not null, turn integer not null, city_id integer not null, field text not null,
  record jsonb not null, created_at timestamptz not null default now()
);
create index if not exists map_contribution_history_lookup on public.map_contribution_history(history,turn,city_id,field,id desc);
-- Access goes through the validating Edge Function; direct REST writes are denied.
alter table public.map_releases enable row level security;
alter table public.map_release_control enable row level security;
alter table public.map_publication_log enable row level security;
alter table public.map_city_contributions enable row level security;
alter table public.map_contribution_history enable row level security;
revoke all on public.map_releases,public.map_release_control,public.map_publication_log,
  public.map_city_contributions,public.map_contribution_history from public,anon,authenticated;
grant all on public.map_releases,public.map_release_control,public.map_publication_log,
  public.map_city_contributions,public.map_contribution_history to service_role;
grant usage,select on sequence public.map_publication_log_id_seq,public.map_contribution_history_id_seq to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('map-release-drafts','map-release-drafts',false,12582912,array['application/json'])
on conflict(id) do update set public=false,file_size_limit=12582912,allowed_mime_types=array['application/json'];
-- Intentionally no storage.objects policy for clients, including authenticated users.
-- A restrictive policy also defeats any older bucket-wide permissive policy.
drop policy if exists map_release_objects_private on storage.objects;
create policy map_release_objects_private on storage.objects as restrictive
for all to anon,authenticated
using(bucket_id <> 'map-release-drafts') with check(bucket_id <> 'map-release-drafts');

create or replace function public.publish_map_release(p_actor uuid,p_release text,p_expected text)
returns void language plpgsql security definer set search_path='' as $$
declare current_release text; target public.map_releases;
begin
  if p_actor <> '88c12d80-cdc8-44cf-a174-a75c63bb5936'::uuid or p_actor is null then
    raise exception 'Only Coiot can publish.' using errcode='42501';
  end if;
  select active_release into current_release from public.map_release_control where map_id='s5' for update;
  if current_release is distinct from p_expected then raise exception 'Publication changed. Reload and review again.'; end if;
  select * into strict target from public.map_releases where id=p_release;
  if current_release is not null and target.history<>(select history from public.map_releases where id=current_release) then
    raise exception 'Changing game history requires a separate reviewed migration.';
  end if;
  update public.map_releases set published_at=coalesce(published_at,now()) where id=p_release;
  update public.map_release_control set active_release=p_release,enabled=true,updated_at=now() where map_id='s5';
  insert into public.map_publication_log(previous_release,release_id,actor) values(current_release,p_release,p_actor);
end $$;
revoke all on function public.publish_map_release(uuid,text,text) from public,anon,authenticated;
grant execute on function public.publish_map_release(uuid,text,text) to service_role;

create or replace function public.write_map_contribution(p_actor uuid,p_history uuid,p_turn integer,p_city integer,
  p_field text,p_value jsonb,p_reference text,p_expected integer,p_hide boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare old_row public.map_city_contributions; active public.map_releases; author_label text;
begin
  -- Serializes contributions with publication/rollback and stale-edit checks.
  select r.* into active from public.map_release_control c join public.map_releases r on r.id=c.active_release
    where c.map_id='s5' and c.enabled for share of c;
  if active.id is null or active.history<>p_history or p_turn<active.first_turn or p_turn>active.last_turn then
    raise exception 'This turn is not published.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_history::text||':'||p_turn||':'||p_city||':'||p_field,0));
  select * into old_row from public.map_city_contributions where history=p_history and turn=p_turn and city_id=p_city and field=p_field for update;
  if coalesce(old_row.revision,0)<>p_expected then raise exception 'Someone updated this value. Reload before saving.'; end if;
  if p_hide and p_actor<>'88c12d80-cdc8-44cf-a174-a75c63bb5936'::uuid then raise exception 'Only Coiot can hide a contribution.'; end if;
  select coalesce(nullif(btrim(username),''),'CBR reader') into author_label from public.profiles where id=p_actor;
  if author_label is null then raise exception 'An account is required.'; end if;
  if old_row.revision is not null then
    insert into public.map_contribution_history(history,turn,city_id,field,record)
    values(p_history,p_turn,p_city,p_field,to_jsonb(old_row));
  end if;
  insert into public.map_city_contributions(history,turn,city_id,field,value,reference,revision,author,author_name,hidden)
    values(p_history,p_turn,p_city,p_field,p_value,p_reference,p_expected+1,p_actor,author_label,p_hide)
  on conflict(history,turn,city_id,field) do update set value=excluded.value,reference=excluded.reference,
    revision=excluded.revision,author=excluded.author,author_name=excluded.author_name,hidden=excluded.hidden,updated_at=now();
end $$;
revoke all on function public.write_map_contribution(uuid,uuid,integer,integer,text,jsonb,text,integer,boolean) from public,anon,authenticated;
grant execute on function public.write_map_contribution(uuid,uuid,integer,integer,text,jsonb,text,integer,boolean) to service_role;

create or replace function public.guard_official_map_writes()
returns trigger language plpgsql security definer set search_path='' as $$
declare official_enabled boolean;
begin
  -- Serialize in-flight legacy writes with the publication transaction.
  select enabled into official_enabled from public.map_release_control
    where map_id=coalesce(new.map_id,old.map_id) for share;
  if official_enabled then
    raise exception 'The official map is read-only. Use attributed city contributions for missing details.' using errcode='42501';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
drop trigger if exists guard_official_map_writes on public.tile_overrides;
create trigger guard_official_map_writes before insert or update or delete on public.tile_overrides
for each row execute function public.guard_official_map_writes();
drop trigger if exists guard_official_map_writes on public.tile_edits;
create trigger guard_official_map_writes before insert or update or delete on public.tile_edits
for each row execute function public.guard_official_map_writes();

create or replace function public.map_view_source_available(p_map_id text,p_source text)
returns boolean language sql stable security definer set search_path='' as $$
  select p_source in ('','__live__','episode-0-base')
    or (p_map_id='s5' and p_source ~ '^s5-episode-[0-9]+(-[0-9]+)?$')
    or exists(select 1 from public.map_snapshots s where s.id::text=p_source and s.map_id=p_map_id and s.is_published)
    or exists(select 1 from public.map_release_control c join public.map_releases r on r.id=c.active_release
      where c.map_id=p_map_id and c.enabled and p_source ~ '^timeline:[0-9a-f-]{36}:[0-9]{1,6}$'
        and split_part(p_source,':',2)=r.history::text
        and case when split_part(p_source,':',3) ~ '^[0-9]{1,6}$'
          then split_part(p_source,':',3)::integer between r.first_turn and r.last_turn else false end);
$$;
revoke all on function public.map_view_source_available(text,text) from public,anon;
grant execute on function public.map_view_source_available(text,text) to authenticated,service_role;
commit;
