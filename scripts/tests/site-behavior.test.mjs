import './supporter-payments.test.mjs';
import './search.test.mjs';
import './reading-library.test.mjs';
import './account-sync.test.mjs';
import './search-filters.test.mjs';
import './map-performance.test.mjs';
import './map-view.test.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeEpisodeNumber } from '../../src/shared/episode.mjs';

import { mapLoadingMethods } from '../../src/.vuepress/theme/components/community/map/mapLoading.js';
import * as mapModel from '../../src/.vuepress/theme/components/community/map/mapModel.js';
import * as snapshots from '../../src/.vuepress/theme/components/community/map/mapSnapshots.js';
import * as persistence from '../../src/.vuepress/theme/components/community/map/mapPersistence.js';
import * as reactions from '../../src/.vuepress/theme/components/albums/behavior/albumReactions.js';
import * as progress from '../../src/.vuepress/theme/components/albums/behavior/albumProgress.js';
import * as albumSnapshot from '../../src/.vuepress/theme/components/albums/behavior/albumSnapshot.js';

function instance(methods, computed = {}, state = {}) {
  const context = { ...state };
  for (const [key, method] of Object.entries(methods)) context[key] = method.bind(context);
  for (const [key, get] of Object.entries(computed)) Object.defineProperty(context, key, { get: get.bind(context) });
  return context;
}
function storage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key) };
}

test('episode normalization preserves decimals and legacy fallback behavior', () => {
  for (const [value, expected] of [[null, ''], ['', ''], ['034', '34'], [' 12.50 ', '12.5'], [0, '0'], ['special', 'special']]) {
    assert.equal(normalizeEpisodeNumber(value), expected);
  }
});

test('map base state is independent from subsequent tile edits', async () => {
  const { buildBaseState } = mapModel;
  const tile = { owner: 0, notes: 'Original', city: { id: 1, name: 'Capital', size: 4, worldWonders: ['Oracle'] },
    combatUnit: { id: 2, type: 'Warrior', owner: 0 } };
  const base = buildBaseState(tile);
  tile.city.name = 'Changed'; tile.city.worldWonders.push('Pyramids'); tile.combatUnit.owner = 1;
  assert.equal(base.owner, 0);
  assert.equal(base.city.name, 'Capital');
  assert.deepEqual(base.city.worldWonders, ['Oracle']);
  assert.equal(base.combatUnit.owner, 0);
});

test('hex geometry supports center hit testing and rejects an outside point', async () => {
  const { buildHexVertices, pointInPolygon } = mapModel;
  const vertices = buildHexVertices(20);
  assert.equal(vertices.length, 6);
  assert.equal(pointInPolygon(0, 0, vertices), true);
  assert.equal(pointInPolygon(100, 100, vertices), false);
});

test('snapshot cache round trip preserves labels and tolerates corrupted storage', async (t) => {
  const oldWindow = globalThis.window;
  globalThis.window = { localStorage: storage() };
  t.after(() => { if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow; });
  const { mapSnapshotsMethods } = snapshots;
  const context = instance(mapSnapshotsMethods);
  context.writeSnapshotListToStorage([{ id: 'one', episode_label: 'Episode 34 Snapshot', is_published: true }]);
  const restored = context.readSnapshotListFromStorage();
  assert.equal(restored.rows[0].episode_label, 'Episode 34 Snapshot');
  assert.equal(restored.rows[0].is_published, true);
  window.localStorage.setItem(context.snapshotListStorageKey(), '{bad json');
  assert.equal(context.readSnapshotListFromStorage(), null);
});

test('failed map saves remain queued, then clear only after a successful retry', async () => {
  const { mapPersistenceMethods } = persistence;
  let fail = true, retries = 0, logs = 0;
  const context = instance(mapPersistenceMethods, {}, {
    supabase: { from: () => ({ upsert: async () => ({ error: fail ? { message: 'Offline' } : null }),
      insert: async () => { logs += 1; return {}; } }) },
    tileSaveQueue: new Map([['1:2', { tile_key: '1:2', payload: { owner: 3 } }]]),
    authUser: { id: 'tester' }, tileSaveRetryCount: 2,
  });
  context.scheduleTileSaveRetry = () => { retries += 1; };
  context.updateConnectionStatus = () => {};
  await context.flushTileSaves();
  assert.equal(context.tileSaveQueue.size, 1);
  assert.equal(retries, 1);
  assert.equal(logs, 0);
  fail = false;
  await context.flushTileSaves();
  assert.equal(context.tileSaveQueue.size, 0);
  assert.equal(context.tileSaveRetryCount, 0);
  assert.equal(logs, 1);
});

