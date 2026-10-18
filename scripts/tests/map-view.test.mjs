import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reactive, isReactive } from 'vue';
import { readFileSync } from 'node:fs';
import { mapViewMethods, parseMapView } from '../../src/.vuepress/theme/components/community/map/mapView.js';
import { mapNavigationMethods } from '../../src/.vuepress/theme/components/community/map/mapNavigation.js';
import { mapInteractionMethods } from '../../src/.vuepress/theme/components/community/map/mapInteraction.js';
import { mapSnapshotsMethods } from '../../src/.vuepress/theme/components/community/map/mapSnapshots.js';
import { mapLoadingMethods } from '../../src/.vuepress/theme/components/community/map/mapLoading.js';
import { buildOwnerBorders, buildTileLookup } from '../../src/.vuepress/theme/components/community/map/mapModel.js';
import { ownerPalette } from '../../src/.vuepress/data/communityTileMap.js';

function instance(methods, state = {}) {
  const ctx = { ...state };
  for (const [key, method] of Object.entries(methods)) ctx[key] = method.bind(ctx);
  return ctx;
}
function replaceGlobal(t, key, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; });
}
function viewContext() {
  const tile = { key: '3,4', col: 3, row: 4, x: 80, y: 98 };
  const ctx = instance({ ...mapNavigationMethods, ...mapViewMethods }, {
    tiles: [tile], tileLookup: new Map([[tile.key, tile]]), selectedTile: tile,
    viewportSize: { width: 800, height: 500 }, translate: { x: -600, y: -350 }, scale: 2,
    gridWidth: 4377, gridHeight: 1981, minScale: 0.4, maxScale: 3,
    snapshotViewId: 's5-episode-34', snapshotCompareId: 's5-episode-33',
    isOverlayTabActive: true, overlayView: 'civilization', overlayOwnerName: 'Babylon',
    contrastHideDecorations: true, contrastFlattenLandWater: false,
    $route: { path: '/community-tile-map/', query: {} }, $nextTick: cb => cb(),
  });
  ctx.updateViewportSize = () => {};
  ctx.clampTranslate = value => value;
  return ctx;
}

test('shared view round trips across viewport sizes with snapshot, tile, owner, and contrast settings', t => {
  replaceGlobal(t, 'window', { location: { origin: 'https://civbattleroyale.tv' } });
  const source = viewContext(), url = new URL(source.buildMapViewUrl());
  assert.equal(url.pathname, '/community-tile-map/');
  assert.equal(url.searchParams.get('snapshot'), source.snapshotViewId);
  const target = viewContext(); target.viewportSize = { width: 400, height: 300 };
  target.$route.query = Object.fromEntries(url.searchParams);
  assert.equal(target.applySharedMapView(), true);
  assert.equal(target.scale, 2); assert.equal(target.overlayOwnerName, 'Babylon'); assert.equal(target.editPanelTab, 'overlays');
  assert.equal(target.selectedTile.key, '3,4'); assert.equal(target.snapshotCompareId, 's5-episode-33');
  assert.equal(target.contrastHideDecorations, true); assert.equal(target.contrastFlattenLandWater, false);
  assert.equal((400 / 2 - target.translate.x) / target.scale, (800 / 2 - source.translate.x) / source.scale);
  assert.equal((300 / 2 - target.translate.y) / target.scale, (500 / 2 - source.translate.y) / source.scale);
});

test('shared view rejects malformed inputs and clamps extreme coordinates and zoom', () => {
  for (const value of ['', '1,2', '1,2,0', ',2,3', 'NaN,2,3', 'Infinity,2,3', ['1,2,3']]) assert.equal(parseMapView(value), null);
  const ctx = viewContext(); ctx.$route.query = { view: '-10000,20000,5000', tile: '999,999' };
  ctx.applySharedMapView(); assert.equal(ctx.scale, 3); assert.equal(ctx.selectedTile, null);
  assert.deepEqual(ctx.translate, { x: 400, y: 250 - 1981 * 3 });
});

test('shared route waits for snapshot selection, skips search zoom, and ignores a stale route response', async () => {
  const ctx = viewContext(); let resolve; let applied = 0;
  ctx.$route.query = { snapshot: 's5-episode-34', view: '500,300,1.4', tile: '3,4' };
  ctx.ensureSnapshotSelection = () => new Promise(done => { resolve = done; });
  ctx.applySharedMapView = () => { applied++; return true; };
  ctx.focusTileByKey = () => assert.fail('Shared views should not force search zoom');
  const first = ctx.applyRequestedTileFromRoute();
  assert.equal(applied, 0);
  ctx._routeViewRequestId++; resolve(true); await first; assert.equal(applied, 0);
  ctx.ensureSnapshotSelection = async () => true;
  await ctx.applyRequestedTileFromRoute(); assert.equal(applied, 1);
});

