#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import publicConfig from '../../src/shared/publicConfig.json' with { type:'json' };
import { parseAccessImport, parseKofiMembers } from './import.mjs';

const { values,positionals } = parseArgs({ allowPositionals:true, options:{
  apply:{type:'boolean'}, file:{type:'string'}, 'email-column':{type:'string'}, 'expires-column':{type:'string'},
  'user-id':{type:'string'}, until:{type:'string'}, permanent:{type:'boolean'}, note:{type:'string'},
  'grant-key':{type:'string'}, 'transaction-id':{type:'string'}, 'webhook-tested':{type:'boolean'},
} });
const command = positionals[0];
const supported = ['status','bootstrap','import','grant','revoke','activate'];
if (!supported.includes(command)) {
  console.log('Commands: status | bootstrap --file KoFiMembers.csv [--apply] | import --file members.csv [--email-column Email --expires-column Expiry] [--apply] | grant --user-id UUID (--until ISO_DATE | --permanent) --note REASON [--apply] | revoke (--grant-key KEY | --transaction-id ID) [--apply] | activate --webhook-tested --apply');
  process.exit(command ? 1 : 0);
}
async function main() {
  const fileEnv = dotenv.parse(readFileSync(new URL('../../.env.supporters',import.meta.url)));
  const env = {...fileEnv,...process.env};
  const url = env.SUPABASE_URL || publicConfig.SUPABASE_URL;
  if (url !== publicConfig.SUPABASE_URL) throw new Error('Supabase URL does not match this website.');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('Set the service role key in .env.supporters. Never use a browser key.');
  const client = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const check = result => { if (result.error) throw new Error(`Supabase operation failed (${result.error.code || 'unknown'}); inspect the dashboard for details.`); return result.data; };
  if (command === 'status') {
    const config = check(await client.from('supporter_access_config').select('enabled,activated_at').single());
    const health = check(await client.from('supporter_webhook_health').select('last_test_at,last_test_type,test_count').single());
    const last = check(await client.from('supporter_payments').select('received_at').order('received_at',{ascending:false}).limit(1));
    const payments = await client.from('supporter_payments').select('*',{head:true,count:'exact'}); check(payments);
    const staged = await client.from('supporter_migration_members').select('*',{head:true,count:'exact'}); check(staged);
    console.log(JSON.stringify({...config,...health,stagedMembers:staged.count,recordedPayments:payments.count,lastPaymentReceived:last[0]?.received_at || null},null,2));
    return;
  }
  if (command === 'bootstrap') {
    if (!values.file) throw new Error('Supply --file. Native Ko-fi CSV staging previews by default.');
    const parsed = parseKofiMembers(readFileSync(values.file,'utf8'));
    const users = []; let page=1;
    while (true) {
      const data = check(await client.auth.admin.listUsers({page,perPage:1000}));
      users.push(...data.users.filter(user => user.email_confirmed_at));
      if (data.users.length < 1000) break;
      page++;
    }
    const active = new Set(parsed.emails);
    const matches = users.filter(user => active.has(user.email?.trim().toLowerCase()));
    const matchedEmails = new Set(matches.map(user => user.email.trim().toLowerCase()));
    const profiles = check(await client.from('profiles').select('id,can_edit'));
    const grants = new Set(profiles.filter(profile => profile.can_edit).map(profile => profile.id));
    console.log(JSON.stringify({activeMembers:parsed.active,inactiveMembers:parsed.inactive,
      matchingAccounts:matches.length,membersWithoutAccount:parsed.active-matchedEmails.size,
      matchedWithoutLegacyAccess:matches.filter(user=>!grants.has(user.id)).length,
      legacyAccountsOutsideCurrentMembers:profiles.filter(profile=>profile.can_edit&&!matches.some(user=>user.id===profile.id)).length,
      migrationDays:32,apply:!!values.apply},null,2));
    if (values.apply) {
      const count = check(await client.rpc('stage_kofi_members',{member_emails:parsed.emails}));
      console.log(JSON.stringify({stagedMembers:count,windowStarts:'on activation'}));
    }
    return;
  }
  if (command === 'import') {
    if (!values.file) throw new Error('Supply --file. Imports preview by default.');
    const members = parseAccessImport(readFileSync(values.file,'utf8'),{emailColumn:values['email-column'],expiresColumn:values['expires-column']});
    const emails = new Set(); let page=1;
    while (true) { const data=check(await client.auth.admin.listUsers({page,perPage:1000}));
      for (const u of data.users) if (u.email_confirmed_at) emails.add(u.email?.trim().toLowerCase());
      if (data.users.length<1000) break; page++; }
    const rows = members.map(member=>({...member,grant_key:'import:'+createHash('sha256').update(member.email).digest('hex'),source:'import',note:'Ko-fi CSV reconciliation',revoked_at:null}));
    const now=Date.now();
    console.log(JSON.stringify({members:rows.length,matchingAccounts:members.filter(m=>emails.has(m.email)).length,active:members.filter(m=>Date.parse(m.expires_at)>now).length,expired:members.filter(m=>Date.parse(m.expires_at)<=now).length,apply:!!values.apply}));
    if (values.apply) for(let i=0;i<rows.length;i+=200) check(await client.from('supporter_grants').upsert(rows.slice(i,i+200),{onConflict:'grant_key'}));
    return;
  }
  if (command === 'grant') {
    if (!values['user-id'] || !values.note || Boolean(values.until)===Boolean(values.permanent)) throw new Error('Supply --user-id, --note, and either --until or --permanent.');
    const expires = values.permanent ? null : new Date(values.until).toISOString();
    if (expires && Date.parse(expires)<=Date.now()) throw new Error('Grant expiry must be in the future.');
    const row={grant_key:'manual:'+values['user-id'],user_id:values['user-id'],source:'manual',expires_at:expires,note:values.note,revoked_at:null};
    console.log(JSON.stringify({action:'manual grant',expiresAt:expires,apply:!!values.apply}));
    if(values.apply) check(await client.from('supporter_grants').upsert(row,{onConflict:'grant_key'}));
    return;
  }
  if (command === 'revoke') {
    if(Boolean(values['grant-key'])===Boolean(values['transaction-id'])) throw new Error('Specify one grant key or transaction ID.');
    const table=values['grant-key']?'supporter_grants':'supporter_payments', column=values['grant-key']?'grant_key':'transaction_id';
    console.log(JSON.stringify({action:'revoke',table,apply:!!values.apply}));
    if(values.apply) check(await client.from(table).update({revoked_at:new Date().toISOString()}).eq(column,values['grant-key']||values['transaction-id']));
    return;
  }
  if(command==='activate') {
    if (!values.apply || !values['webhook-tested']) throw new Error('Configure and test Ko-fi first, then use activate --webhook-tested --apply.');
    check(await client.rpc('activate_supporter_payments'));
    console.log('Payment-based access enabled. Existing grants have a one-time 32-day transition; repeat activation does not extend it.');
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
