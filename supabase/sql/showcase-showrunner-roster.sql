-- Apply after showcase-public-content.sql. Public staff cards do not publish drafts.
begin;
alter table public.showcase_showrunners
  add column if not exists display_order integer not null default 100,
  add column if not exists directory_name text
    check (directory_name is null or (length(btrim(directory_name)) between 1 and 80 and position('@' in directory_name)=0));

-- Account IDs verified against profiles; public names never authorize membership.
insert into public.showcase_showrunners(user_id,display_order,directory_name) values
  ('88c12d80-cdc8-44cf-a174-a75c63bb5936',0,'Coiot'),
  ('ceef76d5-64a5-4585-ad84-5a13ce92468d',1,'LacsiraxAriscal')
on conflict(user_id) do update set display_order=excluded.display_order,directory_name=excluded.directory_name;

create or replace function public.list_showrunner_showcases()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(case when s.id is not null then public.get_supporter_showcase(s.id)
    else jsonb_build_object('id',null,'display_name',r.directory_name,'is_showrunner',true) end
    order by r.display_order,lower(coalesce(p.username,r.directory_name)),r.user_id),'[]'::jsonb)
  from public.showcase_showrunners r
  left join public.supporter_showcases s on s.user_id=r.user_id and s.published
  left join public.profiles p on p.id=r.user_id
  left join public.supporter_directory_preferences d on d.user_id=r.user_id
  where not coalesce(d.hidden,false) and (s.id is not null or r.directory_name is not null);
$$;
revoke all on function public.list_showrunner_showcases() from public;
grant execute on function public.list_showrunner_showcases() to anon,authenticated;
notify pgrst,'reload schema';
commit;
