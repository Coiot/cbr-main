import { createClient } from '@supabase/supabase-js';

export function formatCreditEntries(rows, uppercase = true) {
  const entries = []; let anonymous = 0;
  const format = text => uppercase ? text.toUpperCase() : text;
  for (const row of rows) {
    const name = String(row.display_name || '').trim();
    if (name.toLowerCase() === 'coiot') continue;
    // Payment emails and email-like profile names never become public credits.
    if (!name || name.includes('@')) { anonymous++; continue; }
    const civ = String(row.favorite_civ || '').trim();
    entries.push({ name: format(name), civ, civLabel: format(civ) });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  if (anonymous) entries.push({ name: format(anonymous === 1 ? 'Anonymous supporter' : `${anonymous} anonymous supporters`), civ: '', civLabel: '' });
  return entries;
}
export async function fetchDatabaseCredits(url, key, clientFactory = createClient) {
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.supporters.');
  const client = clientFactory(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const rows = [];
  for (let page = 0; page < 500; page++) {
    const { data, error } = await client.rpc('get_supporter_credits').range(page * 1000, (page + 1) * 1000 - 1);
    if (error || !Array.isArray(data)) throw new Error(`Unable to load database supporter credits (${error?.code || 'invalid response'}). Apply supabase/sql/supporter-credits.sql and retry.`);
    rows.push(...data);
    if (data.length < 1000) {
      if (!rows.length) throw new Error('The database returned no active supporters. Existing artwork was not replaced.');
      return rows;
    }
  }
  throw new Error('Supporter credit pagination exceeded the safety limit. Existing artwork was not replaced.');
}
