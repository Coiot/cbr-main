import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tilesInViewport, buildTileLookup, buildOwnerBorders } from '../../src/.vuepress/theme/components/community/map/mapModel.js';
import { mapLoadingMethods } from '../../src/.vuepress/theme/components/community/map/mapLoading.js';
import { mapRenderingMethods } from '../../src/.vuepress/theme/components/community/map/mapRendering.js';
import { mapInteractionMethods } from '../../src/.vuepress/theme/components/community/map/mapInteraction.js';
import { mapPersistenceMethods } from '../../src/.vuepress/theme/components/community/map/mapPersistence.js';
import { mapSnapshotsMethods } from '../../src/.vuepress/theme/components/community/map/mapSnapshots.js';
import { mapAccessComputed } from '../../src/.vuepress/theme/components/community/map/mapAccess.js';

function instance(methods, state = {}) {
  const ctx = { ...state };
  for (const [key, method] of Object.entries(methods)) ctx[key] = method.bind(ctx);
  return ctx;
}
function frames(t) {
  const original = globalThis.window, queue = new Map(); let id = 0;
  globalThis.window = { requestAnimationFrame: cb => { queue.set(++id, cb); return id; }, cancelAnimationFrame: id => queue.delete(id) };
  t.after(() => { globalThis.window = original; });
  return { queue, run() { const batch = [...queue.values()]; queue.clear(); batch.forEach(cb => cb()); } };
}
function grid(columns, rows, size = 14) {
  const tiles = [], width = size * Math.sqrt(3);
  for (let row = rows - 1; row >= 0; row--) for (let col = 0; col < columns; col++) {
    tiles.push({ key: `${col},${row}`, row, col, x: col * width + (row % 2 ? 0 : width / 2) + width / 2,
      y: row * size * 1.5 + size, owner: col < columns / 2 ? 1 : 2, terrainId: 'grass' });
  }
  return tiles;
}

test('grid range lookup preserves visible tiles and ordering without scanning the entire map', () => {
  const tiles = grid(180, 94), lookup = buildTileLookup(tiles), viewport = { width: 1100, height: 700 };
  for (const scale of [0.4, 1, 1.25, 2, 4]) for (const translate of [{ x: 0, y: 0 }, { x: -1234, y: -523 }, { x: 200, y: 170 }, { x: -17000, y: -9000 }]) {
    const padX = (14 * Math.sqrt(3) / 2 + 42) * 2, padY = 112;
    const expected = tiles.filter(tile => tile.x >= -translate.x / scale - padX && tile.x <= (-translate.x + viewport.width) / scale + padX &&
      tile.y >= -translate.y / scale - padY && tile.y <= (-translate.y + viewport.height) / scale + padY);
    assert.deepEqual(tilesInViewport(lookup, 180, 94, 14, translate, scale, viewport), expected);
  }
  let visits = 0;
  tilesInViewport({ get: key => { visits++; return lookup.get(key); } }, 180, 94, 14, { x: -1234, y: -523 }, 2, viewport);
  assert.ok(visits < tiles.length / 10);
});

test('incremental owner borders match a full rebuild, including adjacent changes and map edges', () => {
  const tiles = grid(12, 10), lookup = buildTileLookup(tiles), colors = { 1: '#123', 2: '#456', 3: '#789' };
  buildOwnerBorders(tiles, 12, 10, colors, 14);
  const untouched = lookup.get('11,9').ownerBorderSegments;
  const changes = new Map([['0,0', null], ['5,4', 3], ['5,5', 3], ['6,4', null]]);
  for (const [key, owner] of changes) lookup.get(key).owner = owner;
  const reference = structuredClone(tiles);
  buildOwnerBorders(reference, 12, 10, colors, 14);
  buildOwnerBorders(tiles, 12, 10, colors, 14, changes.keys(), lookup);
  assert.deepEqual(tiles, reference);
  assert.equal(lookup.get('11,9').ownerBorderSegments, untouched);
});

