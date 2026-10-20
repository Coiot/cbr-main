-- Run after map-saved-views.sql; every fixture and change is rolled back.
begin;
create function pg_temp.assert_true(value boolean, message text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception '%',message; end if; end $$;
create function pg_temp.denied(statement text) returns void language plpgsql as $$
begin
  begin execute statement; exception when insufficient_privilege or check_violation then return; end;
  raise exception 'An unauthorized operation unexpectedly succeeded: %',statement;
end $$;

do $$ begin
  if exists(select 1 from auth.users where id::text like '00000000-0000-4000-8000-00000000009%') then raise exception 'Fixture IDs are already used'; end if;
end $$;
update public.supporter_access_config set enabled=true where singleton;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000091','map-owner@cbr.test',now()),
 ('00000000-0000-4000-8000-000000000092','map-free@cbr.test',now()),
 ('00000000-0000-4000-8000-000000000093','map-other@cbr.test',now()),
 ('00000000-0000-4000-8000-000000000094','map-admin@cbr.test',now());
insert into public.profiles(id,email,username) values ('00000000-0000-4000-8000-000000000091','map-owner@cbr.test','Map test creator');
insert into public.supporter_grants(grant_key,user_id,source,expires_at,note) values
 ('map-test-owner','00000000-0000-4000-8000-000000000091','manual',now()+interval '1 day','Test'),
 ('map-test-other','00000000-0000-4000-8000-000000000093','manual',now()+interval '1 day','Test');
insert into public.map_admins(map_id,user_id) values ('s5','00000000-0000-4000-8000-000000000094');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
insert into public.map_saved_views(id,user_id,map_id,title,visibility,settings) values
 ('00000000-0000-4000-8000-000000000001',auth.uid(),'s5','Public test','public','{"version":1,"x":500,"y":300,"zoom":1.5,"overlay":"civilization","owner":"Japan","contrast":"10010","tile":"3,4","snapshot":"","compare":""}'),
 ('00000000-0000-4000-8000-000000000002',auth.uid(),'s5','Private test','private','{"version":1,"x":500,"y":300,"zoom":1.5,"overlay":"none","owner":"","contrast":"00000","tile":"","snapshot":"s5-episode-34","compare":""}');
select pg_temp.assert_true((select count(*)=2 from public.list_map_saved_views('s5','mine')),'Owner must see private and public views');
select pg_temp.assert_true((select source_label='Episode 34' from public.get_map_saved_view('00000000-0000-4000-8000-000000000002')),'Pinned episode badge is incorrect');
select pg_temp.denied($q$update public.map_saved_views set is_hidden=true where id='00000000-0000-4000-8000-000000000001'$q$);
select pg_temp.denied($q$update public.map_saved_views set settings='{"version":2}' where id='00000000-0000-4000-8000-000000000001'$q$);

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.assert_true((select count(*)=1 from public.list_map_saved_views('s5','explore','Map test creator')),'Anonymous gallery must expose public views and creator search');
select pg_temp.assert_true((select count(*)=0 from public.get_map_saved_view('00000000-0000-4000-8000-000000000002')),'Private view RPC leaked');
select pg_temp.assert_true((select count(*)=0 from public.map_saved_views where visibility='private'),'Private view table leaked');
select pg_temp.assert_true(not exists(select 1 from public.list_map_saved_views('s5','explore') v where to_jsonb(v) ? 'email'),'Public card projection contains a profile email');
select pg_temp.denied($q$insert into public.map_view_follows(user_id,view_id) values ('00000000-0000-4000-8000-000000000092','00000000-0000-4000-8000-000000000001')$q$);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
insert into public.map_view_follows(user_id,view_id) values (auth.uid(),'00000000-0000-4000-8000-000000000001');
insert into public.map_view_follows(user_id,view_id) values (auth.uid(),'00000000-0000-4000-8000-000000000001') on conflict do nothing;
select pg_temp.assert_true((select count(*)=1 from public.list_map_saved_views('s5','following')),'Free account follow must work and be idempotent');
select pg_temp.denied($q$insert into public.map_view_follows(user_id,view_id) values (auth.uid(),'00000000-0000-4000-8000-000000000002')$q$);
select pg_temp.denied($q$insert into public.map_view_follows(user_id,view_id) values ('00000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000001')$q$);
select pg_temp.denied($q$insert into public.map_saved_views(user_id,map_id,title,settings) select auth.uid(),'s5','Free account creation',settings from public.map_saved_views limit 1$q$);
update public.map_saved_views set title='Hijacked' where id='00000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select title='Public test' from public.map_saved_views where id='00000000-0000-4000-8000-000000000001'),'Another account changed a public view');
select pg_temp.denied($q$select public.hide_map_saved_view('00000000-0000-4000-8000-000000000001')$q$);

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000093',true);
select pg_temp.assert_true((select count(*)=0 from public.map_view_follows),'Another account can read follow identities');
select pg_temp.assert_true((select count(*)=0 from public.get_map_saved_view('00000000-0000-4000-8000-000000000002')),'Another supporter can read private view');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
update public.map_saved_views set title='Updated front' where id='00000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
select pg_temp.assert_true((select title='Updated front' from public.list_map_saved_views('s5','following')),'Followers must open the creator latest version');

reset role;
update public.supporter_grants set expires_at=now()-interval '1 second' where grant_key='map-test-owner';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
select pg_temp.denied($q$update public.map_saved_views set title='Expired edit' where id='00000000-0000-4000-8000-000000000001'$q$);
update public.map_saved_views set visibility='private' where id='00000000-0000-4000-8000-000000000001';
select pg_temp.denied($q$update public.map_saved_views set visibility='public' where id='00000000-0000-4000-8000-000000000001'$q$);
select pg_temp.assert_true((select count(*)=2 from public.list_map_saved_views('s5','mine')),'Expired owner lost existing views');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
select pg_temp.assert_true((select count(*)=0 from public.list_map_saved_views('s5','following')),'Private view leaked through following');
select pg_temp.assert_true((select count(*)=1 from public.map_view_follows),'Follow relationship should remain dormant');
reset role;
update public.supporter_grants set expires_at=now()+interval '1 day' where grant_key='map-test-owner';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
update public.map_saved_views set visibility='public' where id='00000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000094',true);
select public.hide_map_saved_view('00000000-0000-4000-8000-000000000001');
select pg_temp.assert_true((select count(*)=0 from public.get_map_saved_view('00000000-0000-4000-8000-000000000002')),'Administrator must not read private views');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
select pg_temp.assert_true((select count(*)=0 from public.list_map_saved_views('s5','following')),'Moderated view leaked through following');
delete from public.map_view_follows where user_id=auth.uid();
select pg_temp.assert_true((select count(*)=0 from public.map_view_follows),'Free account could not unfollow hidden/private view');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
select pg_temp.denied($q$update public.map_saved_views set is_hidden=false where id='00000000-0000-4000-8000-000000000001'$q$);
reset role;
update public.supporter_grants set expires_at=now()-interval '1 second' where grant_key='map-test-owner';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
delete from public.map_saved_views where user_id=auth.uid();
select pg_temp.assert_true((select count(*)=0 from public.list_map_saved_views('s5','mine')),'Expired owner could not delete views');
reset role;
insert into public.map_saved_views(user_id,map_id,title,visibility,settings)
select '00000000-0000-4000-8000-000000000091','s5','Map test pagination '||i,'public',
 '{"version":1,"x":500,"y":300,"zoom":1.5,"overlay":"none","owner":"","contrast":"00000","tile":"","snapshot":"","compare":""}'::jsonb
from generate_series(1,25) i;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.assert_true((select count(*)=20 from public.list_map_saved_views('s5','explore','Map test pagination',0)),'Gallery pages must be bounded to 20');
select pg_temp.assert_true((select count(*)=5 from public.list_map_saved_views('s5','explore','Map test pagination',20)),'Second gallery page is incorrect');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
insert into public.map_view_follows(user_id,view_id) select auth.uid(),id from public.map_saved_views where title like 'Map test pagination %' limit 1;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
delete from public.map_saved_views where user_id=auth.uid();
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
select pg_temp.assert_true((select count(*)=0 from public.map_view_follows),'Deleting an expired owner view must cascade its follows');
reset role;
rollback;
select 'Saved map view permissions passed; fixtures rolled back' as result;
