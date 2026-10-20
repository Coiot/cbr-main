begin;

-- Credit metadata is private. It never grants access or changes payment expiry.
create table if not exists public.supporter_credit_details (
  email text primary key check (email = lower(btrim(email))),
  legacy_name text,
  legacy_civ text,
  kofi_name text,
  kofi_public boolean not null default false,
  kofi_paid_at timestamptz,
  updated_at timestamptz not null default now(),
  check (length(legacy_name) <= 128),
  check (length(legacy_civ) <= 128),
  check (length(kofi_name) <= 128)
);
alter table public.supporter_credit_details enable row level security;
revoke all on public.supporter_credit_details from public, anon, authenticated;
grant all on public.supporter_credit_details to service_role;

-- Capture credit metadata atomically with a NEW payment. Duplicates cannot change
-- credits; out-of-order events cannot replace a newer name or privacy choice.
create or replace function public.record_kofi_payment(payment jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare inserted integer; paid timestamptz; until_at timestamptz;
begin
  paid := (payment->>'paid_at')::timestamptz;
  if paid > now() + interval '5 minutes' then raise exception 'Future payment timestamp.'; end if;
  until_at := case when payment->>'kind' = 'recurring'
    then ((paid at time zone 'UTC') + interval '1 month 3 days') at time zone 'UTC'
    else paid + interval '768 hours' end;
  insert into public.supporter_payments(message_id,transaction_id,email,kind,paid_at,expires_at,amount,currency)
    values(payment->>'message_id',payment->>'transaction_id',lower(btrim(payment->>'email')),
      payment->>'kind',paid,until_at,(payment->>'amount')::numeric,payment->>'currency')
    on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted > 0 then
    -- Older deployed receivers omit these fields; do not erase imported names.
    if payment ? 'credit_public' then
      insert into public.supporter_credit_details(email,kofi_name,kofi_public,kofi_paid_at)
        values(lower(btrim(payment->>'email')),
          case when (payment->>'credit_public')::boolean then nullif(left(btrim(payment->>'credit_name'),128),'') else null end,
          coalesce((payment->>'credit_public')::boolean,false),paid)
        on conflict(email) do update set kofi_name=excluded.kofi_name,
          kofi_public=excluded.kofi_public,kofi_paid_at=excluded.kofi_paid_at,updated_at=now()
        where public.supporter_credit_details.kofi_paid_at is null
          or excluded.kofi_paid_at >= public.supporter_credit_details.kofi_paid_at;
    end if;
    update public.profiles p set can_edit=(public.supporter_status_for(p.id)->>'allowed')::boolean
      from auth.users u where p.id=u.id and lower(btrim(u.email))=lower(btrim(payment->>'email'));
  end if;
  return jsonb_build_object('duplicate',inserted=0);
end $$;
revoke all on function public.record_kofi_payment(jsonb) from public,anon,authenticated;
grant execute on function public.record_kofi_payment(jsonb) to service_role;

-- Only the trusted SVG builder may obtain this list. Match account identities
-- using verified auth.users.email, never the editable profiles.email column.
create or replace function public.get_supporter_credits()
returns table(display_name text, favorite_civ text)
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
    select
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
revoke all on function public.get_supporter_credits() from public,anon,authenticated;
grant execute on function public.get_supporter_credits() to service_role;

notify pgrst, 'reload schema';
commit;
