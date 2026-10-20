-- After this base migration, apply supporter-credits.sql to install database SVG credits.
begin;

-- Private payment ledger. Never expose payment emails or verification tokens to browsers.
create table if not exists public.supporter_access_config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  activated_at timestamptz
);
insert into public.supporter_access_config(singleton) values(true) on conflict do nothing;
create table if not exists public.supporter_payments (
  message_id text primary key,
  transaction_id text not null unique,
  email text not null check(email = lower(btrim(email))),
  kind text not null check(kind in ('one_time','recurring')),
  paid_at timestamptz not null,
  expires_at timestamptz not null,
  amount numeric not null check(amount > 0),
  currency text not null,
  received_at timestamptz not null default now(),
  revoked_at timestamptz,
  check(expires_at > paid_at)
);
create index if not exists supporter_payments_email_idx on public.supporter_payments(email,expires_at);
create table if not exists public.supporter_grants (
  grant_key text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  email text check(email = lower(btrim(email))),
  source text not null check(source in ('transition','manual','import')),
  expires_at timestamptz,
  note text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check(user_id is not null or email is not null),
  check(source = 'manual' or expires_at is not null)
);
create index if not exists supporter_grants_user_idx on public.supporter_grants(user_id);
create index if not exists supporter_grants_email_idx on public.supporter_grants(email);
alter table public.supporter_access_config enable row level security;
alter table public.supporter_payments enable row level security;
alter table public.supporter_grants enable row level security;
revoke all on public.supporter_access_config, public.supporter_payments, public.supporter_grants from public,anon,authenticated;
grant all on public.supporter_access_config, public.supporter_payments, public.supporter_grants to service_role;

