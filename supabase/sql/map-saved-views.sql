-- Requires supporter-access.sql and the existing map_snapshots/map_admins tables.
begin;

create or replace function public.valid_map_view_settings(s jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare k text;
begin
  if s is null or jsonb_typeof(s) <> 'object' or octet_length(s::text) > 4096 then return false; end if;
  if s->'version' is distinct from '1'::jsonb then return false; end if;
  foreach k in array array['x','y','zoom'] loop
    if jsonb_typeof(s->k) is distinct from 'number' then return false; end if;
  end loop;
  if abs((s->>'x')::numeric) > 10000000 or abs((s->>'y')::numeric) > 10000000
    or (s->>'zoom')::numeric <= 0 or (s->>'zoom')::numeric > 1000 then return false; end if;
  foreach k in array array['overlay','owner','contrast','tile','snapshot','compare'] loop
    if jsonb_typeof(s->k) is distinct from 'string' or length(s->>k) > 120 then return false; end if;
  end loop;
  if s->>'overlay' not in ('none','civilization','population','religion','contrast')
    or s->>'contrast' !~ '^[01]{5}$' then return false; end if;
  if s->>'tile' <> '' and s->>'tile' !~ '^[0-9]{1,3},[0-9]{1,3}$' then return false; end if;
  if s->>'snapshot' = '__live__' or (s->>'compare' <> '' and s->>'snapshot' = '') then return false; end if;
  if exists(select 1 from jsonb_object_keys(s) as keys(key) where keys.key not in ('version','x','y','zoom','overlay','owner','contrast','tile','snapshot','compare')) then return false; end if;
  return true;
exception when others then return false;
end $$;

create table if not exists public.map_saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  map_id text not null check (length(map_id) between 1 and 64),
  title text not null check (length(btrim(title)) between 1 and 80),
  description text not null default '' check (length(description) <= 300),
  visibility text not null default 'private' check (visibility in ('public','private')),
  settings jsonb not null check (public.valid_map_view_settings(settings)),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists map_saved_views_public_idx on public.map_saved_views(map_id, updated_at desc, id) where visibility='public' and not is_hidden;
create index if not exists map_saved_views_owner_idx on public.map_saved_views(user_id, map_id, updated_at desc, id);

create table if not exists public.map_view_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  view_id uuid not null references public.map_saved_views(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, view_id)
);
create index if not exists map_view_follows_view_idx on public.map_view_follows(view_id);