test('reaction changes update only the selected scene and never go below zero', async () => {
  const { albumReactionsMethods } = reactions;
  const context = instance(albumReactionsMethods, {}, { reactionCounts: { 1: { clap: 1 }, 2: { heart: 8 } }, userReactions: {} });
  context.emitReactionSnapshot = () => {};
  context.applyReactionOptimistic(1, 'clap', 'heart');
  assert.deepEqual(context.reactionCounts, { 1: { clap: 0, heart: 1 }, 2: { heart: 8 } });
  context.applyReactionOptimistic(1, 'clap', null);
  assert.equal(context.reactionCounts[1].clap, 0);
});

test('bookmark restoration respects a scene URL and preserves local progress', async (t) => {
  const oldWindow = globalThis.window;
  globalThis.window = { localStorage: storage(), sessionStorage: storage() };
  t.after(() => { if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow; });
  const { albumProgressMethods, albumProgressComputed } = progress;
  const context = instance(albumProgressMethods, albumProgressComputed, { $page: { path: '/albums/s5/Episode34/' }, jumpToScene: 12 });
  context.getHashSceneNumber = () => 12;
  context.setLocalSceneNumber(context.bookmarkKey, 20);
  context.loadBookmarkLocal();
  assert.equal(context.bookmarkedScene, 20);
  assert.equal(context.jumpToScene, 12);
  assert.equal(context.getLocalSceneNumber(context.bookmarkKey), 20);
  context.setLocalSceneNumber(context.bookmarkKey, null);
  assert.equal(context.getLocalSceneNumber(context.bookmarkKey), null);
});

test('decimal snapshot URLs use the same normalized episode as the builder', async () => {
  const { albumSnapshotComputed } = albumSnapshot;
  const context = instance({}, albumSnapshotComputed, { $page: { path: '/albums/s5/Episode12.5/',
    frontmatter: { edition: 'S5', episode_number: '012.50' } } });
  assert.equal(context.episodeSnapshotNumber, '12.5');
  assert.equal(context.episodeSnapshotPath, '/community/snapshots/s5-episode-12-5.json');
  assert.equal(context.previousEpisodeSnapshotPath, '');
});

function browser(t) {
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  const timers = new Map(), listeners = new Map();
  globalThis.window = { setInterval(fn, delay) { timers.set(1, { fn, delay }); return 1; }, clearInterval(id) { timers.delete(id); } };
  globalThis.document = { hidden: false, addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name) };
  t.after(() => {
    if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
  });
  return { timers, listeners };
}
function reactionReader(respond) {
  const requests = [];
  const context = instance(reactions.albumReactionsMethods, {}, {
    $page: { path: '/albums/s5/Episode34/' }, authUser: { id: 'reader' }, userReactions: {},
    supabase: { from(table) {
      const request = { table }; requests.push(request);
      const query = { select(fields) { request.fields = fields; return query; },
        in(field, values) { request.paths = values; return query; },
        eq(field, value) { request.user = value; return query; },
        then(resolve, reject) { return Promise.resolve().then(() => respond(request)).then(resolve, reject); } };
      return query;
    } },
  });
  context.emitReactionSnapshot = () => {};
  return { context, requests };
}

test('reaction polls use aggregate counts and reuse user reactions until an explicit refresh', async (t) => {
  browser(t);
  const { context, requests } = reactionReader(({ table }) => ({ data: table === 'album_reaction_spotlight'
    ? [{ scene_number: 1, reaction_key: 'clap', reaction_count: 12 }, { scene_number: 1, reaction_key: 'clap', reaction_count: '3' }]
    : [{ scene_number: 1, reaction_key: 'clap' }] }));
  await context.loadReactionCounts();
  assert.equal(context.reactionCounts[1].clap, 15);
  assert.equal(context.userReactions[1], 'clap');
  assert.equal(requests.length, 2);
  await context.loadReactionCounts({ refreshUser: false });
  assert.equal(requests.length, 3);
  assert.equal(context.userReactions[1], 'clap');
  await context.loadReactionCounts();
  assert.equal(requests.length, 5);
  context.authUser = null;
  await context.loadReactionCounts();
  assert.deepEqual(context.userReactions, {});
  assert.equal(requests.length, 6);
});

test('hidden albums stop polling and resume with fresh data; teardown removes the listener', async (t) => {
  const { timers, listeners } = browser(t);
  const { context, requests } = reactionReader(() => ({ data: [] }));
  context.authUser = null;
  context.initReactions();
  await new Promise(setImmediate);
  assert.equal(timers.get(1).delay, 60000);
  document.hidden = true;
  listeners.get('visibilitychange')();
  assert.equal(timers.size, 0);
  const count = requests.length;
  await context.loadReactionCounts();
  assert.equal(requests.length, count);
  document.hidden = false;
  listeners.get('visibilitychange')();
  await new Promise(setImmediate);
  assert.equal(requests.length, count + 1);
  assert.equal(timers.size, 1);
  context.teardownReactions();
  assert.equal(timers.size, 0);
  assert.equal(listeners.size, 0);
});

