import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatCreditEntries, fetchDatabaseCredits } from '../../scripts/supporters/credits.mjs';
import { parseCreditImport } from '../../scripts/supporters/import.mjs';
import { normalizePayment } from '../../supabase/functions/kofi-payment/handler.mjs';

const fixture = { email: 'reader@cbr.test', message_id: 'credit-unit', kofi_transaction_id: 'credit-unit', type: 'Donation', amount: '1', currency: 'USD', timestamp: '2026-01-01T00:00:00Z', is_subscription_payment: false };
test('webhook retains public display names only, without messages or private names', () => {
  const publicPayment = normalizePayment({ ...fixture, from_name: '  Reader\n One  ', is_public: true, message: 'Never stored' });
  assert.equal(publicPayment.credit_name, 'Reader One'); assert.equal(publicPayment.credit_public, true);
  assert.equal(publicPayment.message, undefined);
  for (const is_public of [false, undefined, 'true']) {
    const payment = normalizePayment({ ...fixture, from_name: 'Private Name', is_public });
    assert.equal(payment.credit_public, false); assert.equal(payment.credit_name, null);
    assert.ok(!JSON.stringify(payment).includes('Private Name'));
  }
  assert.equal(normalizePayment({ ...fixture, from_name: 'x'.repeat(200), is_public: true }).credit_name.length, 128);
});
test('credit formatting never exposes emails and combines anonymous acknowledgements', () => {
  const rows = [{ display_name: 'Beta', favorite_civ: 'Japan' }, { display_name: 'alpha' }, { display_name: null }, { display_name: 'private@cbr.test' }, { display_name: 'coiot' }];
  assert.deepEqual(formatCreditEntries(rows), [
    { name: 'ALPHA', civ: '', civLabel: '' }, { name: 'BETA', civ: 'Japan', civLabel: 'JAPAN' },
    { name: '2 ANONYMOUS SUPPORTERS', civ: '', civLabel: '' },
  ]);
  assert.equal(formatCreditEntries([{ display_name: null }], false)[0].name, 'Anonymous supporter');
});
test('credit name imports preserve civ fallbacks without granting membership or importing pledge data', () => {
  const legacy = parseCreditImport('timestamp,email,name,civ\nnow,TEST@cbr.test,"Reader, One",Japan\nnow,,,\n');
  assert.deepEqual(legacy, { rows: [{ email: 'test@cbr.test', legacy_name: 'Reader, One', legacy_civ: 'Japan' }], skipped: 1 });
  const native = parseCreditImport('Name,Email,IsActive,SinceDateUTC,CurrentPledge\nPublic Name,test@cbr.test,True,2020-01-01,5');
  assert.equal(native.rows[0].legacy_civ, ''); assert.equal(native.rows[0].expires_at, undefined);
  assert.equal(native.rows[0].legacy_name, 'Public Name');
  assert.throws(() => parseCreditImport('timestamp,email,name,civ\nnow,invalid,Reader,Japan'), /Invalid email/);
  assert.throws(() => parseCreditImport('timestamp,email,name,civ\nnow,,,\n'), /No credit names/);
});
test('credit builder uses only the private RPC and paginates without truncating larger lists', async () => {
  const calls = [];
  const clientFactory = () => ({ rpc(name) { assert.equal(name, 'get_supporter_credits'); return { async range(from, to) { calls.push([from, to]); return { data: Array(from === 0 ? 1000 : 2).fill({ display_name: 'Supporter' }) }; } }; } });
  const result = await fetchDatabaseCredits('https://cbr.test', 'service', clientFactory);
  assert.equal(result.length, 1002); assert.deepEqual(calls, [[0, 999], [1000, 1999]]);
});
test('credit builder stops on missing configuration, RPC failure, and an unexpectedly empty roster', async () => {
  await assert.rejects(fetchDatabaseCredits('', ''), /Set SUPABASE_URL/);
  const fail = () => ({ rpc: () => ({ range: async () => ({ error: { code: 'PGRST202' } }) }) });
  await assert.rejects(fetchDatabaseCredits('url', 'key', fail), /Apply supabase\/sql\/supporter-credits.sql/);
  const empty = () => ({ rpc: () => ({ range: async () => ({ data: [] }) }) });
  await assert.rejects(fetchDatabaseCredits('url', 'key', empty), /no active supporters/);
});