test('clipboard rejection reveals a selectable link instead of losing the share action', async t => {
  replaceGlobal(t, 'window', { location: { origin: 'https://civbattleroyale.tv' } });
  replaceGlobal(t, 'navigator', { clipboard: { writeText: async () => { throw new Error('unavailable'); } } });
  const ctx = viewContext(); let selected = false;
  ctx.$refs = { mapViewLink: { focus() {}, select() { selected = true; } } };
  await ctx.copyMapViewLink(); assert.equal(ctx.showMapViewLink, true); assert.equal(selected, true); assert.match(ctx.mapViewLink, /view=/);
  navigator.clipboard.writeText = async () => {};
  await ctx.copyMapViewLink(); assert.equal(ctx.showMapViewLink, false); assert.equal(ctx.mapViewStatus, 'Link copied');
});

test('keyboard selection stays on the map, reveals details, and does not hijack form controls', () => {
  const ctx = instance({ ...mapViewMethods, ...mapInteractionMethods }, {
    selectedTile: { key: '0,0', col: 0, row: 0 }, tileLookup: new Map([['1,0', { key: '1,0', col: 1, row: 0 }]]), $refs: { viewport: {} },
  });
  let shown, prevented = 0; ctx.ensureTileInViewport = () => {}; ctx.showSelectedTooltip = tile => { shown = tile; };
  const event = { key: 'ArrowRight', shiftKey: true, preventDefault() { prevented++; }, target: ctx.$refs.viewport };
  ctx.onKeydown(event); assert.equal(ctx.selectedTile.key, '1,0');
  ctx.onKeydown(event); assert.equal(ctx.selectedTile.key, '1,0');
  ctx.onKeydown({ ...event, key: 'Enter', shiftKey: false }); assert.equal(shown.key, '1,0');
  ctx.onKeydown({ ...event, target: { tagName: 'INPUT' } }); assert.equal(prevented, 3);
});

test('edit highlight expiry touches only changed tiles and never requests a terrain frame', t => {
  let now = 100, timerId = 0; const timers = new Map();
  replaceGlobal(t, 'performance', { now: () => now });
  replaceGlobal(t, 'window', { setTimeout: cb => { timers.set(++timerId, cb); return timerId; }, clearTimeout: id => timers.delete(id),
    requestAnimationFrame: () => assert.fail('Highlights use CSS animation') });
  const ctx = instance(mapInteractionMethods, { recentEditSequence: 0 });
  Object.defineProperty(ctx, 'tiles', { get() { assert.fail('Do not scan every tile'); } });
  ctx.drawTerrainCanvas = () => assert.fail('Do not redraw terrain');
  ctx.markTileRecentlyEdited({ key: '1,1', x: 1, y: 1 });
  const firstKey = ctx.recentEditTiles[0].animationKey;
  now += 100; ctx.markTileRecentlyEdited({ key: '1,1', x: 1, y: 1 });
  assert.equal(ctx.recentEditTiles.length, 1); assert.notEqual(ctx.recentEditTiles[0].animationKey, firstKey);
  ctx.markTileRecentlyEdited({ key: '2,1', x: 2, y: 1 }, 1000); assert.equal(timers.size, 1);
  now += 1001; ctx.expireRecentEdits(); assert.equal(ctx.recentEditTiles.length, 1);
  now += 4000; ctx.expireRecentEdits(); assert.equal(ctx.recentEditTiles.length, 0); assert.equal(timers.size, 0);
  ctx.markTileRecentlyEdited({ key: '1,1', x: 1, y: 1 }); ctx.clearRecentEdits(); assert.equal(timers.size, 0);
});

test('snapshot comparison starts both requests together and discards superseded comparisons', async () => {
  const ctx = instance(mapSnapshotsMethods, { snapshotViewId: 'one', snapshotCompareId: 'two', snapshotDiffRequestId: 0 });
  const started = [], releases = {};
  ctx.getSnapshotPayloadById = id => { started.push(id); return new Promise(resolve => { releases[id] = resolve; }); };
  const pending = ctx.computeSnapshotDiffs(); assert.deepEqual(started, ['one', 'two']);
  ctx.snapshotDiffRequestId++; ctx.snapshotDiffLookup = { keep: true };
  releases.one([]); releases.two([]); await pending; assert.deepEqual(ctx.snapshotDiffLookup, { keep: true });
});

