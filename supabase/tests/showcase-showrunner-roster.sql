-- Rollback-only, after showcase-showrunner-roster.sql. No persistent fixtures.
begin;
create function pg_temp.check_roster(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception '%',message; end if; end $$;
select pg_temp.check_roster(not exists(select 1 from auth.users where id in
 ('00000000-0000-4000-8000-000000000074','00000000-0000-4000-8000-000000000075')),'Fixture IDs already in use');
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000074','staff-first@cbr.test',now()),
 ('00000000-0000-4000-8000-000000000075','staff-second@cbr.test',now());
insert into public.profiles(id,email,username,can_edit) values
 ('00000000-0000-4000-8000-000000000074','staff-first@cbr.test','Z staff fixture',false),
 ('00000000-0000-4000-8000-000000000075','staff-second@cbr.test','A staff fixture',false)
 on conflict(id) do update set username=excluded.username,can_edit=false;
insert into public.showcase_showrunners(user_id,display_order,directory_name) values
 ('00000000-0000-4000-8000-000000000074',201,'First staff credit'),
 ('00000000-0000-4000-8000-000000000075',202,'Second staff credit');
insert into public.supporter_showcases(id,user_id,introduction,published) values
 ('00000000-0000-4000-8000-000000000054','00000000-0000-4000-8000-000000000074','PRIVATE staff draft',false);
set local role anon;
select pg_temp.check_roster(exists(select 1 from jsonb_array_elements(public.list_showrunner_showcases()) card
 where card=jsonb_build_object('id',null,'display_name','First staff credit','is_showrunner',true)),
 'Unpublished staff credit missing or exposed additional fields');
select pg_temp.check_roster(exists(select 1 from jsonb_array_elements(public.list_showrunner_showcases()) card
 where card=jsonb_build_object('id',null,'display_name','Second staff credit','is_showrunner',true)),
 'Staff credit without a showcase missing');
select pg_temp.check_roster(not (public.list_showrunner_showcases()::text like '%PRIVATE staff draft%'),'Draft content leaked');
select pg_temp.check_roster((select min(n) filter(where card->>'display_name'='First staff credit')
 <min(n) filter(where card->>'display_name'='Second staff credit')
 from jsonb_array_elements(public.list_showrunner_showcases()) with ordinality cards(card,n)),
 'Explicit staff order was not preserved');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000074';
select pg_temp.check_roster((public.get_my_showcase_access()->>'is_showrunner')::boolean,'Staff showcase access missing');
update public.supporter_showcases set introduction='Public staff introduction',published=true where user_id=auth.uid();
set local role anon;
select pg_temp.check_roster((select count(*)=1 from jsonb_array_elements(public.list_showrunner_showcases()) card
 where card->>'id'='00000000-0000-4000-8000-000000000054' and card->>'introduction'='Public staff introduction'),
 'Published showcase did not replace minimal staff credit');
select pg_temp.check_roster(not exists(select 1 from jsonb_array_elements(public.list_showrunner_showcases()) card
 where card->>'display_name'='First staff credit'),'Staff credit duplicated published showcase');
set local role authenticated;
update public.supporter_showcases set published=false where user_id=auth.uid();
set local role anon;
select pg_temp.check_roster(exists(select 1 from jsonb_array_elements(public.list_showrunner_showcases()) card
 where card=jsonb_build_object('id',null,'display_name','First staff credit','is_showrunner',true)),
 'Unpublished showcase did not return to minimal staff credit');
set local role authenticated;
insert into public.supporter_directory_preferences(user_id,hidden) values(auth.uid(),true);
set local role anon;
select pg_temp.check_roster(not exists(select 1 from jsonb_array_elements(public.list_showrunner_showcases()) card
 where card->>'display_name'='First staff credit'),'Hidden staff credit remained visible');
reset role;
select 'Showrunner roster ordering and privacy checks passed; fixtures rolled back' as result;
rollback;