-- Static episode files are public; database snapshots must also be published.
create or replace function public.map_view_source_available(p_map_id text, p_source text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_source in ('', '__live__', 'episode-0-base')
    or (p_map_id = 's5' and p_source ~ '^s5-episode-[0-9]+(-[0-9]+)?$')
    or exists(select 1 from public.map_snapshots s where s.id::text=p_source and s.map_id=p_map_id and s.is_published);
$$;
revoke all on function public.map_view_source_available(text,text) from public, anon;
grant execute on function public.map_view_source_available(text,text) to authenticated;

create or replace function public.guard_map_saved_view()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon','authenticated') then
    if auth.uid() is distinct from new.user_id then raise exception 'Only the owner can save this view.' using errcode='42501'; end if;
    if tg_op = 'INSERT' then
      if not public.has_supporter_access() or new.is_hidden then raise exception 'Current supporter access is required.' using errcode='42501'; end if;
      new.created_at := now();
    else
      if (new.id,new.user_id,new.map_id,new.created_at,new.is_hidden) is distinct from (old.id,old.user_id,old.map_id,old.created_at,old.is_hidden) then
        raise exception 'View identity and moderation are managed by the server.' using errcode='42501';
      end if;
      if not public.has_supporter_access() and not (
        new.visibility='private' and (new.title,new.description,new.settings) is not distinct from (old.title,old.description,old.settings)
      ) then raise exception 'Renew supporter access to change this view.' using errcode='42501'; end if;
    end if;
    if (tg_op='INSERT' or new.settings is distinct from old.settings or (new.visibility='public' and old.visibility='private')) and (not public.map_view_source_available(new.map_id, new.settings->>'snapshot')
      or not public.map_view_source_available(new.map_id, new.settings->>'compare')) then
      raise exception 'Only published map snapshots can be shared.' using errcode='23514';
    end if;
  end if;
  new.title := btrim(new.title);
  new.description := btrim(new.description);
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists guard_map_saved_view on public.map_saved_views;
create trigger guard_map_saved_view before insert or update on public.map_saved_views for each row execute function public.guard_map_saved_view();

alter table public.map_saved_views enable row level security;
alter table public.map_view_follows enable row level security;
drop policy if exists map_saved_views_read on public.map_saved_views;
create policy map_saved_views_read on public.map_saved_views for select using ((visibility='public' and not is_hidden) or user_id=(select auth.uid()));
drop policy if exists map_saved_views_insert on public.map_saved_views;
create policy map_saved_views_insert on public.map_saved_views for insert to authenticated with check (user_id=(select auth.uid()) and (select public.has_supporter_access()) and not is_hidden);
drop policy if exists map_saved_views_update on public.map_saved_views;
create policy map_saved_views_update on public.map_saved_views for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists map_saved_views_delete on public.map_saved_views;
create policy map_saved_views_delete on public.map_saved_views for delete to authenticated using (user_id=(select auth.uid()));
drop policy if exists map_view_follows_read on public.map_view_follows;
create policy map_view_follows_read on public.map_view_follows for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists map_view_follows_insert on public.map_view_follows;
create policy map_view_follows_insert on public.map_view_follows for insert to authenticated with check (
  user_id=(select auth.uid()) and exists(select 1 from public.map_saved_views v where v.id=view_id and v.visibility='public' and not v.is_hidden)
);
drop policy if exists map_view_follows_delete on public.map_view_follows;
create policy map_view_follows_delete on public.map_view_follows for delete to authenticated using (user_id=(select auth.uid()));
-- Upsert only needs conflict-do-nothing; no user may modify another follow.
revoke all on public.map_saved_views,public.map_view_follows from public,anon,authenticated;
grant select on public.map_saved_views to anon, authenticated;
grant insert,update,delete on public.map_saved_views to authenticated;
grant select,insert,delete on public.map_view_follows to authenticated;
grant all on public.map_saved_views, public.map_view_follows to service_role;

-- A safe public projection: profile emails/settings remain inaccessible.
create or replace function public.list_map_saved_views(p_map_id text, p_section text default 'explore', p_search text default '', p_offset integer default 0, p_id uuid default null)
returns table(id uuid,user_id uuid,map_id text,title text,description text,visibility text,settings jsonb,is_hidden boolean,created_at timestamptz,updated_at timestamptz,creator_name text,is_following boolean,source_label text)
language sql stable security definer set search_path = '' as $$
  select v.id,v.user_id,v.map_id,v.title,v.description,v.visibility,v.settings,v.is_hidden,v.created_at,v.updated_at,
    coalesce(nullif(btrim(p.username),''),'CBR supporter'), f.view_id is not null,
    case when v.settings->>'snapshot'='' then 'Live map'
      when s.episode_label is not null then s.episode_label
      when v.settings->>'snapshot'='episode-0-base' then 'Episode 0'
      when v.settings->>'snapshot' ~ '^s5-episode-[0-9]+(-[0-9]+)?$' then 'Episode ' || replace(substr(v.settings->>'snapshot',12),'-','.')
      else 'Episode snapshot' end
  from public.map_saved_views v
  left join public.profiles p on p.id=v.user_id
  left join public.map_snapshots s on s.id::text=v.settings->>'snapshot' and s.map_id=v.map_id and s.is_published
  left join public.map_view_follows f on f.view_id=v.id and f.user_id=auth.uid()
  where (p_map_id is null or v.map_id=p_map_id)
    and ((v.visibility='public' and not v.is_hidden) or v.user_id=auth.uid())
    and (case when p_id is not null then v.id=p_id
      when p_section='explore' then v.visibility='public' and not v.is_hidden
      when p_section='following' then f.view_id is not null and v.visibility='public' and not v.is_hidden
      when p_section='mine' then v.user_id=auth.uid() else false end)
    and (coalesce(btrim(p_search),'')='' or position(lower(left(btrim(p_search),80)) in lower(v.title || ' ' || coalesce(p.username,'')))>0)
  order by v.updated_at desc,v.id
  limit 20 offset greatest(0,least(coalesce(p_offset,0),100000));
$$;
revoke all on function public.list_map_saved_views(text,text,text,integer,uuid) from public;
grant execute on function public.list_map_saved_views(text,text,text,integer,uuid) to anon,authenticated;

create or replace function public.get_map_saved_view(p_id uuid)
returns table(id uuid,user_id uuid,map_id text,title text,description text,visibility text,settings jsonb,is_hidden boolean,created_at timestamptz,updated_at timestamptz,creator_name text,is_following boolean,source_label text)
language sql stable security invoker set search_path = '' as $$
  select * from public.list_map_saved_views(null, 'explore', '', 0, p_id);
$$;
revoke all on function public.get_map_saved_view(uuid) from public;
grant execute on function public.get_map_saved_view(uuid) to anon,authenticated;

create or replace function public.hide_map_saved_view(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.map_saved_views v join public.map_admins a on a.map_id=v.map_id
    where v.id=p_id and a.user_id=auth.uid() and v.visibility='public') then
    raise exception 'Map administrator access required.' using errcode='42501';
  end if;
  update public.map_saved_views set is_hidden=true where id=p_id;
end $$;
revoke all on function public.hide_map_saved_view(uuid) from public,anon;
grant execute on function public.hide_map_saved_view(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
