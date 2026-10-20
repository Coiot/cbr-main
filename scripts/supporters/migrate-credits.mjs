#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { parseCreditImport } from './import.mjs';
import config from '../../src/shared/publicConfig.json' with { type: 'json' };

async function readLegacySheet(env) {
  if (!env.GOOGLE_SHEET_ID) throw new Error('No legacy sheet configured. Supply --file with a saved CSV instead.');
  const urls = [`https://docs.google.com/spreadsheets/d/${env.GOOGLE_SHEET_ID}/export?format=csv&gid=${env.GOOGLE_SHEET_GID || '0'}`];
  if (env.GOOGLE_SHEET_PUB_URL) urls.push(env.GOOGLE_SHEET_PUB_URL.replace(/\/pubhtml(?:\?.*)?$/i, '/pub?output=csv'));
  else if (env.GOOGLE_SHEET_PUB_ID) urls.push(`https://docs.google.com/spreadsheets/d/e/${env.GOOGLE_SHEET_PUB_ID}/pub?output=csv`);
  for (const url of urls) {
    try { const response = await fetch(url, { signal: AbortSignal.timeout(25000) }); if (response.ok) return await response.text(); } catch { /* Try the configured backup. */ }
  }
  throw new Error('Legacy credit sheet could not be downloaded. No credit data was written.');
}
export async function main() {
  const { values } = parseArgs({ options: { file: { type: 'string' }, 'legacy-sheet': { type: 'boolean' }, apply: { type: 'boolean' } } });
  if (Boolean(values.file) === Boolean(values['legacy-sheet'])) throw new Error('Choose --legacy-sheet or --file CSV. Preview is the default; --apply imports names only.');
  const env = { ...dotenv.parse(readFileSync(new URL('../../.env.supporters', import.meta.url))), ...process.env };
  const url = env.SUPABASE_URL || config.SUPABASE_URL;
  if (url !== config.SUPABASE_URL) throw new Error('Supabase URL does not match this website.');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('Set SUPABASE_SERVICE_ROLE_KEY in .env.supporters.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const csv = values.file ? readFileSync(values.file, 'utf8') : await readLegacySheet(env);
  const parsed = parseCreditImport(csv, env);
  const { data: existing, error } = await client.from('supporter_credit_details').select('email,legacy_name,legacy_civ');
  if (error) throw new Error(`Credit metadata is unavailable (${error.code || 'unknown'}). Apply supporter-credits.sql first.`);
  const byEmail = new Map(existing.map(row => [row.email, row]));
  const rows = parsed.rows.map(row => ({ ...row, legacy_name: byEmail.get(row.email)?.legacy_name || row.legacy_name,
    legacy_civ: byEmail.get(row.email)?.legacy_civ || row.legacy_civ }));
  console.log(JSON.stringify({ source: values.file ? 'CSV' : 'one-time legacy sheet migration', names: rows.length, skippedIncompleteRows: parsed.skipped, apply: !!values.apply }));
  if (values.apply) {
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await client.from('supporter_credit_details').upsert(rows.slice(i, i + 200), { onConflict: 'email' });
      if (error) throw new Error(`Credit import failed (${error.code || 'unknown'}). Retry safely; existing names and access are preserved.`);
    }
    console.log('Credit names and civ fallbacks imported. Payment records and access expiry were unchanged.');
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
