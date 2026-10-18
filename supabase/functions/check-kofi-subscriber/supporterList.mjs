export function parseCsv(csv) {
  const rows = []; let row = [], value = '', quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"') {
      if (quoted && csv[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && csv[i + 1] === '\n') i++;
      row.push(value); if (row.some(cell => cell.trim())) rows.push(row);
      row = []; value = '';
    } else value += char;
  }
  if (quoted) throw new Error('Invalid CSV quoting');
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

export const normalizeEmail = value => String(value || '').replace(/^\uFEFF/, '').trim().toLowerCase();
export function supporterEmails(csv, column = 1) {
  if (!Number.isInteger(column) || column < 0 || /<(?:html|!doctype)/i.test(csv)) throw new Error('Invalid supporter list');
  // Sheets can have a header row or start immediately with a donor. Inspect all
  // rows and accept email cells, rather than unconditionally skipping row one.
  const emails = new Set(parseCsv(csv).map(row => normalizeEmail(row[column]))
    .filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)));
  if (!emails.size) throw new Error('No valid supporter emails');
  return emails;
}

export async function fetchSupporterEmails(env, fetcher = fetch) {
  const sheetId = env('GOOGLE_SHEET_ID');
  const gid = env('GOOGLE_SHEET_GID') || '0';
  const column = Number(env('SUPPORTERS_EMAIL_COLUMN') || '1');
  const urls = [];
  if (sheetId) urls.push(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}`);
  const publishedId = env('GOOGLE_SHEET_PUB_ID');
  const published = env('GOOGLE_SHEET_PUB_URL') || (publishedId ? `https://docs.google.com/spreadsheets/d/e/${encodeURIComponent(publishedId)}/pub` : '');
  if (published) {
    const url = new URL(published);
    if (url.origin !== 'https://docs.google.com') throw new Error('Invalid supporter sheet host');
    url.pathname = url.pathname.replace(/\/pubhtml$/, '/pub');
    url.searchParams.set('output', 'csv'); url.searchParams.set('gid', gid); url.searchParams.set('single', 'true');
    urls.push(url.toString());
  }
  for (const url of urls) {
    try {
      const response = await fetcher(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) continue;
      return supporterEmails(await response.text(), column);
    } catch { /* Try the published backup on network, timeout, or malformed data. */ }
  }
  throw new Error('Supporter list is temporarily unavailable');
}
