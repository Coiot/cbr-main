import { parseCsv, normalizeEmail } from '../../supabase/functions/check-kofi-subscriber/supporterList.mjs';

// Native Ko-fi exports contain a signup date, not a paid-through date. They may
// seed the one-time migration window, but cannot establish payment renewals.
export function parseKofiMembers(csv) {
  const [header, ...rows] = parseCsv(csv);
  if (!header || !rows.length) throw new Error('The CSV needs a header and at least one member.');
  const columns = header.map(value => value.replace(/^\uFEFF/,'').trim().toLowerCase());
  const emailIndex = columns.indexOf('email'), activeIndex = columns.indexOf('isactive');
  if (emailIndex < 0 || activeIndex < 0) throw new Error('Expected Ko-fi Email and IsActive columns.');
  const members = new Map();
  for (const [i,row] of rows.entries()) {
    const email = normalizeEmail(row[emailIndex]);
    const active = String(row[activeIndex] || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error(`Invalid email on CSV row ${i+2}.`);
    if (!['true','false'].includes(active)) throw new Error(`Invalid IsActive value on CSV row ${i+2}.`);
    members.set(email, members.get(email) === true || active === 'true');
  }
  const emails = [...members].filter(([,active]) => active).map(([email]) => email).sort();
  if (!emails.length) throw new Error('No active members found. Nothing was staged.');
  return { emails, active: emails.length, inactive: members.size - emails.length };
}

export function parseAccessImport(csv, { emailColumn = 'email', expiresColumn = 'access_expires_at' } = {}) {
  const [header, ...rows] = parseCsv(csv);
  if (!header || !rows.length) throw new Error('The CSV needs a header and at least one member.');
  const columns = header.map(value => value.replace(/^\uFEFF/,'').trim().toLowerCase());
  const emailIndex = columns.indexOf(emailColumn.trim().toLowerCase());
  const expiresIndex = columns.indexOf(expiresColumn.trim().toLowerCase());
  if (emailIndex < 0 || expiresIndex < 0) throw new Error('Missing email or access-expiry column. Specify --email-column and --expires-column. A membership status alone is not an expiry date.');
  const members = new Map();
  for (const [i,row] of rows.entries()) {
    const email = normalizeEmail(row[emailIndex]), raw = row[expiresIndex]?.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`Invalid email on CSV row ${i+2}.`);
    // Ambiguous local dates must be resolved before import, never guessed.
    if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(raw || '')) throw new Error(`Row ${i+2} needs an ISO expiry date (YYYY-MM-DD or timestamp with timezone).`);
    const date = new Date(raw);
    if (!Number.isFinite(date.getTime()) || (raw.length===10 && date.toISOString().slice(0,10)!==raw)) throw new Error(`Invalid expiry on CSV row ${i+2}.`);
    const previous = members.get(email), expires = date.toISOString();
    // Multiple memberships for one email: keep the latest paid-through date.
    if (!previous || previous.expires_at < expires) members.set(email, { email, expires_at: expires });
  }
  return [...members.values()];
}
