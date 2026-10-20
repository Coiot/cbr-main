-- Run after showcase-public-content.sql. All fixtures and changes roll back.
begin;
create or replace function pg_temp.content_check(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception '%',message; end if; end $$;
create or replace function pg_temp.content_denied(query text) returns void language plpgsql as $$
begin begin execute query; exception when insufficient_privilege or check_violation then return; end;
raise exception 'Expected rejection: %',query; end $$;
select pg_temp.content_check(not exists(select 1 from auth.users where id in('00000000-0000-4000-8000-000000000078','00000000-0000-4000-8000-000000000079')),'Fixture accounts already exist');
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000078','showcase-content@cbr.test',now()),
 ('00000000-0000-4000-8000-000000000079','showcase-other-content@cbr.test',now());
insert into public.profiles(id,email,username) values
 ('00000000-0000-4000-8000-000000000078','showcase-content@cbr.test','Public content fixture'),
 ('00000000-0000-4000-8000-000000000079','showcase-other-content@cbr.test','Other content fixture') on conflict(id) do update set username=excluded.username;
insert into public.showcase_showrunners(user_id) values('00000000-0000-4000-8000-000000000078');
insert into public.supporter_showcases(id,user_id,published) values('00000000-0000-4000-8000-000000000058','00000000-0000-4000-8000-000000000078',false);
insert into public.scene_collections(user_id,title,published,featured) select '00000000-0000-4000-8000-000000000078', 'Public collection '||n,true,n=1 from generate_series(1,5) n;
insert into public.scene_collections(user_id,title,published,is_hidden) values
 ('00000000-0000-4000-8000-000000000078','PRIVATE collection marker',false,false),
 ('00000000-0000-4000-8000-000000000078','HIDDEN collection marker',true,true),
 ('00000000-0000-4000-8000-000000000079','OTHER collection marker',true,false);
insert into public.map_snapshots(id,map_id,episode_label,episode_at,payload,created_by,is_published) values
 ('00000000-0000-4000-8000-000000000068','s5','Public snapshot fixture',now(),'[{"tile_key":"998,995","payload":{"notes":"Owned archived note"}}]','00000000-0000-4000-8000-000000000078',true),
 ('00000000-0000-4000-8000-000000000069','s5','PRIVATE snapshot marker',now(),'[]','00000000-0000-4000-8000-000000000078',false);
insert into public.map_saved_views(user_id,map_id,title,visibility,settings) select '00000000-0000-4000-8000-000000000078','s5','Public view '||n,'public',
 '{"version":1,"x":100,"y":100,"zoom":1,"overlay":"none","owner":"","contrast":"00000","tile":"","snapshot":"","compare":""}'::jsonb from generate_series(1,25) n;
insert into public.map_saved_views(user_id,map_id,title,visibility,is_hidden,settings) values
 ('00000000-0000-4000-8000-000000000078','s5','PRIVATE view marker','private',false,'{"version":1,"x":100,"y":100,"zoom":1,"overlay":"none","owner":"","contrast":"00000","tile":"","snapshot":"","compare":""}'),
 ('00000000-0000-4000-8000-000000000078','s5','HIDDEN view marker','public',true,'{"version":1,"x":100,"y":100,"zoom":1,"overlay":"none","owner":"","contrast":"00000","tile":"","snapshot":"","compare":""}'),
 ('00000000-0000-4000-8000-000000000078','s5','UNPUBLISHED SOURCE view marker','public',false,'{"version":1,"x":100,"y":100,"zoom":1,"overlay":"none","owner":"","contrast":"00000","tile":"","snapshot":"00000000-0000-4000-8000-000000000069","compare":""}');
insert into public.tile_edits(map_id,tile_key,payload,edited_by,edited_at) values
 ('s5','998,998','{"notes":"Owned public note"}','00000000-0000-4000-8000-000000000078',now()-interval '3 minutes'),
 ('s5','998,998','{"notes":"Owned public note","owner":1}','00000000-0000-4000-8000-000000000079',now()-interval '2 minutes'),
 ('s5','998,997','{"notes":"OTHER note marker"}','00000000-0000-4000-8000-000000000079',now()-interval '3 minutes'),
 ('s5','998,997','{"notes":"OTHER note marker","owner":2}','00000000-0000-4000-8000-000000000078',now()-interval '2 minutes'),
 ('s5','998,995','{"notes":"Owned archived note"}','00000000-0000-4000-8000-000000000078',now()-interval '3 minutes'),
 ('s5','998,996','{"notes":"PRIVATE note marker"}','00000000-0000-4000-8000-000000000078',now()-interval '3 minutes');
insert into public.tile_overrides(map_id,tile_key,snapshot_id,payload,updated_by) values
 ('s5','998,998','00000000-0000-4000-8000-000000000068','{"notes":"Owned public note","owner":1}','00000000-0000-4000-8000-000000000079'),
 ('s5','998,997','00000000-0000-4000-8000-000000000068','{"notes":"OTHER note marker","owner":2}','00000000-0000-4000-8000-000000000078'),
 ('s5','998,996','00000000-0000-4000-8000-000000000069','{"notes":"PRIVATE note marker"}','00000000-0000-4000-8000-000000000078');
insert into public.album_comments(user_id,page_path,message) values
 ('00000000-0000-4000-8000-000000000078','/albums/s5/Episode1/','Public fixture discussion'),
 ('00000000-0000-4000-8000-000000000079','/albums/s5/Episode1/','OTHER comment marker');
set local role anon;
set local request.jwt.claim.sub='';
select pg_temp.content_check(public.get_showcase_public_content('00000000-0000-4000-8000-000000000058') is null,'Private showcase content leaked');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000079';
select pg_temp.content_check(public.get_showcase_public_content('00000000-0000-4000-8000-000000000058') is null,'Another account could preview a private showcase');
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000078';
select pg_temp.content_check(jsonb_array_length(public.get_showcase_public_content('00000000-0000-4000-8000-000000000058')->'collections')=5,'Owner preview lost unfeatured public collections');
select pg_temp.content_check(jsonb_array_length(public.get_showcase_public_content('00000000-0000-4000-8000-000000000058')->'map_pins')=0,'Pins were shared without a selection');
update public.supporter_showcases set published=true,map_pins='[{"map_id":"s5","name":"Shared location","tile_key":"1,2","city_name":"Test city","owner_name":"Japan"}]' where user_id=auth.uid();
select pg_temp.content_denied($q$update public.supporter_showcases set map_pins='[{"map_id":"s5","name":"Bad","tile_key":"javascript:bad","city_name":"","owner_name":""}]' where user_id=auth.uid()$q$);
select pg_temp.content_denied($q$update public.supporter_showcases set map_pins='[{"map_id":"s5","name":"Bad","tile_key":"1,2","city_name":"","owner_name":"","email":"PRIVATE"}]' where user_id=auth.uid()$q$);
set local role anon;
set local request.jwt.claim.sub='';
select pg_temp.content_check(jsonb_array_length(public.get_showcase_public_content('00000000-0000-4000-8000-000000000058')->'collections')=5,'Public collection list remained featured-only');
select pg_temp.content_check(jsonb_array_length(public.get_showcase_public_content('00000000-0000-4000-8000-000000000058')->'map_views')=25,'Public map views remained limited to selected or first-page views');
select pg_temp.content_check(jsonb_array_length(public.get_showcase_public_content('00000000-0000-4000-8000-000000000058')->'map_notes')=2,'Notes were attributed to a terrain editor instead of the note author');
select pg_temp.content_check(public.get_showcase_public_content('00000000-0000-4000-8000-000000000058')->'map_notes'->0->>'note'='Owned public note','Owned map note missing');
select pg_temp.content_check(exists(select 1 from jsonb_array_elements(public.get_showcase_public_content('00000000-0000-4000-8000-000000000058')->'map_notes') n where n->>'note'='Owned archived note'),'Authored note preserved only in a published snapshot was lost');
select pg_temp.content_check(jsonb_array_length(public.get_showcase_public_content('00000000-0000-4000-8000-000000000058')->'snapshots')=1,'Private snapshot leaked or published snapshot missing');
select pg_temp.content_check(jsonb_array_length(public.get_showcase_public_content('00000000-0000-4000-8000-000000000058')->'comments')=1,'Episode comments missing or wrong author');
select pg_temp.content_check(jsonb_array_length(public.get_showcase_public_content('00000000-0000-4000-8000-000000000058')->'map_pins')=1,'Explicitly shared pin missing');
select pg_temp.content_check(not(public.get_showcase_public_content('00000000-0000-4000-8000-000000000058')::text ~ 'PRIVATE|HIDDEN|OTHER|UNPUBLISHED SOURCE|"user_id"|"payload"'),'Private content or identity fields leaked');
select pg_temp.content_denied('select * from public.showcase_snapshot_notes');
select pg_temp.content_denied('select * from public.showcase_snapshot_note_state');
select pg_temp.content_denied($q$select public.index_showcase_snapshot_notes('00000000-0000-4000-8000-000000000068')$q$);
reset role;
update public.map_snapshots set payload='[]' where id='00000000-0000-4000-8000-000000000068';
select pg_temp.content_check(not exists(select 1 from public.showcase_snapshot_notes where snapshot_id='00000000-0000-4000-8000-000000000068'),'Snapshot note index did not refresh after payload change');
select pg_temp.content_check(jsonb_array_length(public.get_showcase_public_content('00000000-0000-4000-8000-000000000058')->'map_notes')=1,'Removed snapshot notes remained visible');
update public.map_snapshots set is_published=false where id='00000000-0000-4000-8000-000000000068';
select pg_temp.content_check(jsonb_array_length(public.get_showcase_public_content('00000000-0000-4000-8000-000000000058')->'map_notes')=0,'Unpublished snapshot notes remained visible');
delete from public.showcase_showrunners where user_id='00000000-0000-4000-8000-000000000078';
update public.supporter_access_config set enabled=true where singleton;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000078';
select pg_temp.content_denied($q$update public.supporter_showcases set map_pins='[]' where user_id=auth.uid()$q$);
update public.supporter_showcases set published=false where user_id=auth.uid();
set local role anon;
set local request.jwt.claim.sub='';
select pg_temp.content_check(public.get_showcase_public_content('00000000-0000-4000-8000-000000000058') is null,'Unpublishing did not hide the content listing');
reset role;
select 'Full showcase content, attribution, pin sharing and privacy checks passed; all fixtures rolled back' as result;
rollback;
