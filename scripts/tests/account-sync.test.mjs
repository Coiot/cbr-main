import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAccountSync, subscribeAccountAuth } from '../../src/.vuepress/theme/account/accountSync.js';
import { albumAccountMethods } from '../../src/.vuepress/theme/components/albums/behavior/albumAccount.js';
import { mapAccessMethods } from '../../src/.vuepress/theme/components/community/map/mapAccess.js';
import { createSupporterHandler } from '../../supabase/functions/check-kofi-subscriber/handler.mjs';

const user = { id: 'reader-a', email: 'reader@example.com' };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
function accountHarness() {
  const events = [], calls = [];
  let profile = { username: 'Before', can_edit: false }, settings = { themeMode: 'dark', contrastLargeCityBanners: true };
  const client = {
    from(table) {
      assert.equal(table, 'profiles'); let write;
      const chain = {
        select() { return chain; }, eq() { return chain; },
        upsert(row) { write = row; return chain; },
        async maybeSingle() { return client.readProfile ? client.readProfile() : { data: { ...profile } }; },
        async single() {
          if (client.writeProfile) return client.writeProfile(write);
          profile = { ...profile, ...write }; return { data: { ...profile } };
        },
      }; return chain;
    },
    async rpc(name, args) {
      assert.equal(name, 'patch_user_settings'); calls.push(args);
      if (client.patch) return client.patch(args);
      settings = args.only_missing ? { ...args.patch, ...settings } : { ...settings, ...args.patch };
      return { data: { ...settings } };
    },
  };
  const sync = createAccountSync(client, { ensure: async () => ({ error: null }),
    verify: (...args) => client.verify ? client.verify(...args) : Promise.resolve({ allowed: true, error: null }),
    emit: (name, detail) => events.push({ name, detail }) });
  return { sync, client, events, calls };
}

test('supporter checks are shared across pages and recheck an existing grant for expiry', async () => {
  const h = accountHarness(); let verifies = 0;
  h.client.verify = async () => { verifies++; return { allowed: true, error: null }; };
  const results = await Promise.all([h.sync.refreshSupporter(user), h.sync.refreshSupporter(user), h.sync.refreshSupporter(user)]);
  assert.ok(results.every(result => result.allowed)); assert.equal(verifies, 1);
  assert.ok(h.events.some(event => event.name === 'account-profile-updated' && event.detail.profile.can_edit));
  h.client.readProfile = async () => ({ data: { username: 'Before', can_edit: true } });
  await h.sync.refreshSupporter(user, { force: true }); assert.equal(verifies, 2);
});

test('verification outages remain retryable and do not become cached non-donor results', async () => {
  const h = accountHarness(); let attempts = 0;
  h.client.verify = async () => ++attempts === 1 ? { allowed: false, error: new Error('Unavailable') } : { allowed: true, error: null };
  assert.ok((await h.sync.refreshSupporter(user)).error);
  assert.equal((await h.sync.refreshSupporter(user)).allowed, true);
  assert.equal(attempts, 2);
});

test('a slow profile read preserves a newly saved username while accepting fresh access flags', async () => {
  const h = accountHarness(); await h.sync.loadProfile(user);
  const read = deferred(); h.client.readProfile = () => read.promise;
  const loading = h.sync.loadProfile(user, { force: true }); await Promise.resolve();
  await h.sync.saveUsername(user, 'After');
  read.resolve({ data: { username: 'Before', can_edit: true } });
  assert.deepEqual((await loading).data, { username: 'After', can_edit: true });
});

