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