test('snapshot memory cache evicts least recent entries and protects displayed comparisons', () => {
  const ctx = instance(mapSnapshotsMethods, { snapshotPayloadCache: {} });
  ctx.cacheSnapshotPayload('a', []); ctx.cacheSnapshotPayload('b', []); ctx.cacheSnapshotPayload('c', []);
  ctx.cacheSnapshotPayload('a', ctx.snapshotPayloadCache.a); ctx.cacheSnapshotPayload('d', []);
  assert.deepEqual(Object.keys(ctx.snapshotPayloadCache), ['c', 'a', 'd']);
  ctx.snapshotViewId = 'a'; ctx.snapshotCompareId = 'd';
  for (let i = 0; i < 20; i++) ctx.cacheSnapshotPayload(`other-${i}`, []);
  assert.equal(Object.keys(ctx.snapshotPayloadCache).length, 3); assert.ok(ctx.snapshotPayloadCache.a); assert.ok(ctx.snapshotPayloadCache.d);
});

test('fullscreen fallback restores scrolling and focus on Escape and teardown', async t => {
  let focused = false;
  const previous = { focus() { focused = true; } };
  const doc = { body: { style: { overflow: 'auto' } }, activeElement: previous, removeEventListener() {} };
  replaceGlobal(t, 'document', doc);
  const ctx = instance(mapViewMethods, { $refs: { mapRoot: {}, viewport: { focus() {} } }, $nextTick: cb => cb() });
  ctx.updateViewportSize = ctx.clampView = ctx.hideHoverTooltip = () => {};
  await ctx.toggleMapFullscreen(); assert.equal(ctx.isMapFullscreen, true); assert.equal(doc.body.style.overflow, 'hidden');
  ctx.onMapViewKeydown({ key: 'Escape', preventDefault() {} });
  assert.equal(ctx.isMapFullscreen, false); assert.equal(doc.body.style.overflow, 'auto'); assert.equal(focused, true);
  await ctx.toggleMapFullscreen(); ctx.teardownMapView(); assert.equal(doc.body.style.overflow, 'auto');
});

test('native fullscreen change tracks browser Escape and failed requests use the fallback', async t => {
  const root = {}, doc = { body: { style: {} }, activeElement: { focus() {} } };
  root.requestFullscreen = async () => { doc.fullscreenElement = root; };
  doc.exitFullscreen = async () => { doc.fullscreenElement = null; };
  replaceGlobal(t, 'document', doc);
  const ctx = instance(mapViewMethods, { $refs: { mapRoot: root, viewport: { focus() {} } }, $nextTick: cb => cb() });
  ctx.updateViewportSize = ctx.clampView = () => {};
  await ctx.toggleMapFullscreen(); assert.equal(ctx.isMapFullscreen, true); assert.ok(!ctx.fullscreenFallback);
  doc.fullscreenElement = null; ctx.handleFullscreenChange(); assert.equal(ctx.isMapFullscreen, false);
  root.requestFullscreen = async () => { throw new Error('denied'); };
  await ctx.toggleMapFullscreen(); assert.equal(ctx.fullscreenFallback, true);
  await ctx.toggleMapFullscreen(); assert.equal(ctx.isMapFullscreen, false);
});

test('initial map builds equivalent borders before reactive tile assignment', async () => {
  const base = JSON.parse(readFileSync('src/.vuepress/public/community/CBRXMapOct62025_V2.base.json', 'utf8'));
  const state = JSON.parse(readFileSync('src/.vuepress/public/community/CBRXMapOct62025_V2.state.json', 'utf8'));
  const ctx = instance(mapLoadingMethods, { mapConfig: {}, hexSize: 14, ownerPalette, terrainRevision: 0, $nextTick: () => {} });
  ctx.resetTerrainBaseCache = ctx.resetMiniMapCache = ctx.clearRecentEdits = () => {};
  ctx.scheduleOwnerBordersRebuild = () => assert.fail('Initial borders should already be constructed');
  let rawTiles;
  Object.defineProperty(ctx, 'tiles', { set(value) {
    assert.equal(isReactive(value), false); assert.ok(value.some(tile => tile.ownerBorderSegments.length)); rawTiles = value;
  }, get() { return reactive(rawTiles); } });
  await ctx.applyMapData(base, state, { deferLiveSync: true });
  const before = rawTiles.map(tile => tile.ownerBorderSegments);
  buildOwnerBorders(rawTiles, base.width, base.height, ctx.ownerSecondaryColors, 14, null, buildTileLookup(rawTiles));
  assert.deepEqual(rawTiles.map(tile => tile.ownerBorderSegments), before);
});

test('shared snapshots preserve an explicitly empty comparison', t => {
  replaceGlobal(t, 'window', { location: { origin: 'https://civbattleroyale.tv' } });
  const source = viewContext(); source.snapshotCompareId = '';
  const url = new URL(source.buildMapViewUrl()); assert.equal(url.searchParams.get('compare'), '');
  const target = viewContext(); target.snapshotCompareId = '__live__';
  target.$route.query = Object.fromEntries(url.searchParams);
  target.applySharedMapView(); assert.equal(target.snapshotCompareId, '');
});