test('rapid preference edits are saved in order and only send changed keys', async () => {
  const h = accountHarness(), first = deferred();
  h.client.patch = args => h.calls.length === 1 ? first.promise : Promise.resolve({ data: { themeMode: 'light', favoriteCiv: 'Japan', contrastLargeCityBanners: true } });
  const a = h.sync.saveSettings(user, { favoriteCiv: 'Pomo' });
  const b = h.sync.saveSettings(user, { favoriteCiv: 'Japan', themeMode: 'light' });
  await Promise.resolve(); assert.equal(h.calls.length, 1);
  first.resolve({ data: { themeMode: 'dark', favoriteCiv: 'Pomo', contrastLargeCityBanners: true } });
  await a; const result = await b;
  assert.equal(result.data.favoriteCiv, 'Japan'); assert.equal(result.data.contrastLargeCityBanners, true);
  assert.deepEqual(h.calls.map(call => call.patch), [{ favoriteCiv: 'Pomo' }, { favoriteCiv: 'Japan', themeMode: 'light' }]);
  assert.ok(h.calls.every(call => call.expected_user_id === user.id));
  const synced = h.events.filter(event => event.name === 'user-settings-synced');
  assert.ok(synced.slice(1).every(event => event.detail.favoriteCiv === 'Japan'), 'Earlier replies must not flash old selections');
});

test('initial cloud settings cannot undo an edit made before loading finishes', async () => {
  const h = accountHarness(), initial = deferred();
  h.client.patch = args => args.only_missing ? initial.promise : Promise.resolve({ data: { favoriteCiv: 'Japan', themeMode: 'dark' } });
  const loading = h.sync.loadSettings(user, { favoriteCiv: 'Pomo' }); await Promise.resolve();
  await h.sync.saveSettings(user, { favoriteCiv: 'Japan' });
  initial.resolve({ data: { favoriteCiv: 'Pomo', themeMode: 'dark' } });
  assert.equal((await loading).data.favoriteCiv, 'Japan');
});

test('failed settings remain visible and retryable without losing unrelated preferences', async () => {
  const h = accountHarness(); h.client.patch = async () => ({ error: new Error('Offline') });
  assert.ok((await h.sync.saveSettings(user, { favoriteCiv: 'Japan' })).error);
  assert.equal(h.sync.hasUnsavedSettings(user), true);
  delete h.client.patch;
  const retried = await h.sync.retrySettings(user);
  assert.equal(retried.data.favoriteCiv, 'Japan'); assert.equal(retried.data.themeMode, 'dark');
  assert.equal(h.sync.hasUnsavedSettings(user), false);
});

test('clearing an account suppresses stale responses and stops queued saves', async () => {
  const h = accountHarness(), first = deferred(); h.client.patch = () => first.promise;
  const a = h.sync.saveSettings(user, { favoriteCiv: 'Pomo' });
  const b = h.sync.saveSettings(user, { favoriteCiv: 'Japan' }); await Promise.resolve();
  h.sync.clear(user.id); const before = h.events.length;
  first.resolve({ data: { favoriteCiv: 'Pomo' } });
  assert.ok((await a).error); assert.ok((await b).error);
  assert.equal(h.calls.length, 1); assert.equal(h.events.length, before);
});

test('different settings consumers can import missing defaults without replacing existing keys', async () => {
  const h = accountHarness();
  await Promise.all([h.sync.loadSettings(user, { themeMode: 'light' }), h.sync.loadSettings(user, { contrastHideDecorations: true })]);
  const result = await h.sync.loadSettings(user);
  assert.equal(result.data.themeMode, 'dark'); assert.equal(result.data.contrastHideDecorations, true);
});

test('album and map update immediately from a matching account profile event', () => {
  const album = { authUser: user, authProfile: { username: 'Before', can_edit: false } };
  const map = { authUser: user, canEdit: false };
  const event = { detail: { userId: user.id, profile: { username: 'After', can_edit: true } } };
  albumAccountMethods.handleAccountProfile.call(album, event); mapAccessMethods.handleAccountProfile.call(map, event);
  assert.equal(album.authProfile.username, 'After'); assert.equal(album.authProfile.can_edit, true); assert.equal(map.canEdit, true);
  albumAccountMethods.handleAccountProfile.call(album, { detail: { userId: 'other', profile: { username: 'Wrong' } } });
  assert.equal(album.authProfile.username, 'After');
});

