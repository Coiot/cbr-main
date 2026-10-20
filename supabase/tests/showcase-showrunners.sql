-- Rollback-only; run after showcase-showrunners.sql as an administrator.
begin;
create or replace function pg_temp.check_showrunner(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception '%',message; end if; end $$;
create or replace function pg_temp.showrunner_denied(query text) returns void language plpgsql as $$
begin
  begin execute query; exception when insufficient_privilege or check_violation then return; end;
  raise exception 'Expected rejection: %',query;
end $$;
select pg_temp.check_showrunner(not exists(select 1 from auth.users where id in
 ('00000000-0000-4000-8000-000000000074','00000000-0000-4000-8000-000000000075')),'Fixture IDs already in use');
update public.supporter_access_config set enabled=true where singleton;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000074','showrunner-test@cbr.test',now()),
 ('00000000-0000-4000-8000-000000000075','showrunner-imposter@cbr.test',now());
insert into public.profiles(id,email,username,can_edit) values
 ('00000000-0000-4000-8000-000000000074','showrunner-test@cbr.test','Showrunner fixture',false),
 ('00000000-0000-4000-8000-000000000075','showrunner-imposter@cbr.test','Coiot',false)
 on conflict(id) do update set username=excluded.username,can_edit=false;
insert into public.showcase_showrunners(user_id) values('00000000-0000-4000-8000-000000000074');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000075';
select pg_temp.check_showrunner(not (public.get_my_showcase_access()->>'allowed')::boolean,'A matching display name granted access');
select pg_temp.showrunner_denied('insert into public.showcase_showrunners(user_id) values(auth.uid())');
select pg_temp.showrunner_denied('insert into public.supporter_showcases(user_id,published) values(auth.uid(),true)');
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000074';
select pg_temp.check_showrunner((public.get_my_showcase_access()->>'allowed')::boolean,'Showrunner cannot edit showcase');
select pg_temp.check_showrunner((public.get_my_showcase_access()->>'is_showrunner')::boolean,'Showrunner label missing');
select pg_temp.check_showrunner(not public.has_supporter_access(),'Showrunner incorrectly gained donation access');
insert into public.supporter_showcases(id,user_id,introduction,published) values
 ('00000000-0000-4000-8000-000000000054',auth.uid(),'Showrunner test introduction',false);
set local role anon;
select pg_temp.check_showrunner(not exists(select 1 from jsonb_array_elements(public.list_showrunner_showcases()) p where p->>'id'='00000000-0000-4000-8000-000000000054'),'Private showrunner draft leaked');
select pg_temp.showrunner_denied('select * from public.showcase_showrunners');
select pg_temp.showrunner_denied('select public.get_my_showcase_access()');
set local role authenticated;
update public.supporter_showcases set published=true where user_id=auth.uid();
update public.supporter_showcases set introduction='Updated showrunner introduction' where user_id=auth.uid();
update public.supporter_showcases set competitors=array(select 'Showcase civ '||n from generate_series(1,9) n) where user_id=auth.uid();
select pg_temp.check_showrunner((select cardinality(competitors)=9 from public.supporter_showcases where user_id=auth.uid()),'Nine additional competitors were not saved');
select pg_temp.showrunner_denied($q$update public.supporter_showcases set competitors=array(select 'Showcase civ '||n from generate_series(1,10) n) where user_id=auth.uid()$q$);
select pg_temp.showrunner_denied($q$update public.supporter_showcases set competitors=array['Japan','Japan'] where user_id=auth.uid()$q$);

set local role anon;
select pg_temp.check_showrunner(exists(select 1 from jsonb_array_elements(public.list_showrunner_showcases()) p where p->>'id'='00000000-0000-4000-8000-000000000054' and (p->>'is_showrunner')::boolean and not (p->>'active')::boolean),'Published showrunner card missing or incorrectly labelled as donor');
select pg_temp.check_showrunner(public.get_supporter_showcase('00000000-0000-4000-8000-000000000054')->>'introduction'='Updated showrunner introduction','Showrunner edit did not persist');
select pg_temp.check_showrunner(not exists(select 1 from jsonb_array_elements(public.list_supporter_directory()->'entries') p where p->>'showcase_id'='00000000-0000-4000-8000-000000000054'),'Showrunner mixed into donor list');
select pg_temp.check_showrunner(not (public.list_showrunner_showcases()::text like '%@%'),'Showrunner cards leaked email');
set local role authenticated;
insert into public.supporter_directory_preferences(user_id,hidden) values(auth.uid(),true);
set local role anon;
select pg_temp.check_showrunner(not exists(select 1 from jsonb_array_elements(public.list_showrunner_showcases()) p where p->>'id'='00000000-0000-4000-8000-000000000054'),'Hidden showrunner card remained listed');
set local role authenticated;
update public.supporter_showcases set published=false where user_id=auth.uid();
set local role anon;
select pg_temp.check_showrunner(public.get_supporter_showcase('00000000-0000-4000-8000-000000000054') is null,'Unpublished showrunner stayed public');
reset role;
select 'Showrunner access and privacy checks passed; fixtures rolled back' as result;
rollback;
