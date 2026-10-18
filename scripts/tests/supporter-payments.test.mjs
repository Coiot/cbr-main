import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentHandler,normalizePayment } from '../../supabase/functions/kofi-payment/handler.mjs';
import { createSupporterHandler } from '../../supabase/functions/check-kofi-subscriber/handler.mjs';
import { parseAccessImport, parseKofiMembers } from '../supporters/import.mjs';
import { supporterMessage } from '../../src/.vuepress/theme/account/supporterMessage.mjs';
const fixture={message_id:'message-1',kofi_transaction_id:'transaction-1',verification_token:'private-test-token',email:' READER@CBR.TEST ',type:'Donation',amount:'3.00',currency:'USD',timestamp:'2026-10-10T12:00:00',is_subscription_payment:false};
const now=()=>Date.parse('2026-10-18T00:00:00Z');
function harness({fail=false,configured=true}={}) {
  const writes=[],seen=new Set();
  const handler=createPaymentHandler({now,env:key=>({KOFI_VERIFICATION_TOKEN:configured?'private-test-token':null,SUPABASE_URL:'https://example.test',SUPABASE_SERVICE_ROLE_KEY:'service'})[key],createClient:()=>({rpc:async(name,{payment})=>{
    if(fail)return {error:new Error('database unavailable')};
    if(name==='record_kofi_test') return {data:null};
    assert.equal(name,'record_kofi_payment');
    const duplicate=seen.has(payment.transaction_id);seen.add(payment.transaction_id);writes.push(payment);return {data:{duplicate}};
  }})});
  const call=(data=fixture)=>handler(new Request('https://example.test/payment',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:JSON.stringify(data)})}));
  return {call,writes,handler};
}
test('verified Ko-fi form records only necessary fields with normalized email and UTC timestamp',async()=>{
  const h=harness(),r=await h.call();assert.equal(r.status,200);assert.equal(h.writes[0].email,'reader@cbr.test');assert.equal(h.writes[0].paid_at,'2026-10-10T12:00:00.000Z');
  assert.equal(h.writes[0].kind,'one_time');assert.ok(!('verification_token' in h.writes[0]));assert.ok(!('message' in h.writes[0]));
});
test('Ko-fi authentication fails closed, including when the receiver has no secret',async()=>{
  const h=harness();assert.equal((await h.call({...fixture,verification_token:'wrong'})).status,401);assert.equal(h.writes.length,0);
  assert.equal((await harness({configured:false}).call()).status,503);
});
test('recurring tips and membership payments both renew recurring access',()=>{
  assert.equal(normalizePayment({...fixture,type:'Tip'},now()).kind,'one_time');
  assert.equal(normalizePayment({...fixture,is_subscription_payment:true},now()).kind,'recurring');
  assert.equal(normalizePayment({...fixture,type:'Subscription',is_subscription_payment:true},now()).kind,'recurring');
  assert.throws(()=>normalizePayment({...fixture,type:'Subscription'},now()));
});
test('dashboard samples and non-donation shop/commission events cannot grant access',async()=>{
  const h=harness();for(const data of [{...fixture,email:'someone@example.com'},{...fixture,is_test:true},{...fixture,type:'Shop Order'},{...fixture,type:'Commission'}])assert.equal((await h.call(data)).status,200);
  assert.equal(h.writes.length,0);
});
test('invalid payment amounts, timestamps and identifiers cannot become access grants',async()=>{
  const h=harness();for(const patch of [{amount:'0'},{amount:'-1'},{amount:'NaN'},{timestamp:'tomorrow'},{timestamp:'2030-01-01T00:00:00Z'},{message_id:''},{email:'bad'},{is_subscription_payment:'true'}])assert.equal((await h.call({...fixture,...patch})).status,400);
  assert.equal(h.writes.length,0);
});
test('payment retries return success while persistence failures ask Ko-fi to retry',async()=>{
  const h=harness();await h.call();assert.equal((await(await h.call()).json()).duplicate,true);
  assert.equal((await harness({fail:true}).call()).status,503);
});
test('receiver rejects oversized and malformed form payloads',async()=>{
  const h=harness(); const req=body=>new Request('https://example.test/payment',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  assert.equal((await h.handler(req('data={broken'))).status,400);
  assert.equal((await h.handler(req('x'.repeat(65537)))).status,413);
});
test('active payment mode checks dated access and never fetches the old spreadsheet',async()=>{
  let saved;
  const handler=createSupporterHandler({env:key=>({SUPABASE_URL:'url',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service'})[key],fetcher:()=>{throw new Error('Sheet must not be read');},createClient:(_,key)=>key==='anon'?{auth:{getUser:async()=>({data:{user:{id:'reader',email:'reader@cbr.test'}}})}}:{rpc:async()=>({data:{enabled:true,allowed:false,status:'expired'}}),from:()=>({upsert:async row=>{saved=row;return {};}})}});
  const response=await handler(new Request('https://example.test/check',{method:'POST',headers:{Authorization:'Bearer valid'}}));
  assert.equal(response.status,200);assert.equal((await response.json()).status,'expired');assert.equal(saved.can_edit,false);
});
test('reconciliation accepts quoted CSV headers and keeps latest expiry for duplicate emails',()=>{
  const members=parseAccessImport('Email,Expiry\n"A@cbr.test",2026-11-01\na@cbr.test,2026-12-01',{emailColumn:'Email',expiresColumn:'Expiry'});
  assert.deepEqual(members,[{email:'a@cbr.test',expires_at:'2026-12-01T00:00:00.000Z'}]);
  assert.throws(()=>parseAccessImport('Email,Status\na@cbr.test,Active'));
  assert.throws(()=>parseAccessImport('email,access_expires_at\na@cbr.test,10/11/2026'));
  assert.throws(()=>parseAccessImport('email,access_expires_at\na@cbr.test,2026-02-30'));
});
test('expired supporters get a thank-you and renewal invitation instead of a missing-email warning',()=>{
  const message=supporterMessage({allowed:false,status:'expired'});
  assert.match(message,/Thank you/);assert.match(message,/donate again anytime/);assert.match(message,/saved preferences/);
  assert.doesNotMatch(message,/not found/);
});

test('dashboard tests verify database connectivity without recording a payment',async()=>{
  const h=harness({fail:true});
  assert.equal((await h.call({...fixture,email:'jo.example@example.com'})).status,503);
  assert.equal(h.writes.length,0);
});

test('native Ko-fi CSV stages only active members without treating signup dates as payments',()=>{
  const csv='"Name","Email","IsActive","SinceDateUTC"\n"Reader, One","FIRST@cbr.test","True","2021-01-01 12:00"\nOld,old@cbr.test,False,2026-10-18\nAgain,first@cbr.test,false,2026-10-18';
  assert.deepEqual(parseKofiMembers(csv),{emails:['first@cbr.test'],active:1,inactive:1});
  assert.throws(()=>parseAccessImport(csv),/expiry/);
  assert.throws(()=>parseKofiMembers('Email,IsActive\na@cbr.test,Active'),/IsActive/);
  assert.throws(()=>parseKofiMembers('Email,IsActive\na@cbr.test,False'),/No active/);
});