test('minimap panning reuses terrain, while terrain replacement invalidates the cache', t => {
  let fills = 0, images = 0; const rectangles = [];
  const ctx = { setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() { fills++; },
    drawImage() { images++; }, fillRect() {}, strokeRect(...args) { rectangles.push(args); } };
  const original = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
  t.after(() => { globalThis.document = original; });
  const state = instance(mapRenderingMethods, { gridWidth: 400, gridHeight: 200, miniMapWidth: 180, miniMapHeight: 90,
    miniMapScale: 0.45, hexSize: 14, terrainRevision: 1, tiles: grid(12, 10),
    miniMapViewport: { x: 0, y: 0, width: 100, height: 50 }, $refs: { miniMapCanvas: { getContext: () => ctx } } });
  state.drawMiniMap(); assert.equal(fills, 120);
  state.miniMapViewport.x = 100; state.drawMiniMap();
  assert.equal(fills, 120); assert.equal(images, 2); assert.notDeepEqual(rectangles[0], rectangles[1]);
  state.terrainRevision++; state.drawMiniMap(); assert.equal(fills, 240);
  const cached = state.miniMapBaseCanvas; state.resetMiniMapCache(); assert.equal(cached.width, 0); assert.equal(state.miniMapBaseCanvas, null);
});

test('hover and selection update without redrawing the terrain canvas', () => {
  const tile = { key: '2,3' };
  const ctx = instance(mapInteractionMethods, { activePointers: new Map(), useTerrainCanvas: true });
  ctx.updateTooltipPosition = ctx.scheduleHoverTooltip = ctx.releaseMapPointer = () => {};
  ctx.getTileAtPointer = () => tile;
  ctx.drawTerrainCanvas = () => assert.fail('Terrain should not be redrawn for an outline');
  ctx.onPointerMove({ pointerType: 'mouse' }); assert.equal(ctx.hoveredTile, tile);
  ctx.onPointerUp({ type: 'pointerup', pointerType: 'mouse', button: 0 }); assert.equal(ctx.selectedTile, tile);
  ctx.onPointerUp({ type: 'pointerleave', pointerType: 'mouse' }); assert.equal(ctx.hoveredTile, null);
});

function liveLoader() {
  const ctx = instance(mapLoadingMethods, { tiles: [], mapConfig: { baseCacheUrl: 'base', stateCacheUrl: 'state' },
    supabase: {}, canEdit: true, $nextTick: cb => cb() });
  ctx.loadJson = async () => ({});
  ctx.applyMapData = async () => { ctx.tiles = [{}]; };
  ctx.applyConfiguredSnapshotPayload = ctx.updateViewportSize = ctx.scheduleInitialFitToView = ctx.applyRequestedTileFromRoute = () => {};
  ctx.ensureLiveBaseSnapshotApplied = async () => {};
  ctx.subscribeToTileOverrides = ctx.scheduleLiveOverridesFlush = () => {};
  ctx.loadTileOverrides = async () => { ctx.hasLoadedOverrides = true; return true; };
  return ctx;
}

test('cached map renders before live refresh; editing waits until refresh succeeds', async t => {
  const raf = frames(t), ctx = liveLoader(); let resolveLive, requested = false;
  ctx.loadLiveBaseSnapshot = () => { requested = true; return new Promise(resolve => { resolveLive = resolve; }); };
  await ctx.loadMap();
  assert.equal(ctx.isLoading, false); assert.equal(requested, false); assert.equal(ctx.isLiveSyncing, true);
  assert.equal(mapAccessComputed.editAccessAllowed.call(ctx), false);
  raf.run(); assert.equal(requested, false); raf.run(); await Promise.resolve();
  assert.equal(requested, true); assert.equal(ctx.isLoading, false);
  const pending = ctx._liveRefreshPromise; resolveLive(); await pending;
  assert.equal(ctx.isLiveSyncing, false); assert.equal(mapAccessComputed.editAccessAllowed.call(ctx), true);
});

