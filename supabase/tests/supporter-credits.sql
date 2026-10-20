-- Run inside a transaction after supporter-credits.sql; all fixtures must roll back.
do $$ begin
  if exists(select 1 from auth.users where id='00000000-0000-4000-8000-000000000081') then raise exception 'Credit fixture ID is already used'; end if;
end $$;
update public.supporter_access_config set enabled=true where singleton;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000081','credits-profile@cbr.test',now());
insert into public.profiles(id,email,username,can_edit) values
 ('00000000-0000-4000-8000-000000000081','credits-spoof@cbr.test','Credits test account',false)
 on conflict(id) do update set email=excluded.email,username=excluded.username;
insert into public.user_settings(user_id,settings) values
 ('00000000-0000-4000-8000-000000000081','{"favoriteCiv":"Japan"}')
 on conflict(user_id) do update set settings=excluded.settings;
insert into public.supporter_credit_details(email,legacy_name,legacy_civ) values
 ('credits-profile@cbr.test','Credits test legacy account','Rome'),
 ('credits-import@cbr.test','Credits test imported','Rome'),
 ('credits-expired@cbr.test','Credits test expired','Rome'),
 ('credits-revoked@cbr.test','Credits test revoked','Rome'),
 ('credits-spoof@cbr.test','Credits test genuine donor','Luba');
insert into public.supporter_grants(grant_key,email,source,expires_at,note) values
 ('credits-test-import','credits-import@cbr.test','import',now()+interval '1 day','Test'),
 ('credits-test-expired','credits-expired@cbr.test','import',now()-interval '1 second','Test'),
 ('credits-test-revoked','credits-revoked@cbr.test','import',now()+interval '1 day','Test'),
 ('credits-test-spoof','credits-spoof@cbr.test','import',now()+interval '1 day','Test');
update public.supporter_grants set revoked_at=now() where grant_key='credits-test-revoked';
select public.record_kofi_payment(jsonb_build_object('message_id','credits-test-profile','transaction_id','credits-test-profile','email','credits-profile@cbr.test','kind','one_time','paid_at',now(),'amount','1','currency','USD','credit_public',true,'credit_name','Credits test Ko-fi account'));
select public.record_kofi_payment(jsonb_build_object('message_id','credits-test-new','transaction_id','credits-test-new','email','credits-new@cbr.test','kind','one_time','paid_at',now(),'amount','1','currency','USD','credit_public',true,'credit_name','Credits test new donor'));
select public.record_kofi_payment(jsonb_build_object('message_id','credits-test-private','transaction_id','credits-test-private','email','credits-private@cbr.test','kind','one_time','paid_at',now(),'amount','1','currency','USD','credit_public',false,'credit_name','Credits test private donor'));
-- Old events and replayed transaction IDs must not alter a newer credit choice.
select public.record_kofi_payment(jsonb_build_object('message_id','credits-test-old','transaction_id','credits-test-old','email','credits-new@cbr.test','kind','one_time','paid_at',now()-interval '1 day','amount','1','currency','USD','credit_public',false));
select public.record_kofi_payment(jsonb_build_object('message_id','credits-test-replay','transaction_id','credits-test-new','email','credits-new@cbr.test','kind','one_time','paid_at',now(),'amount','1','currency','USD','credit_public',false));
do $$ begin
  if not exists(select 1 from public.get_supporter_credits() where display_name='Credits test account' and favorite_civ='Japan') then raise exception 'Account name/civ override not applied'; end if;
  if not exists(select 1 from public.get_supporter_credits() where display_name='Credits test imported' and favorite_civ='Rome') then raise exception 'Imported donor without an account missing'; end if;
  if not exists(select 1 from public.get_supporter_credits() where display_name='Credits test new donor') then raise exception 'New public donor missing or old event overwrote name'; end if;
  if not exists(select 1 from public.get_supporter_credits() where display_name='Credits test genuine donor' and favorite_civ='Luba') then raise exception 'Editable profile email hijacked another donor'; end if;
  if exists(select 1 from public.get_supporter_credits() where display_name in ('Credits test expired','Credits test revoked','Credits test private donor')) then raise exception 'Expired/revoked/private name was published'; end if;
  if (select kofi_name from public.supporter_credit_details where email='credits-private@cbr.test') is not null then raise exception 'Private donor name was retained'; end if;
  if (select count(*) from public.get_supporter_credits() where display_name='Credits test new donor') <> 1 then raise exception 'Payment duplicates duplicated credits'; end if;
  if has_function_privilege('authenticated','public.get_supporter_credits()','EXECUTE') or has_function_privilege('anon','public.get_supporter_credits()','EXECUTE') then raise exception 'Credit RPC is publicly callable'; end if;
  if has_table_privilege('authenticated','public.supporter_credit_details','SELECT') or has_table_privilege('anon','public.supporter_credit_details','SELECT') then raise exception 'Private credit identities were exposed'; end if;
end $$;
-- An intentionally cleared preference must not restore the old spreadsheet civ.
update public.user_settings set settings='{"favoriteCiv":""}' where user_id='00000000-0000-4000-8000-000000000081';
do $$ begin
  if not exists(select 1 from public.get_supporter_credits() where display_name='Credits test account' and favorite_civ='') then raise exception 'Cleared civ was overwritten by legacy fallback'; end if;
end $$;
-- Latest private payment also hides an existing legacy/public credit name.
select public.record_kofi_payment(jsonb_build_object('message_id','credits-test-hide','transaction_id','credits-test-hide','email','credits-profile@cbr.test','kind','one_time','paid_at',now()+interval '1 second','amount','1','currency','USD','credit_public',false));
do $$ begin
  if exists(select 1 from public.get_supporter_credits() where display_name='Credits test account') then raise exception 'Latest private choice did not hide account name'; end if;
end $$;
select 'Supporter credit database checks passed; test data will be rolled back' as result;
