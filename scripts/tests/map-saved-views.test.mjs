import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeMapViewSettings, mapViewSettingsFromQuery, mapViewSettingsQuery, savedViewCanChange } from '../../src/.vuepress/theme/components/community/map/savedViewSettings.mjs';
import { mapOverlaysComputed } from '../../src/.vuepress/theme/components/community/map/mapOverlays.js';
import { mapContrastMethods } from '../../src/.vuepress/theme/components/community/map/mapContrast.js';
import { mapSavedViewsMethods } from '../../src/.vuepress/theme/components/community/map/mapSavedViews.js';
import { mapNavigationMethods } from '../../src/.vuepress/theme/components/community/map/mapNavigation.js';
import { listSavedViews, saveMapView, setSavedViewFollow } from '../../src/.vuepress/theme/components/community/map/savedViewsApi.mjs';

const settings = { version: 1, x: 500, y: 300, zoom: 1.5, overlay: 'civilization', owner: 'Japan', contrast: '10010', tile: '3,4', snapshot: '', compare: '' };
const id = '00000000-0000-4000-8000-000000000091';

test('saved settings round trip without storing map payloads or editing state', () => {
  const input = { ...settings, payload: [{ private: true }], localEdits: true };
  assert.deepEqual(normalizeMapViewSettings(input), settings);
  assert.deepEqual(mapViewSettingsFromQuery(mapViewSettingsQuery(settings)), settings);
  const pinned = { ...settings, snapshot: 's5-episode-34', compare: 's5-episode-33' };
  assert.deepEqual(mapViewSettingsFromQuery(mapViewSettingsQuery(pinned)), pinned);
});

test('saved settings reject malformed types, unsupported versions and unsafe configuration', () => {
  for (const patch of [{ version: 2 }, { x: Infinity }, { x: '50' }, { zoom: 0 }, { zoom: 1e9 }, { overlay: 'brush' }, { contrast: '12345' }, { owner: 'x'.repeat(121) }, { tile: '3,<script>' }, { compare: '__live__' }]) {
    assert.equal(normalizeMapViewSettings({ ...settings, ...patch }), null, JSON.stringify(patch));
  }
  assert.equal(normalizeMapViewSettings(null), null);
  assert.equal(mapViewSettingsFromQuery({ view: ['1,2,3'] }), null);
});

test('saved-view permissions do not depend on whether a snapshot can be edited', () => {
  const access = { signedIn: true, allowed: true, checking: false, failed: false, local: false, loading: false };
  assert.equal(savedViewCanChange(access), true);
  for (const patch of [{ signedIn: false }, { allowed: false }, { checking: true }, { failed: true }, { local: true }, { loading: true }]) assert.equal(savedViewCanChange({ ...access, ...patch }), false);
});

test('overlays stay active while readers browse snapshots, views and tile details', () => {
  for (const editPanelTab of ['overlays', 'snapshots', 'edit', 'notes']) {
    assert.equal(mapOverlaysComputed.isOverlayTabActive.call({ overlayEnabled: true, editPanelTab }), true);
  }
  assert.equal(mapOverlaysComputed.isOverlayTabActive.call({ overlayEnabled: false, editPanelTab: 'overlays' }), false);
});

test('applying shared contrast changes suppresses persistence and supersedes pending preferences', () => {
  let complete;
  const context = { _contrastEditVersion: 4, $nextTick: fn => { complete = fn; },
    writeLocalContrastSettingsForCurrentUser() { assert.fail('Shared settings must not overwrite preferences'); },
    queueContrastSettingsCloudSave() { assert.fail('Shared settings must not overwrite cloud preferences'); } };
  mapContrastMethods.applyContrastSettings.call(context, { contrastHideDecorations: true });
  assert.equal(context._contrastEditVersion, 5);
  assert.equal(context.contrastHideDecorations, true);
  assert.equal(mapContrastMethods.persistContrastSettingsForCurrentUser.call(context), false);
  complete(); assert.equal(context.contrastSettingsLoading, false);
});

test('gallery pagination is bounded and title/creator search uses the safe RPC', async () => {
  let request;
  const client = { rpc: async (name, args) => { request = { name, args }; return { data: [] }; } };
  assert.deepEqual(await listSavedViews(client, { mapId: 's5', section: 'following', search: ' Japan ', offset: 20 }), []);
  assert.equal(request.name, 'list_map_saved_views');
  assert.deepEqual(request.args, { p_map_id: 's5', p_section: 'following', p_search: 'Japan', p_offset: 20 });
});

test('saving only sends validated view metadata with the authenticated owner', async () => {
  let table, payload;
  const client = { from(name) { table = name; return { insert(value) { payload = value; return { select() { return { single: async () => ({ data: { id } }) }; } }; } }; } };
  await saveMapView(client, 'owner', 's5', { title: ' Japan ', description: ' A front ', visibility: 'private', settings });
  assert.equal(table, 'map_saved_views'); assert.equal(payload.user_id, 'owner'); assert.equal(payload.title, 'Japan'); assert.deepEqual(payload.settings, settings);
  await assert.rejects(saveMapView(client, 'owner', 's5', { title: '', visibility: 'public', settings }));
  await assert.rejects(saveMapView(client, null, 's5', { title: 'Japan', visibility: 'public', settings }));
});

