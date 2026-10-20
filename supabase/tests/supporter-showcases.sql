-- Rollback-only integration suite. Run after supporter-showcases.sql as an administrator.
begin;
create or replace function pg_temp.check_showcase(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception '%',message; end if; end $$;
create or replace function pg_temp.showcase_denied(query text) returns void language plpgsql as $$
begin
  begin execute query; exception when insufficient_privilege or check_violation then return; end;
  raise exception 'Expected rejection: %',query;
end $$;
select pg_temp.check_showcase(not exists(select 1 from auth.users where id in
 ('00000000-0000-4000-8000-000000000071','00000000-0000-4000-8000-000000000072','00000000-0000-4000-8000-000000000073')), 'Showcase fixture IDs are already in use');
update public.supporter_access_config set enabled=true where singleton;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000071','showcase-owner@cbr.test',now()),
 ('00000000-0000-4000-8000-000000000072','showcase-free@cbr.test',now()),
 ('00000000-0000-4000-8000-000000000073','showcase-private@cbr.test',now());
insert into public.profiles(id,email,username) values
 ('00000000-0000-4000-8000-000000000071','spoofed-email@cbr.test','Showcase test owner'),
 ('00000000-0000-4000-8000-000000000072','showcase-free@cbr.test','Showcase test free'),
 ('00000000-0000-4000-8000-000000000073','showcase-private@cbr.test','Showcase test private')
 on conflict(id) do update set username=excluded.username;
insert into public.user_settings(user_id,settings) values
 ('00000000-0000-4000-8000-000000000071','{"favoriteCiv":"Japan","customFlair":"Team test","privatePreference":"never expose"}')
 on conflict(user_id) do update set settings=excluded.settings;
insert into public.supporter_grants(grant_key,email,source,expires_at,note) values
 ('showcase-test-owner','showcase-owner@cbr.test','import',now()+interval '1 day','Showcase rollback test'),
 ('showcase-test-private','showcase-private@cbr.test','import',now()+interval '1 day','Showcase rollback test'),
 ('showcase-test-no-account','showcase-no-account@cbr.test','import',now()+interval '1 day','Showcase rollback test'),
 ('showcase-test-email-like','showcase-email-like@cbr.test','import',now()+interval '1 day','Showcase rollback test');
insert into public.supporter_credit_details(email,legacy_name,legacy_civ,kofi_paid_at,kofi_public) values
 ('showcase-owner@cbr.test','Showcase legacy owner','Rome',now(),true),
 ('showcase-no-account@cbr.test','Showcase test no account','Japan',now(),true),
 ('showcase-email-like@cbr.test','accidental-email@cbr.test','',now(),true),
 ('showcase-private@cbr.test','Showcase PRIVATE LEGACY','',now(),false);
insert into public.album_reactions(user_id,page_path,scene_number,reaction_key) values
 ('00000000-0000-4000-8000-000000000071','/albums/s5/Episode1/',1,'star');
insert into public.map_saved_views(id,user_id,map_id,title,visibility,settings) values
 ('00000000-0000-4000-8000-000000000061','00000000-0000-4000-8000-000000000071','s5','Showcase test map','public','{"version":1,"x":1,"y":1,"zoom":1,"overlay":"none","owner":"","contrast":"11111","tile":"","snapshot":"","compare":""}');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000071';
insert into public.supporter_showcases(id,user_id,introduction,competitors,scenes,map_views,published) values
 ('00000000-0000-4000-8000-000000000051',auth.uid(),'Showcase test introduction',array['Rome'],'[{"path":"/albums/s5/Episode1/","number":1}]',array['00000000-0000-4000-8000-000000000061']::uuid[],false);
select pg_temp.showcase_denied($q$update public.supporter_showcases set scenes='[{"path":"/albums/s5/Episode1/","number":2}]' where user_id=auth.uid()$q$);
select pg_temp.showcase_denied($q$update public.supporter_showcases set scenes='[{"path":null,"number":1}]' where user_id=auth.uid()$q$);
select pg_temp.showcase_denied($q$update public.supporter_showcases set id='00000000-0000-4000-8000-000000000052' where user_id=auth.uid()$q$);
select pg_temp.showcase_denied($q$update public.supporter_showcases set introduction=repeat('x',401) where user_id=auth.uid()$q$);
select pg_temp.check_showcase(public.get_supporter_showcase('00000000-0000-4000-8000-000000000051') is null,'Private draft leaked through public RPC');
update public.supporter_showcases set published=true where user_id=auth.uid();
-- A free account cannot create or modify supporter content, but can manage its directory preference.
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000072';
select pg_temp.showcase_denied($q$insert into public.supporter_showcases(user_id,published) values(auth.uid(),true)$q$);
select pg_temp.check_showcase((select count(*) from public.supporter_showcases)=0,'Another account could read the private owner table');
insert into public.supporter_directory_preferences(user_id,hidden) values(auth.uid(),true);
select pg_temp.showcase_denied($q$insert into public.supporter_directory_preferences(user_id,hidden) values('00000000-0000-4000-8000-000000000071',true)$q$);
-- Anyone can browse credit names, including donors without accounts. No payment identity is exposed.
set local role anon;
select pg_temp.check_showcase((public.list_supporter_directory('Showcase test','Japan',0)->>'total')::integer=2,'Directory lost public credit names or civ filtering');
select pg_temp.check_showcase(not (public.list_supporter_directory()::text like '%@%'),'Directory exposed an email-like name or payment email');
select pg_temp.check_showcase(not (public.list_supporter_directory()::text like '%Showcase PRIVATE%'),'Private payment overrode directory privacy');
select pg_temp.check_showcase(public.get_supporter_showcase('00000000-0000-4000-8000-000000000051')->>'display_name'='Showcase test owner','Published profile unavailable');
select pg_temp.check_showcase(not (public.get_supporter_showcase('00000000-0000-4000-8000-000000000051')::text like '%never expose%'),'Private settings leaked');
select pg_temp.check_showcase((public.get_supporter_showcase('00000000-0000-4000-8000-000000000051')->>'active')::boolean,'Active badge incorrect');
select pg_temp.check_showcase(jsonb_array_length(public.get_supporter_showcase('00000000-0000-4000-8000-000000000051')->'map_views')=1,'Public selected view missing');
select pg_temp.check_showcase((select count(*) from public.lookup_supporter_showcases(array['00000000-0000-4000-8000-000000000071']::uuid[]))=1,'Published byline lookup missing');
select pg_temp.showcase_denied('select * from public.supporter_showcases');
select pg_temp.showcase_denied('select * from public.supporter_credit_roster()');
select pg_temp.showcase_denied('select * from public.get_supporter_credits()');
reset role;
-- Privatizing a selected view removes it immediately from a public showcase.
update public.map_saved_views set visibility='private' where id='00000000-0000-4000-8000-000000000061';
select pg_temp.check_showcase(jsonb_array_length(public.get_supporter_showcase('00000000-0000-4000-8000-000000000051')->'map_views')=0,'Private map view leaked');
update public.supporter_grants set expires_at=now()-interval '1 second' where grant_key='showcase-test-owner';
set local role anon;
select pg_temp.check_showcase(public.get_supporter_showcase('00000000-0000-4000-8000-000000000051') is not null,'Expiry erased existing showcase');
select pg_temp.check_showcase(not (public.get_supporter_showcase('00000000-0000-4000-8000-000000000051')->>'active')::boolean,'Expired badge still active');
select pg_temp.check_showcase((public.list_supporter_directory('Showcase test owner')->>'total')::integer=0,'Expired supporter stayed in current directory');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000071';
select pg_temp.showcase_denied($q$update public.supporter_showcases set introduction='Expired edit' where user_id=auth.uid()$q$);
update public.supporter_showcases set published=false where user_id=auth.uid();
select pg_temp.check_showcase(public.get_supporter_showcase('00000000-0000-4000-8000-000000000051') is null,'Unpublished showcase still public');
insert into public.supporter_directory_preferences(user_id,hidden) values(auth.uid(),true);
select pg_temp.showcase_denied($q$update public.supporter_showcases set published=true where user_id=auth.uid()$q$);
delete from public.supporter_showcases where user_id=auth.uid();
reset role;
-- Directory opt-out survives renewed access; artwork credits remain independent.
update public.supporter_grants set expires_at=now()+interval '1 day' where grant_key='showcase-test-owner';
select pg_temp.check_showcase((public.list_supporter_directory('Showcase test owner')->>'total')::integer=0,'Directory opt-out lost after renewal');
select pg_temp.check_showcase(exists(select 1 from public.get_supporter_credits() where display_name='Showcase test owner'),'Directory opt-out rewrote episode credits');
select 'Supporter showcase checks passed; all fixtures rolled back' as result;
rollback;
