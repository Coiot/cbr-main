-- Rollback-only role tests. Run after scene-collections.sql as postgres.
begin;
create function pg_temp.collection_check(ok boolean,message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception '%',message;end if;end$$;
create function pg_temp.collection_denied(query text) returns void language plpgsql as $$begin begin execute query;exception when insufficient_privilege or check_violation or serialization_failure or no_data_found or raise_exception then return;end;raise exception 'Unexpectedly allowed: %',query;end$$;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000081','collection-owner@cbr.test',now()),
 ('00000000-0000-4000-8000-000000000082','collection-other@cbr.test',now());
insert into public.profiles(id,email,username) values
 ('00000000-0000-4000-8000-000000000081','collection-owner@cbr.test','Collection reader'),
 ('00000000-0000-4000-8000-000000000082','collection-other@cbr.test','Other reader')
 on conflict(id) do update set username=excluded.username;
insert into public.supporter_grants(grant_key,email,source,expires_at,note) values
 ('collection-test','collection-owner@cbr.test','import',now()+interval '1 day','Rollback test');
update public.supporter_access_config set enabled=true where singleton;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000081';
select public.change_scene_collection('save',p_draft:='{"title":"Private","scenes":[{"path":"/albums/s5/Episode1/","number":1,"note":"private note"}]}');
select set_config('collection.test_id',(select id::text from public.scene_collections where user_id=auth.uid()),true);
select pg_temp.collection_check(public.get_scene_collection(current_setting('collection.test_id')::uuid) is null,'Private collection leaked');
select pg_temp.collection_denied($q$insert into public.scene_collections(user_id,title) values(auth.uid(),'Bypass')$q$);
select pg_temp.collection_denied($q$update public.scene_collections set published=true$q$);
select pg_temp.collection_denied($q$select public.change_scene_collection('save',current_setting('collection.test_id')::uuid,99,'{"title":"Stale"}')$q$);
select pg_temp.collection_denied($q$select public.change_scene_collection('save',p_draft:='{"title":"Bad","scenes":[{"path":"/albums/s5/Episode1/","number":"1"}]}')$q$);
select pg_temp.collection_denied($q$select public.change_scene_collection('save',p_draft:='{"title":"Bad","scenes":[{"path":"/albums/s5/Episode1/","number":1,"extra":"hidden"}]}')$q$);
select pg_temp.collection_denied($q$select public.change_scene_collection('save',p_draft:='{"title":"Bad","scenes":[{"path":"/albums/s5/Episode1/","number":1,"note":null}]}')$q$);
select pg_temp.collection_check(public.valid_collection_scenes('[{"path":"/albums/pr/s5pr0/","number":6}]'),'PR zero reference rejected');
select pg_temp.collection_check(not public.valid_collection_scenes('[{"path":"/albums/pr/unknown/","number":1}]'),'Malformed PR path accepted');
-- Reactions are deliberately independent: scenes do not need to be favourites.
select public.change_scene_collection('add',current_setting('collection.test_id')::uuid,p_scenes:='[{"path":"/albums/s5/Episode1/","number":1},{"path":"/albums/s5/Episode1/","number":2},{"path":"/albums/pr/s5pr0/","number":6}]');
select pg_temp.collection_check((select jsonb_array_length(scenes)=3 and scenes->0->>'note'='private note' from public.scene_collections where id=current_setting('collection.test_id')::uuid),'Add duplicated or overwrote a note');
select public.change_scene_collection('save',current_setting('collection.test_id')::uuid,2,'{"title":"Published","published":true,"featured":true,"scenes":[{"path":"/albums/s5/Episode1/","number":2,"note":"second"},{"path":"/albums/s5/Episode1/","number":1}]}');
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000082';
select pg_temp.collection_check((select count(*)=0 from public.scene_collections),'Other account read owner records');
select pg_temp.collection_denied($q$select public.change_scene_collection('delete',current_setting('collection.test_id')::uuid)$q$);
select pg_temp.collection_denied($q$select public.change_scene_collection('save',p_draft:='{"title":"No access"}')$q$);
set local role anon;
select pg_temp.collection_denied('select * from public.scene_collections');
select pg_temp.collection_check(public.get_scene_collection(current_setting('collection.test_id')::uuid)->>'title'='Published','Guest could not read collection');
select pg_temp.collection_check(not(public.get_scene_collection(current_setting('collection.test_id')::uuid)::text like '%@%'),'Public collection leaked email');
select pg_temp.collection_check(public.get_scene_collection(current_setting('collection.test_id')::uuid)->'scenes'->0->>'note'='second','Curated order lost');
select pg_temp.collection_check((public.list_scene_collections('Published')->>'total')::integer=1,'Public search incorrect');
select pg_temp.collection_check(not(public.list_scene_collections()::text like '%private note%'),'List exposed scene content');
reset role;
insert into public.supporter_showcases(id,user_id,published) values('00000000-0000-4000-8000-000000000083','00000000-0000-4000-8000-000000000081',true);
select pg_temp.collection_check((public.list_scene_collections(p_showcase:='00000000-0000-4000-8000-000000000083')->>'total')::integer=1,'Showcase collection missing');
update public.supporter_showcases set published=false where id='00000000-0000-4000-8000-000000000083';
select pg_temp.collection_check((public.list_scene_collections(p_showcase:='00000000-0000-4000-8000-000000000083')->>'total')::integer=0,'Unpublished showcase leaked');
update public.scene_collections set is_hidden=true where id=current_setting('collection.test_id')::uuid;
select pg_temp.collection_check(public.get_scene_collection(current_setting('collection.test_id')::uuid) is null,'Moderation hide did not apply');
update public.scene_collections set is_hidden=false where id=current_setting('collection.test_id')::uuid;
update public.supporter_grants set expires_at=now()-interval '1 second' where grant_key='collection-test';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000081';
select pg_temp.collection_check(public.get_scene_collection(current_setting('collection.test_id')::uuid) is not null,'Expiry erased collection');
select pg_temp.collection_denied($q$select public.change_scene_collection('add',current_setting('collection.test_id')::uuid,p_scenes:='[{"path":"/albums/s5/Episode1/","number":3}]')$q$);
select public.change_scene_collection('private',current_setting('collection.test_id')::uuid);
select pg_temp.collection_check(public.get_scene_collection(current_setting('collection.test_id')::uuid) is null,'Expired owner could not privatize');
select pg_temp.collection_denied($q$select public.change_scene_collection('save',current_setting('collection.test_id')::uuid,4,'{"title":"Republish","published":true}')$q$);
select public.change_scene_collection('delete',current_setting('collection.test_id')::uuid);
select pg_temp.collection_check((select count(*)=0 from public.scene_collections),'Expired owner could not delete');
reset role;
update public.supporter_grants set expires_at=now()+interval '1 day' where grant_key='collection-test';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000081';
do $$begin
 for i in 1..20 loop
  perform public.change_scene_collection('save',p_draft:=jsonb_build_object('title','Limit '||i,'published',i<=3,'featured',i<=3));
 end loop;
end$$;
select pg_temp.collection_denied($q$select public.change_scene_collection('save',p_draft:='{"title":"Twenty-one"}')$q$);
select set_config('collection.test_id',(select id::text from public.scene_collections where title='Limit 4'),true);
select pg_temp.collection_denied($q$select public.change_scene_collection('save',current_setting('collection.test_id')::uuid,1,'{"title":"Fourth featured","published":true,"featured":true}')$q$);
select pg_temp.collection_denied($q$select public.change_scene_collection('add',current_setting('collection.test_id')::uuid,p_scenes:=(select jsonb_agg(jsonb_build_object('path','/albums/s5/Episode1/','number',n)) from generate_series(1,101) n))$q$);
select pg_temp.collection_denied($q$select public.change_scene_collection('add',current_setting('collection.test_id')::uuid,p_scenes:='[{"path":"/albums/s5/Episode1/","number":1},{"path":"/albums/s5/Episode1/","number":1}]')$q$);
reset role;
select 'Collection role checks passed; fixtures rolled back' as result;
rollback;
