#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import config from '../../src/shared/publicConfig.json' with { type: 'json' };
import { hyksosCollection } from './hyksos.mjs';
import { validPublicId } from '../../src/.vuepress/theme/components/supporters/showcaseModel.mjs';

const { values } = parseArgs({ options: { 'owner-id': { type: 'string' }, apply: { type: 'boolean' } } });
async function main() {
  const draft = hyksosCollection(fileURLToPath(new URL('../../src/albums/pr', import.meta.url)));
  if (!values['owner-id']) {
    if (values.apply) throw new Error('Supply --owner-id for the verified website account.');
    console.log(JSON.stringify({ ...draft, apply: false }, null, 2)); return;
  }
  const owner = values['owner-id'];
  if (!validPublicId(owner)) throw new Error('Invalid owner ID.');
  const env = { ...dotenv.parse(readFileSync(new URL('../../.env.supporters', import.meta.url))), ...process.env };
  if (env.SUPABASE_URL && env.SUPABASE_URL !== config.SUPABASE_URL) throw new Error('Unexpected Supabase project.');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('Set the service role key in .env.supporters.');
  const client = createClient(config.SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const check = result => { if (result.error) throw new Error(`Supabase operation failed (${result.error.code || 'unknown'}).`); return result.data; };
  const user = check(await client.auth.admin.getUserById(owner)).user;
  if (!user?.email_confirmed_at) throw new Error('Owner must be a confirmed website account.');
  const profile = check(await client.from('profiles').select('username').eq('id', owner).single());
  const existing = check(await client.from('scene_collections').select('id,title,description,scenes,published,is_hidden').eq('user_id', owner));
  const copies = existing.filter(row => row.title === draft.title);
  if (copies.length) {
    const same = copies.length === 1 && !copies[0].is_hidden && copies[0].published && copies[0].description === draft.description
      && copies[0].scenes.length === draft.scenes.length && copies[0].scenes.every((s, i) => s.path === draft.scenes[i].path && s.number === draft.scenes[i].number && (s.note || '') === '');
    if (!same) throw new Error('An existing collection has this title. Leave it unchanged and review it before proceeding.');
    console.log(JSON.stringify({ existing: true, id: copies[0].id, scenes: draft.scenes.length, url: `/collections/?id=${copies[0].id}` })); return;
  }
  if (existing.length >= 20) throw new Error('Owner has reached the collection limit.');
  const status = check(await client.rpc('supporter_status_for', { target_user: owner }));
  if (!status.allowed) throw new Error('Owner needs current supporter access to create a collection.');
  if (check(await client.rpc('valid_collection_scenes', { scenes: draft.scenes })) !== true) throw new Error('Apply scene-collections-power-rankings.sql first.');
  console.log(JSON.stringify({ title: draft.title, owner: profile.username || 'CBR reader', scenes: draft.scenes.length, apply: !!values.apply }));
  if (!values.apply) return;
  const row = check(await client.from('scene_collections').insert({ user_id: owner, ...draft }).select('id').single());
  const publicRow = check(await client.rpc('get_scene_collection', { p_id: row.id }));
  if (!publicRow || publicRow.scenes.length !== draft.scenes.length) throw new Error('Collection inserted; public verification failed. Do not reinsert.');
  console.log(JSON.stringify({ created: true, id: row.id, scenes: publicRow.scenes.length, url: `/collections/?id=${row.id}` }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