test('follow is idempotent, free-account owned and a database failure is surfaced for rollback', async () => {
  let inserted;
  const client = { from() { return { upsert: async (row, options) => { inserted = { row, options }; return {}; } }; } };
  await setSavedViewFollow(client, 'free-account', id, true);
  assert.deepEqual(inserted, { row: { user_id: 'free-account', view_id: id }, options: { onConflict: 'user_id,view_id', ignoreDuplicates: true } });
  await assert.rejects(setSavedViewFollow(client, null, id, true), /Sign in/);
  client.from = () => ({ upsert: async () => ({ error: { code: '42501' } }) });
  await assert.rejects(setSavedViewFollow(client, 'free-account', id, true));
});

function routeContext(rpc) {
  const context = { $route: { query: { saved_view: id } }, authUser: null, _routeViewRequestId: 1,
    tiles: [{}], gridWidth: 100, gridHeight: 100, snapshots: [], supabase: { rpc },
    applyMapViewSettings(value) { this.applied = value; }, ensureSnapshotSelection: async () => true,
  };
  return context;
}

test('saved route takes precedence over all ordinary map focus parameters', async () => {
  let applied = false;
  await mapNavigationMethods.applyRequestedTileFromRoute.call({ $route: { path: '/community-tile-map/', query: { saved_view: id, view: '1,2,3', tile: '5,5' } },
    applySavedMapViewFromRoute: async () => { applied = true; }, resolveRouteSnapshotId() { assert.fail('Saved view has precedence'); } });
  assert.equal(applied, true);
});

test('opening a saved view rejects unavailable records without substituting a live view', async () => {
  const context = routeContext(async () => ({ data: [] }));
  await mapSavedViewsMethods.applySavedMapViewFromRoute.call(context, 1);
  assert.match(context.savedViewError, /unavailable/); assert.equal(context.applied, undefined); assert.equal(context.activeSavedView, null);
});

test('stale saved-view responses cannot move the map after another route or account is selected', async () => {
  let resolve;
  const context = routeContext(() => new Promise(done => { resolve = done; }));
  const pending = mapSavedViewsMethods.applySavedMapViewFromRoute.call(context, 1);
  context._routeViewRequestId = 2;
  resolve({ data: [{ id, map_id: 's5', settings }] }); await pending;
  assert.equal(context.applied, undefined);
  context._savedViewFetchKey = null; context._routeViewRequestId = 3;
  const next = mapSavedViewsMethods.applySavedMapViewFromRoute.call(context, 3);
  context.authUser = { id: 'another-account' }; resolve({ data: [{ id, map_id: 's5', settings }] }); await next;
  assert.equal(context.applied, undefined);
});

test('opening live views keeps only framing settings and rejects invalid IDs before fetching', async () => {
  const context = routeContext(async () => ({ data: [{ id, map_id: 's5', settings }] }));
  await mapSavedViewsMethods.applySavedMapViewFromRoute.call(context, 1);
  assert.deepEqual(context.applied, settings); assert.equal(context.activeSavedView.id, id);
  context.$route.query.saved_view = 'invalid'; context.supabase.rpc = () => assert.fail('Invalid IDs must not query');
  await mapSavedViewsMethods.applySavedMapViewFromRoute.call(context, 1);
  assert.match(context.savedViewError, /not valid/);
});

test('pinned views validate both published sources before changing the displayed map', async () => {
  const pinned = { ...settings, snapshot: 's5-episode-34', compare: 's5-episode-33' };
  const context = routeContext(async () => ({ data: [{ id, map_id: 's5', settings: pinned }] }));
  context.snapshots = [{ id: pinned.snapshot, is_published: true }, { id: pinned.compare, is_published: true }];
  context.loadSnapshots = async () => {};
  context.getSnapshotPayloadById = async source => source === pinned.snapshot ? [{}] : null;
  context.ensureSnapshotSelection = () => assert.fail('Unavailable comparison must not switch the map');
  await mapSavedViewsMethods.applySavedMapViewFromRoute.call(context, 1);
  assert.match(context.savedViewError, /snapshot.*unavailable/);
  assert.equal(context.applied, undefined);
  context.getSnapshotPayloadById = async () => [{}];
  context.ensureSnapshotSelection = async value => { context.snapshotViewId = value; return true; };
  context.applySnapshotView = async () => {};
  await mapSavedViewsMethods.applySavedMapViewFromRoute.call(context, 1);
  assert.equal(context.snapshotViewId, pinned.snapshot);
  assert.deepEqual(context.applied, pinned);
});

test('a stale snapshot response cannot switch the source after the reader moves elsewhere', async () => {
  const pinned = { ...settings, snapshot: 's5-episode-34' };
  const context = routeContext(async () => ({ data: [{ id, map_id: 's5', settings: pinned }] }));
  let finish;
  context.snapshots = [{ id: pinned.snapshot, is_published: true }];
  context.loadSnapshots = async () => {};
  context.getSnapshotPayloadById = () => new Promise(resolve => { finish = resolve; });
  context.ensureSnapshotSelection = () => assert.fail('Stale source must not change the map');
  const pending = mapSavedViewsMethods.applySavedMapViewFromRoute.call(context, 1);
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  context._routeViewRequestId++;
  finish([{}]); await pending;
  assert.equal(context.applied, undefined);
});