-- A native Ko-fi member CSV has no payment dates. Stage its active email list
-- for a one-time window anchored to activation, including future site signups.
create table if not exists public.supporter_migration_members (
  email text primary key check(email = lower(btrim(email))),
  imported_at timestamptz not null default now()
);
alter table public.supporter_migration_members enable row level security;
revoke all on public.supporter_migration_members from public,anon,authenticated;
grant all on public.supporter_migration_members to service_role;
create or replace function public.stage_kofi_members(member_emails text[])
returns integer language plpgsql security definer set search_path = '' as $$
declare staged integer;
begin
  perform 1 from public.supporter_access_config where singleton for update;
  if (select enabled from public.supporter_access_config where singleton) then
    raise exception 'The one-time migration has already started. Import dated access records instead.';
  end if;
  if member_emails is null or cardinality(member_emails) = 0 or cardinality(member_emails) > 10000
    or exists(select 1 from unnest(member_emails) email where email is null
      or length(email) > 254 or email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception 'A non-empty list of valid member emails is required.';
  end if;
  -- Explicit predicate is required by Supabase's API safe-update checks.
  delete from public.supporter_migration_members where email <> '';
  insert into public.supporter_migration_members(email)
    select distinct lower(btrim(email)) from unnest(member_emails) email;
  get diagnostics staged = row_count;
  return staged;
end $$;
revoke all on function public.stage_kofi_members(text[]) from public,anon,authenticated;
grant execute on function public.stage_kofi_members(text[]) to service_role;

-- A dashboard test should verify authentication and database connectivity without
-- creating a real payment or exposing sample payloads in logs.
create table if not exists public.supporter_webhook_health (
  singleton boolean primary key default true check(singleton),
  last_test_at timestamptz,
  last_test_type text,
  test_count bigint not null default 0
);
insert into public.supporter_webhook_health(singleton) values(true) on conflict do nothing;
alter table public.supporter_webhook_health enable row level security;
revoke all on public.supporter_webhook_health from public,anon,authenticated;
grant all on public.supporter_webhook_health to service_role;
create or replace function public.record_kofi_test(event_type text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if event_type not in ('Donation','Tip','Subscription','Commission','Shop Order') then
    raise exception 'Unknown test event.';
  end if;
  update public.supporter_webhook_health set last_test_at=now(),last_test_type=event_type,test_count=test_count+1 where singleton;
end $$;
revoke all on function public.record_kofi_test(text) from public,anon,authenticated;
grant execute on function public.record_kofi_test(text) to service_role;

-- Read auth.users, not the user-editable profiles.email or a client-supplied email.
create or replace function public.supporter_status_for(target_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  member_email text; active_until timestamptz; last_until timestamptz;
  indefinite boolean; history boolean; activated boolean; legacy boolean;
begin
  select lower(btrim(email)) into member_email from auth.users
    where id = target_user and email_confirmed_at is not null;
  select enabled into activated from public.supporter_access_config where singleton;
  select coalesce(can_edit,false) into legacy from public.profiles where id = target_user;
  with periods as (
    select expires_at, revoked_at from public.supporter_payments where email = member_email
    union all
    select expires_at, revoked_at from public.supporter_grants
      where user_id = target_user or email = member_email
  ) select max(expires_at) filter(where revoked_at is null), max(expires_at),
      coalesce(bool_or(expires_at is null and revoked_at is null),false), count(*) > 0
    into active_until,last_until,indefinite,history from periods;
  return jsonb_build_object(
    'enabled',coalesce(activated,false),
    'allowed',indefinite or coalesce(active_until > now(),false) or (not coalesce(activated,false) and coalesce(legacy,false)),
    'status',case when indefinite or coalesce(active_until > now(),false) or (not coalesce(activated,false) and coalesce(legacy,false)) then 'active'
      when history then 'expired' else 'none' end,
    'expires_at',case when indefinite then null else active_until end,
    'server_now',now()
  );
end $$;
revoke all on function public.supporter_status_for(uuid) from public,anon,authenticated;
grant execute on function public.supporter_status_for(uuid) to service_role;

create or replace function public.has_supporter_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and coalesce((public.supporter_status_for(auth.uid())->>'allowed')::boolean,false);
$$;
revoke all on function public.has_supporter_access() from public,anon;
grant execute on function public.has_supporter_access() to authenticated;

create or replace function public.get_supporter_status()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to check supporter access.' using errcode='42501'; end if;
  result := public.supporter_status_for(auth.uid());
  -- Compatibility cache only: authorization always checks dated records directly.
  update public.profiles set can_edit = (result->>'allowed')::boolean
    where id=auth.uid() and can_edit is distinct from (result->>'allowed')::boolean;
  return result;
end $$;
revoke all on function public.get_supporter_status() from public,anon;
grant execute on function public.get_supporter_status() to authenticated;

create or replace function public.record_kofi_payment(payment jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare inserted integer; paid timestamptz; until_at timestamptz;
begin
  paid := (payment->>'paid_at')::timestamptz;
  if paid > now() + interval '5 minutes' then raise exception 'Future payment timestamp.'; end if;
  -- Work in UTC so DST never shortens the promised 32-day period.
  until_at := case when payment->>'kind' = 'recurring'
    then ((paid at time zone 'UTC') + interval '1 month 3 days') at time zone 'UTC'
    else paid + interval '768 hours' end;
  insert into public.supporter_payments(message_id,transaction_id,email,kind,paid_at,expires_at,amount,currency)
    values(payment->>'message_id',payment->>'transaction_id',lower(btrim(payment->>'email')),
      payment->>'kind',paid,until_at,(payment->>'amount')::numeric,payment->>'currency')
    on conflict do nothing;
  get diagnostics inserted = row_count;
  -- A replay never extends the expiry; out-of-order events cannot shorten it.
  if inserted > 0 then
    update public.profiles p set can_edit=(public.supporter_status_for(p.id)->>'allowed')::boolean
      from auth.users u where p.id=u.id and lower(btrim(u.email))=lower(btrim(payment->>'email'));
  end if;
  return jsonb_build_object('duplicate',inserted=0);
end $$;
revoke all on function public.record_kofi_payment(jsonb) from public,anon,authenticated;
grant execute on function public.record_kofi_payment(jsonb) to service_role;

-- Activate only after configuring and testing the real webhook. Repeat calls do
-- not reset transition periods. An old boolean is not a lifetime manual grant.
create or replace function public.activate_supporter_payments()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.supporter_access_config where singleton for update;
  if (select enabled from public.supporter_access_config where singleton) then return; end if;
  insert into public.supporter_grants(grant_key,user_id,source,expires_at,note)
    select 'transition:'||id,id,'transition',now()+interval '768 hours','Existing supporter: one-time migration window'
    from public.profiles where can_edit on conflict do nothing;
  insert into public.supporter_grants(grant_key,email,source,expires_at,note)
    select 'transition-email:'||md5(email),email,'transition',now()+interval '768 hours',
      'Ko-fi active member snapshot: one-time migration window'
    from public.supporter_migration_members on conflict do nothing;
  update public.supporter_access_config set enabled=true,activated_at=now() where singleton;
end $$;
revoke all on function public.activate_supporter_payments() from public,anon,authenticated;
grant execute on function public.activate_supporter_payments() to service_role;

-- Restrictive policies cover the older permissive map policies as well. Expiry
-- works at request time, without a cron job or a browser check refreshing a flag.
do $$ declare tbl text; begin
  foreach tbl in array array['tile_overrides','tile_edits','album_comments'] loop
    execute format('drop policy if exists "Current supporter required for insert" on public.%I',tbl);
    execute format('create policy "Current supporter required for insert" on public.%I as restrictive for insert to authenticated with check ((select public.has_supporter_access()))',tbl);
    if tbl <> 'tile_edits' then
      execute format('drop policy if exists "Current supporter required for update" on public.%I',tbl);
      execute format('create policy "Current supporter required for update" on public.%I as restrictive for update to authenticated using ((select public.has_supporter_access())) with check ((select public.has_supporter_access()))',tbl);
    end if;
  end loop;
end $$;
-- Replace obsolete permissive checks, retaining the other map/owner policies.
alter policy "Tile overrides are writable by editors" on public.tile_overrides with check ((select public.has_supporter_access()));
alter policy "Tile overrides are updatable by editors" on public.tile_overrides using ((select public.has_supporter_access())) with check ((select public.has_supporter_access()));
alter policy "Tile edit logs are writable by editors" on public.tile_edits with check ((select public.has_supporter_access()));

notify pgrst, 'reload schema';
commit;