test('unavailable live connection retains cached map and can be retried', async () => {
  const ctx = liveLoader(); ctx.tiles = [{}]; ctx.supabase = null; ctx.initSupabase = () => {};
  await ctx.refreshLiveMap();
  assert.match(ctx.liveSyncError, /cached map/); assert.equal(ctx._liveRefreshPromise, null);
  assert.equal(mapAccessComputed.editAccessAllowed.call(ctx), false);
  ctx.supabase = {}; ctx.loadLiveBaseSnapshot = async () => {};
  await ctx.refreshLiveMap(); assert.equal(ctx.liveSyncError, ''); assert.equal(ctx.hasLoadedOverrides, true);
});

test('snapshot embeds skip live refresh and disposal prevents late subscriptions', async () => {
  const ctx = liveLoader(); ctx.tiles = [{}]; ctx.resolvedEmbeddedMode = 'snapshot';
  ctx.loadLiveBaseSnapshot = () => assert.fail('Snapshot should not request live data');
  await ctx.refreshLiveMap();
  ctx.resolvedEmbeddedMode = null; let resolve;
  ctx.loadLiveBaseSnapshot = () => new Promise(done => { resolve = done; });
  ctx.subscribeToTileOverrides = () => assert.fail('Disposed map should not subscribe');
  const pending = ctx.refreshLiveMap(); await Promise.resolve(); ctx._mapDisposed = true; resolve(); await pending;
});

test('live edits batch per frame, coalesce repeated tiles, and preserve snapshot views', t => {
  const raf = frames(t), applied = [];
  const ctx = instance(mapPersistenceMethods, { hasLoadedOverrides: true, isLiveSyncing: true, liveBaseSnapshotId: 'current', liveOverrideLookup: {} });
  ctx.applyTileOverrides = rows => applied.push(rows);
  const row = (key, owner, snapshot = 'current') => ({ tile_key: key, payload: { owner }, snapshot_id: snapshot });
  ctx.queueLiveTileOverride(row('1,1', 1)); ctx.queueLiveTileOverride(row('1,1', 2)); ctx.queueLiveTileOverride(row('2,1', 3));
  assert.equal(raf.queue.size, 0);
  ctx.isLiveSyncing = false; ctx.scheduleLiveOverridesFlush(); ctx.scheduleLiveOverridesFlush(); assert.equal(raf.queue.size, 1);
  raf.run(); assert.equal(applied.length, 1); assert.deepEqual(applied[0].map(r => r.payload.owner), [2, 3]);
  ctx.snapshotViewId = 'historic'; ctx.queueLiveTileOverride(row('1,1', 4)); ctx.queueLiveTileOverride(row('3,1', 9, 'outdated')); raf.run();
  assert.equal(applied.length, 1); assert.equal(ctx.liveOverrideLookup['1,1'].owner, 4); assert.equal(ctx.liveOverrideLookup['3,1'], undefined);
  ctx.queueLiveTileOverride(row('1,1', 5)); ctx.clearLiveTileOverrides(); assert.equal(raf.queue.size, 0); assert.equal(ctx._pendingLiveOverrides.size, 0);
});

test('switching to a historical snapshot while live data loads never overwrites the displayed snapshot', async () => {
  let resolve;
  const ctx = instance(mapSnapshotsMethods, { liveBaseSnapshotId: 'current' });
  ctx.getSnapshotPayloadById = () => new Promise(done => { resolve = done; });
  ctx.applyLiveBaseSnapshot = () => assert.fail('Historical view must remain unchanged');
  const pending = ctx.ensureLiveBaseSnapshotApplied(); ctx.snapshotViewId = 'historic'; resolve([]); await pending;
  assert.equal(ctx.liveBaseSnapshotAppliedId, undefined);
});
