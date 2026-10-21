-- Run after map-official-timeline.sql. All fixtures and changes roll back.
begin;
create function pg_temp.assert_true(value boolean,message text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception '%',message; end if; end $$;
create function pg_temp.denied(statement text) returns void language plpgsql as $$
begin
  begin execute statement; exception when others then return; end;
  raise exception 'Unexpectedly allowed: %',statement;
end $$;
insert into public.map_releases(id,history,first_turn,last_turn,bookmarks) values
 (repeat('a',64),'00000000-0000-4000-8000-000000000078',0,4,'[{"episode":"1","turn":4}]'),
 (repeat('b',64),'00000000-0000-4000-8000-000000000078',0,5,'[{"episode":"2","turn":5}]');
update public.map_release_control set active_release=null,enabled=false where map_id='s5';
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000079');
insert into public.profiles(id,username) values ('00000000-0000-4000-8000-000000000079','Map reader');
insert into storage.objects(bucket_id,name) values('map-release-drafts','map-release-security-fixture');
-- Even an unrelated pre-existing permissive policy must not reveal drafts.
create policy map_release_test_permissive on storage.objects for select to anon,authenticated using(true);

set local role anon;
select pg_temp.assert_true((select count(*)=0 from storage.objects where bucket_id='map-release-drafts'),'Draft bypassed restrictive storage policy');
select pg_temp.denied($q$select * from public.map_releases$q$);
select pg_temp.denied($q$select public.publish_map_release('88c12d80-cdc8-44cf-a174-a75c63bb5936',repeat('a',64),null)$q$);
reset role;
set local role authenticated;
select pg_temp.denied($q$update public.map_release_control set enabled=true$q$);
select pg_temp.denied($q$insert into public.map_releases(id,history,first_turn,last_turn,bookmarks)
 values(repeat('c',64),'00000000-0000-4000-8000-000000000078',0,751,'[]')$q$);
select pg_temp.denied($q$select public.write_map_contribution('00000000-0000-4000-8000-000000000079','00000000-0000-4000-8000-000000000078',1,1,'population','12','',0,false)$q$);
reset role;

set local role service_role;
select pg_temp.denied($q$select public.publish_map_release('00000000-0000-4000-8000-000000000079',repeat('a',64),null)$q$);
select public.publish_map_release('88c12d80-cdc8-44cf-a174-a75c63bb5936',repeat('a',64),null);
select pg_temp.assert_true((select enabled from public.map_release_control where map_id='s5'),'Cutover not enabled');
select pg_temp.assert_true(public.map_view_source_available('s5','timeline:00000000-0000-4000-8000-000000000078:4'),'Released view rejected');
select pg_temp.assert_true(not public.map_view_source_available('s5','timeline:00000000-0000-4000-8000-000000000078:5'),'Future view accepted');
select pg_temp.assert_true(not public.map_view_source_available('s5','timeline:00000000-0000-4000-8000-000000000078:abc'),'Malformed view accepted');
select pg_temp.denied($q$select public.publish_map_release('88c12d80-cdc8-44cf-a174-a75c63bb5936',repeat('b',64),null)$q$);
select public.write_map_contribution('00000000-0000-4000-8000-000000000079','00000000-0000-4000-8000-000000000078',1,1,'population','12','Scene 3',0,false);
select pg_temp.denied($q$select public.write_map_contribution('00000000-0000-4000-8000-000000000079','00000000-0000-4000-8000-000000000078',1,1,'population','14','',0,false)$q$);
select public.write_map_contribution('00000000-0000-4000-8000-000000000079','00000000-0000-4000-8000-000000000078',1,1,'population','14','Scene 4',1,false);
select pg_temp.assert_true((select count(*)=1 from public.map_contribution_history where history='00000000-0000-4000-8000-000000000078'),'Missing edit history');
select pg_temp.denied($q$select public.write_map_contribution('00000000-0000-4000-8000-000000000079','00000000-0000-4000-8000-000000000078',751,1,'population','14','',0,false)$q$);
select pg_temp.denied($q$insert into public.tile_overrides(map_id,tile_key,payload) values('s5','1,1','{}')$q$);
select pg_temp.assert_true((select public=false from storage.buckets where id='map-release-drafts'),'Draft storage is public');
reset role;
rollback;
