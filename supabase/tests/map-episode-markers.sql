-- Disposable database only. All fixtures roll back.
begin;
create function pg_temp.assert_true(value boolean,message text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception '%',message; end if; end $$;
create function pg_temp.denied(statement text) returns void language plpgsql as $$
begin begin execute statement;exception when others then return;end;raise exception 'Unexpectedly allowed: %',statement;end $$;
insert into public.map_releases(id,history,first_turn,last_turn,bookmarks) values
 (repeat('a',64),'00000000-0000-4000-8000-000000000078',0,751,'[{"episode":"99","turn":751}]'),
 (repeat('b',64),'00000000-0000-4000-8000-000000000078',0,595,'[{"episode":"34","turn":595}]'),
 (repeat('c',64),'00000000-0000-4000-8000-000000000078',0,620,'[{"episode":"34","turn":595},{"episode":"35","turn":620}]'),
 (repeat('d',64),'00000000-0000-4000-8000-000000000079',0,800,'[{"episode":"99","turn":800}]'),
 (repeat('e',64),'00000000-0000-4000-8000-000000000078',0,999,'[{"episode":"99","turn":999}]');
update public.map_release_control set active_release=null,source_release=null,enabled=false where map_id='s5';
set local role anon;
select pg_temp.denied($q$select source_release from public.map_release_control$q$);
select pg_temp.denied($q$select public.set_map_timeline_source('88c12d80-cdc8-44cf-a174-a75c63bb5936',repeat('a',64))$q$);
reset role;
set local role authenticated;
select pg_temp.denied($q$select public.publish_map_episode('88c12d80-cdc8-44cf-a174-a75c63bb5936',repeat('a',64),repeat('b',64),null)$q$);
reset role;
set local role service_role;
select pg_temp.denied($q$select public.set_map_timeline_source('00000000-0000-4000-8000-000000000080',repeat('a',64))$q$);
select public.set_map_timeline_source('88c12d80-cdc8-44cf-a174-a75c63bb5936',repeat('a',64));
select pg_temp.assert_true((select not enabled and active_release is null from public.map_release_control),'Staging advanced the public endpoint');
select pg_temp.denied($q$select public.publish_map_episode('00000000-0000-4000-8000-000000000080',repeat('a',64),repeat('b',64),null)$q$);
select public.publish_map_episode('88c12d80-cdc8-44cf-a174-a75c63bb5936',repeat('a',64),repeat('b',64),null);
select pg_temp.assert_true((select r.last_turn=595 from public.map_release_control c join public.map_releases r on r.id=c.active_release),'The full source became public');
select pg_temp.assert_true((select published_at is null from public.map_releases where id=repeat('a',64)),'The source was published instead of its bounded copy');
select pg_temp.assert_true(not public.map_view_source_available('s5','timeline:00000000-0000-4000-8000-000000000078:596'),'Future saved view was exposed');
select pg_temp.denied($q$select public.set_map_timeline_source('88c12d80-cdc8-44cf-a174-a75c63bb5936',repeat('d',64))$q$);
select pg_temp.denied($q$select public.publish_map_episode('88c12d80-cdc8-44cf-a174-a75c63bb5936',repeat('a',64),repeat('d',64),repeat('b',64))$q$);
select pg_temp.denied($q$select public.publish_map_episode('88c12d80-cdc8-44cf-a174-a75c63bb5936',repeat('a',64),repeat('e',64),repeat('b',64))$q$);
select public.publish_map_episode('88c12d80-cdc8-44cf-a174-a75c63bb5936',repeat('a',64),repeat('c',64),repeat('b',64));
select pg_temp.denied($q$select public.publish_map_episode('88c12d80-cdc8-44cf-a174-a75c63bb5936',repeat('a',64),repeat('b',64),repeat('b',64))$q$);
select public.set_map_timeline_source('88c12d80-cdc8-44cf-a174-a75c63bb5936',repeat('e',64));
select pg_temp.assert_true((select active_release=repeat('c',64) from public.map_release_control),'A newer source advanced publication automatically');
select pg_temp.denied($q$select public.publish_map_episode('88c12d80-cdc8-44cf-a174-a75c63bb5936',repeat('a',64),repeat('b',64),repeat('c',64))$q$);
select public.publish_map_episode('88c12d80-cdc8-44cf-a174-a75c63bb5936',repeat('e',64),repeat('b',64),repeat('c',64));
select pg_temp.assert_true(not public.map_view_source_available('s5','timeline:00000000-0000-4000-8000-000000000078:620'),'Rollback failed to hide later views');
reset role;
rollback;