test('auth notifications defer work, coalesce duplicate initial events, and stop after unsubscribe', async () => {
  let notify, unsubscribed = false; const events = [];
  const subscription = subscribeAccountAuth({ auth: { onAuthStateChange(callback) { notify = callback; return { data: { subscription: { unsubscribe() { unsubscribed = true; } } } }; } } }, session => events.push(session));
  notify('INITIAL_SESSION', { user }); notify('SIGNED_IN', { user }); assert.equal(events.length, 0);
  await new Promise(resolve => setTimeout(resolve, 5)); assert.equal(events.length, 1);
  notify('SIGNED_OUT', null); subscription.unsubscribe();
  await new Promise(resolve => setTimeout(resolve, 5)); assert.equal(events.length, 1); assert.equal(unsubscribed, true);
});

function verifierHarness({ email = user.email, allowed = false, enabled = true, fail = false } = {}) {
  const writes = [], checks = [];
  const identity = { ...user, id: email === user.email ? user.id : 'different-account', email };
  const handler = createSupporterHandler({
    env: key => ({ SUPABASE_URL: 'https://example.test', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' })[key],
    createClient: (_url, key) => key === 'anon'
      ? { auth: { getUser: async token => token === 'valid' ? { data: { user: identity } } : { data: {}, error: new Error('Invalid') } } }
      : { rpc: async (name, params) => { checks.push(params); return fail ? { error: new Error('Unavailable') } : { data: { enabled, allowed, status: allowed ? 'active' : 'none' } }; }, from: () => ({ upsert: async row => { writes.push(row); return {}; } }) },
  });
  const call = (token = 'valid', body = {}) => handler(new Request('https://example.test/check', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  return { call, writes, checks };
}

test('verifier checks only verified account ID and ignores a submitted donor email', async () => {
  const donor = verifierHarness({ allowed: true }); assert.equal((await (await donor.call()).json()).allowed, true);
  const stranger = verifierHarness({ email: 'stranger@example.com' });
  assert.equal((await (await stranger.call('valid', { email: user.email })).json()).allowed, false);
  assert.deepEqual(stranger.checks, [{ target_user: 'different-account' }]);
  assert.equal((await stranger.call('invalid')).status, 401);
  assert.equal(stranger.writes.length, 1);
});

test('verifier fails safely without writing cached flags when payment access is disabled or unavailable', async () => {
  for (const options of [{ enabled: false }, { fail: true }]) {
    const unavailable = verifierHarness(options);
    assert.equal((await unavailable.call()).status, 503);
    assert.equal(unavailable.writes.length, 0);
  }
  const manual = verifierHarness({ allowed: true });
  assert.equal((await (await manual.call()).json()).allowed, true);
  assert.equal(manual.writes[0].can_edit, true);
});

test('a formerly granted account loses access after verification and stale profile reads cannot restore it', async () => {
  const h = accountHarness();
  h.client.readProfile = async () => ({ data: { username: 'Reader', can_edit: true } });
  h.client.verify = async () => ({ allowed: false, error: null, data: { status: 'expired' } });
  assert.equal((await h.sync.refreshSupporter(user)).allowed, false);
  const loaded = await h.sync.loadProfile(user, { force: true });
  assert.equal(loaded.data.can_edit, false);
  assert.equal(loaded.data.supporter_status, 'expired');
});

test('an open account expires at its deadline without another page load', async t => {
  const previousWindow = globalThis.window;
  globalThis.window = {};
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  try {
    const h = accountHarness();
    h.client.verify = async () => ({ allowed: true, error: null, data: { status: 'active', server_now: new Date(1000).toISOString(), expires_at: new Date(3000).toISOString() } });
    await h.sync.refreshSupporter(user);
    t.mock.timers.tick(2001);
    const last = h.events.filter(event => event.name === 'account-profile-updated').at(-1);
    assert.equal(last.detail.profile.can_edit, false);
    assert.equal(last.detail.profile.supporter_status, 'expired');
    h.sync.clear(user.id);
  } finally {
    t.mock.timers.reset();
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  }
});
