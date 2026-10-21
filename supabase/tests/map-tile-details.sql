-- Disposable test database only. Fixtures roll back.
begin;
create function pg_temp.assert_true(value boolean,message text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception '%',message; end if; end $$;
create function pg_temp.denied(statement text) returns void language plpgsql as $$
begin begin execute statement; exception when others then return; end;raise exception 'Unexpectedly allowed: %',statement;end $$;
insert into public.map_releases(id,history,first_turn,last_turn,bookmarks,published_at)
  values(repeat('e',64),'00000000-0000-4000-8000-000000000078',0,4,'[]',now());
update public.map_release_control set active_release=repeat('e',64),enabled=true where map_id='s5';
insert into public.profiles(id,username) values('00000000-0000-4000-8000-000000000080','Editor');
set local role anon;
select pg_temp.denied($q$select * from public.map_tile_details$q$);
reset role;
set local role authenticated;
select pg_temp.denied($q$select public.can_edit_map_details('88c12d80-cdc8-44cf-a174-a75c63bb5936')$q$);
select pg_temp.denied($q$insert into public.map_tile_details(history,detail_key,tile,field,observed_turn,record,author,author_name)
  values('00000000-0000-4000-8000-000000000078','20:notes',20,'notes',1,'{}','00000000-0000-4000-8000-000000000080','Forged')$q$);
reset role;
set local role service_role;
select pg_temp.assert_true(not public.can_edit_map_details('00000000-0000-4000-8000-000000000079'),'Reader gained editor access');
select pg_temp.assert_true(public.can_edit_map_details('00000000-0000-4000-8000-000000000080'),'Supporter lost editor access');
select pg_temp.assert_true(public.can_edit_map_details('88c12d80-cdc8-44cf-a174-a75c63bb5936'),'Coiot lost editor access');
select public.write_map_tile_detail('00000000-0000-4000-8000-000000000080','00000000-0000-4000-8000-000000000078',1,
  '{"tile":20,"city":null,"owner":null,"field":"notes","value":"Observed","author":"Forged","reference":""}',0);
select pg_temp.assert_true((select record->>'author'='Editor' from public.map_tile_details),'Public author was not set by the server');
select pg_temp.denied($q$select public.write_map_tile_detail('00000000-0000-4000-8000-000000000079','00000000-0000-4000-8000-000000000078',1,
  '{"tile":20,"field":"notes"}',1)$q$);
select pg_temp.denied($q$select public.write_map_tile_detail('00000000-0000-4000-8000-000000000080','00000000-0000-4000-8000-000000000078',1,
  '{"tile":20,"field":"owner"}',0)$q$);
select pg_temp.denied($q$select public.write_map_tile_detail('00000000-0000-4000-8000-000000000080','00000000-0000-4000-8000-000000000078',751,
  '{"tile":20,"field":"notes"}',1)$q$);
select pg_temp.denied($q$select public.write_map_tile_detail('00000000-0000-4000-8000-000000000080','00000000-0000-4000-8000-000000000078',1,
  '{"tile":20,"field":"notes","fromTurn":1,"toTurn":1}',1)$q$);
select pg_temp.denied($q$select public.write_map_tile_detail('00000000-0000-4000-8000-000000000080','00000000-0000-4000-8000-000000000078',1,
  '{"tile":20,"field":"notes"}',0)$q$);
select public.write_map_tile_detail('00000000-0000-4000-8000-000000000080','00000000-0000-4000-8000-000000000078',4,
  '{"tile":20,"city":null,"owner":null,"field":"notes","value":"Updated","author":"Forged","reference":""}',1);
select pg_temp.assert_true((select count(*)=1 from public.map_tile_details),'Editing at a new turn created a second layer');
select pg_temp.assert_true((select record->>'value'='Updated' and observed_turn=4 and revision=2 from public.map_tile_details),'Live value was not replaced');
select pg_temp.assert_true((select count(*)=1 from public.map_tile_detail_history),'Missing private recovery record');
-- A capital is one current value per civilization, even when moved to another tile.
select public.write_map_tile_detail('00000000-0000-4000-8000-000000000080','00000000-0000-4000-8000-000000000078',4,
  '{"tile":20,"city":1,"owner":0,"field":"capital","value":true,"author":"Forged","reference":""}',0);
select public.write_map_tile_detail('00000000-0000-4000-8000-000000000080','00000000-0000-4000-8000-000000000078',4,
  '{"tile":30,"city":2,"owner":0,"field":"capital","value":true,"author":"Forged","reference":""}',1);
select pg_temp.assert_true((select count(*)=1 from public.map_tile_details where field='capital'),'Multiple live capitals for one civilization');
select pg_temp.denied($q$insert into public.tile_overrides values('s5','1,1','{}')$q$);
reset role;
rollback;