test('missing aggregate view falls back once; transient failures preserve existing counts', async (t) => {
  browser(t);
  const { context, requests } = reactionReader(({ table }) => table === 'album_reaction_spotlight'
    ? { error: { code: 'PGRST205' } } : { data: [{ scene_number: 2, reaction_key: 'heart' }] });
  context.authUser = null;
  await context.loadReactionCounts();
  await context.loadReactionCounts({ refreshUser: false });
  assert.equal(requests.filter(r => r.table === 'album_reaction_spotlight').length, 1);
  assert.equal(context.reactionCounts[2].heart, 1);
  const other = reactionReader(() => ({ error: { code: '503' } })).context;
  other.authUser = null;
  other.reactionCounts = { 1: { clap: 9 } };
  const warn = console.warn; console.warn = () => {};
  try { await other.loadReactionCounts(); } finally { console.warn = warn; }
  assert.deepEqual(other.reactionCounts, { 1: { clap: 9 } });
  assert.equal(other._reactionAggregateUnavailable, undefined);
});

test('a response for the previous album is discarded and the new album is refreshed', async (t) => {
  browser(t);
  let release;
  const { context } = reactionReader(({ paths }) => paths.includes('/albums/s5/Episode34/')
    ? new Promise(resolve => { release = resolve; })
    : { data: [{ scene_number: 1, reaction_key: 'heart', reaction_count: 4 }] });
  context.authUser = null;
  const pending = context.loadReactionCounts();
  await new Promise(setImmediate);
  context.$page.path = '/albums/s5/Episode35/';
  context.resetReactions();
  release({ data: [{ scene_number: 1, reaction_key: 'clap', reaction_count: 99 }] });
  await pending;
  await new Promise(setImmediate);
  assert.deepEqual(context.reactionCounts, { 1: { heart: 4 } });
});

function mapLoader() {
  const context = instance(mapLoadingMethods, {}, { mapConfig: { baseCacheUrl: 'base', stateCacheUrl: 'state', sourceUrl: 'source' },
    $nextTick: () => {}, isMobileSafari: false });
  context.applyConfiguredSnapshotPayload = () => {};
  return context;
}
test('map base and state start together and are both available before rendering', async () => {
  const context = mapLoader(), started = [], applied = [];
  const resolve = {};
  context.loadJson = url => { started.push(url); return new Promise(done => { resolve[url] = done; }); };
  context.applyMapData = async (...args) => applied.push(args);
  const pending = context.loadMap();
  assert.deepEqual(started, ['base', 'state']);
  resolve.state({ owner: 2 });
  await Promise.resolve();
  assert.equal(applied.length, 0);
  resolve.base({ width: 10 });
  await pending;
  assert.deepEqual(applied, [[{ width: 10 }, { owner: 2 }, { deferLiveSync: true }]]);
  assert.equal(context.isLoading, false);
});

test('mobile Safari keeps state deferred until after the base map renders', async () => {
  const context = mapLoader(), calls = [];
  context.isMobileSafari = true;
  context.loadJson = async url => { calls.push(url); return { width: 10 }; };
  context.applyMapData = async (...args) => calls.push(args);
  context.scheduleDeferredStateHydration = data => calls.push(['deferred', data]);
  await context.loadMap({ deferStateData: true });
  assert.deepEqual(calls, ['base', [{ width: 10 }, null, { deferLiveSync: true }], ['deferred', { width: 10 }]]);
});

test('missing cached map uses the binary fallback and tolerates absent state', async (t) => {
  const oldFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = oldFetch; });
  globalThis.fetch = async url => { assert.equal(url, 'source'); return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) }; };
  const context = mapLoader();
  context.loadJson = async () => null;
  context.parseMapBuffer = async () => ({ width: 12 });
  let applied;
  context.applyMapData = async (...args) => { applied = args; };
  await context.loadMap();
  assert.deepEqual(applied, [{ width: 12 }, null, { deferLiveSync: true }]);
  assert.equal(context.loadError, '');
});

test('a saved reaction refreshes counts and the reader selection immediately', async (t) => {
  browser(t);
  const context = instance(reactions.albumReactionsMethods, {}, {
    authUser: { id: 'reader' }, userReactions: {}, reactionCounts: {},
    $page: { path: '/albums/s5/Episode34/' },
    supabase: { from: () => ({ upsert: async row => { assert.equal(row.reaction_key, 'clap'); return {}; } }) },
  });
  context.emitReactionSnapshot = () => {};
  let refreshes = 0;
  context.loadReactionCounts = () => { refreshes += 1; assert.equal(context.reactionUpdating, false); };
  await context.toggleReaction(1, 'clap');
  assert.equal(context.userReactions[1], 'clap');
  assert.equal(refreshes, 1);
});
