-- Run after supporter-access.sql. Every assertion and test row is rolled back.
begin;
-- All test users, writes and schema changes are rolled back by the caller.
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000091','kofi-a@cbr.test',now()),
 ('00000000-0000-4000-8000-000000000092','kofi-b@cbr.test',now());
insert into public.profiles(id,email,can_edit) values
 ('00000000-0000-4000-8000-000000000091','kofi-a@cbr.test',true),
 ('00000000-0000-4000-8000-000000000092','kofi-b@cbr.test',false)
 on conflict(id) do update set can_edit=excluded.can_edit;
select public.stage_kofi_members(array['KOFI-NEW@cbr.test','kofi-new@cbr.test']);
select public.activate_supporter_payments();
create temp table before_activation as select * from public.supporter_grants where user_id='00000000-0000-4000-8000-000000000091';
select public.activate_supporter_payments();
do $$ begin
  if (select count(*) from public.supporter_grants where email='kofi-new@cbr.test' and source='transition') <> 1 then raise exception 'Native member transition missing or duplicated'; end if;
  begin perform public.stage_kofi_members(array['kofi-new@cbr.test']); raise exception 'Active migration could be restaged'; exception when raise_exception then if sqlerrm = 'Active migration could be restaged' then raise; end if; end;
  if (select expires_at from before_activation) is distinct from (select expires_at from public.supporter_grants where grant_key='transition:00000000-0000-4000-8000-000000000091') then raise exception 'Activation extended legacy access'; end if;
end $$;
update public.supporter_grants set expires_at=now()-interval '1 second' where user_id='00000000-0000-4000-8000-000000000091';
do $$ begin
  if public.supporter_status_for('00000000-0000-4000-8000-000000000091')->>'status' <> 'expired' then raise exception 'Legacy flag bypassed expiry'; end if;
end $$;
select public.record_kofi_payment(jsonb_build_object('message_id','test-one','transaction_id','test-txn-one','email','kofi-a@cbr.test','kind','one_time','paid_at',now(),'amount','3','currency','USD'));
do $$ declare result jsonb; begin
  if (select expires_at-paid_at from public.supporter_payments where message_id='test-one')<>interval '768 hours' then raise exception 'One-time duration is not 32 days'; end if;
  result:=public.record_kofi_payment(jsonb_build_object('message_id','test-one-repeat','transaction_id','test-txn-one','email','kofi-a@cbr.test','kind','one_time','paid_at',now(),'amount','3','currency','USD'));
  if not (result->>'duplicate')::boolean then raise exception 'Duplicate transaction accepted'; end if;
  if not (public.supporter_status_for('00000000-0000-4000-8000-000000000091')->>'allowed')::boolean then raise exception 'Payment not matched'; end if;
end $$;
select public.record_kofi_payment('{"message_id":"test-month","transaction_id":"test-txn-month","email":"kofi-a@cbr.test","kind":"recurring","paid_at":"2024-01-31T12:00:00Z","amount":"3","currency":"USD"}');
do $$ begin
  if (select expires_at from public.supporter_payments where message_id='test-month') <> '2024-03-03T12:00:00Z'::timestamptz then raise exception 'Month end calculation incorrect'; end if;
  if not (public.supporter_status_for('00000000-0000-4000-8000-000000000091')->>'allowed')::boolean then raise exception 'Late event shortened access'; end if;
end $$;
-- Profile email is owner-editable and must never establish donation ownership.
update public.profiles set email='kofi-a@cbr.test',can_edit=true where id='00000000-0000-4000-8000-000000000092';
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000092","role":"authenticated","email":"kofi-b@cbr.test"}',true);
set local role authenticated;
do $$ begin
  if public.has_supporter_access() then raise exception 'Spoofed profile email or cached flag granted access'; end if;
  if (public.get_supporter_status()->>'allowed')::boolean then raise exception 'Owner status is wrong'; end if;
  begin perform public.supporter_status_for('00000000-0000-4000-8000-000000000091'); raise exception 'Private status RPC was accessible'; exception when insufficient_privilege then null; end;
  begin perform public.record_kofi_payment('{}'); raise exception 'Owner could forge payments'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.supporter_payments; raise exception 'Payment ledger was readable'; exception when insufficient_privilege then null; end;
  begin
    insert into public.tile_overrides(map_id,tile_key,payload,updated_by) values('s5','kofi-test','{}',auth.uid());
    raise exception 'Permissive legacy map policy bypassed expiry';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.album_comments(user_id,page_path,message) values(auth.uid(),'/kofi-test/','test');
    raise exception 'Expired user could comment';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000091","role":"authenticated","email":"kofi-a@cbr.test"}',true);
set local role authenticated;
insert into public.tile_overrides(map_id,tile_key,payload,updated_by) values('s5','kofi-test','{}',auth.uid());
insert into public.album_comments(user_id,page_path,message) values(auth.uid(),'/kofi-test/','test');
reset role;
update public.supporter_payments set revoked_at=now() where message_id='test-one';
set local role authenticated;
do $$ begin
  if public.has_supporter_access() then raise exception 'Refunded payment retained access'; end if;
end $$;
reset role;
update public.supporter_grants set expires_at=now()-interval '1 second' where email='kofi-new@cbr.test';
-- Payments received before an account exists are matched after verified signup.
select public.record_kofi_payment(jsonb_build_object('message_id','test-pending','transaction_id','test-txn-pending','email','kofi-new@cbr.test','kind','one_time','paid_at',now(),'amount','3','currency','USD'));
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000093','kofi-new@cbr.test');
do $$ begin
  if (public.supporter_status_for('00000000-0000-4000-8000-000000000093')->>'allowed')::boolean then raise exception 'Unverified email matched payment'; end if;
end $$;
update auth.users set email_confirmed_at=now() where id='00000000-0000-4000-8000-000000000093';
do $$ begin
  if not (public.supporter_status_for('00000000-0000-4000-8000-000000000093')->>'allowed')::boolean then raise exception 'Pending payment not claimed'; end if;
end $$;
insert into public.supporter_grants(grant_key,user_id,source,note) values('test-manual','00000000-0000-4000-8000-000000000092','manual','Test grant');
do $$ begin
  if not (public.supporter_status_for('00000000-0000-4000-8000-000000000092')->>'allowed')::boolean then raise exception 'Explicit manual grant not honored'; end if;
end $$;
select 'All supporter access database assertions passed; rolling back.' as result;

rollback;
