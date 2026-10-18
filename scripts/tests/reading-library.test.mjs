import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createReadingLibrary, readingStatus, readingTarget, matchesReadingFilter } from '../../src/.vuepress/theme/components/albums/library/readingLibrary.js';
import { archiveControls, archiveQuery, rememberArchive, archiveReturnFor, takeArchiveScroll, carryArchiveReturn } from '../../src/.vuepress/theme/components/albums/library/archiveState.mjs';
import { albumProgressMethods } from '../../src/.vuepress/theme/components/albums/behavior/albumProgress.js';
import { albumAccountMethods } from '../../src/.vuepress/theme/components/albums/behavior/albumAccount.js';

function fakeLibrary(rows = []) {
  const queries = [], writes = []; let authCallback;
  const client = {
    auth: { onAuthStateChange(callback) { authCallback = callback; return { data: { subscription: {} } }; },
      getSession: async () => ({ data: { session: { user: { id: 'reader-a' } } } }) },
    from() {
      const filters = {}; let write;
      const chain = {
        select() { return chain; }, eq(key, value) { filters[key] = value; return chain; }, order() { return chain; },
        range(from, to) { queries.push({ filters, from, to }); return client.read ? client.read(filters, from, to) : Promise.resolve({ data: rows.slice(from, to + 1) }); },
        upsert(row, options) { write = row; writes.push({ row, options }); return chain; },
        single() { return client.write ? client.write(write) : Promise.resolve({ data: { ...rows.find(row => row.page_path === write.page_path), ...write } }); },
      }; return chain;
    },
  };
  const library = createReadingLibrary(() => client);
  return { library, client, queries, writes, session: user => authCallback('SIGNED_IN', user ? { user } : null) };
}
const page = { path: '/albums/s5/Episode34/', frontmatter: { scene_count: 73 } };

test('library status and reading targets keep bookmarks separate from completion and resume', () => {
  assert.equal(readingStatus(null), 'not_started');
  assert.equal(readingStatus({ resume_scene: 24 }), 'in_progress');
  assert.equal(readingStatus({ reading_status: 'finished', resume_scene: 24 }), 'finished');
  assert.equal(readingTarget(page, { reading_status: 'in_progress', resume_scene: 24, bookmark_scene: 10 }).hash, '#scene-24');
  assert.equal(readingTarget(page, { reading_status: 'not_started', bookmark_scene: 10 }).hash, '#scene-1');
  assert.equal(readingTarget(page, { reading_status: 'finished', bookmark_scene: 10 }).hash, '#scene-1');
  assert.equal(readingTarget(page, { resume_scene: 100 }).hash, '#scene-73');
  assert.equal(readingTarget({ ...page, frontmatter: { scene_count: -3 } }, { resume_scene: 24 }).hash, '#scene-24');
  assert.equal(matchesReadingFilter(null, 'unread'), true);
  assert.equal(matchesReadingFilter({ reading_status: 'in_progress' }, 'unread'), true);
  assert.equal(matchesReadingFilter({ reading_status: 'finished' }, 'unread'), false);
});

test('signed-out readers never fetch or save account library data', async () => {
  const h = fakeLibrary(); h.client.auth.getSession = async () => ({ data: { session: null } });
  await h.library.initialize(); await h.library.refresh();
  assert.equal(await h.library.setStatus(page.path, 'finished'), false);
  assert.equal(h.queries.length, 0); assert.equal(h.writes.length, 0); assert.equal(h.library.state.authReady, true);
});

test('library loads all pages for the authenticated owner and discards records on sign out', async () => {
  const rows = Array.from({ length: 1001 }, (_, i) => ({ page_path: `/albums/s5/Episode${i}/`, reading_status: 'in_progress', resume_scene: 3 }));
  const h = fakeLibrary(rows); await h.library.initialize();
  assert.equal(h.queries.length, 2); assert.equal(Object.keys(h.library.state.records).length, 1001);
  assert.ok(h.queries.every(query => query.filters.user_id === 'reader-a'));
  await h.library.setUser(null); assert.deepEqual(h.library.state.records, {}); assert.equal(h.library.state.loaded, false);
});

test('completion and reset persist to the account while preserving bookmark values', async () => {
  const h = fakeLibrary([{ page_path: page.path, bookmark_scene: 10, resume_scene: 24, reading_status: 'in_progress' }]);
  await h.library.initialize();
  assert.equal(await h.library.setStatus(page.path, 'finished'), true);
  assert.equal(h.library.state.records[page.path].reading_status, 'finished');
  assert.equal(h.library.state.records[page.path].bookmark_scene, 10);
  assert.equal(h.writes[0].row.user_id, 'reader-a'); assert.equal(h.writes[0].options.onConflict, 'user_id,page_path');
  assert.equal(await h.library.setStatus(page.path, 'not_started'), true);
  assert.equal(h.writes[1].row.resume_scene, null); assert.equal(h.library.state.records[page.path].bookmark_scene, 10);
  assert.equal(Object.hasOwn(h.writes[1].row, 'bookmark_scene'), false);
});

test('failed completion stays unchanged and offers a retry instead of claiming success', async () => {
  const h = fakeLibrary([{ page_path: page.path, reading_status: 'in_progress' }]); await h.library.initialize();
  h.client.write = async () => ({ error: { code: 'network' } });
  assert.equal(await h.library.setStatus(page.path, 'finished'), false);
  assert.equal(h.library.state.records[page.path].reading_status, 'in_progress');
  assert.match(h.library.state.errors[page.path], /could not be saved/); assert.ok(!h.library.state.pending[page.path]);
  h.client.write = async row => ({ data: row });
  assert.equal(await h.library.setStatus(page.path, 'finished'), true); assert.equal(h.library.state.errors[page.path], undefined);
});

test('pending refresh cannot overwrite a newer completion save', async () => {
  const h = fakeLibrary([{ page_path: page.path, reading_status: 'in_progress' }]); await h.library.initialize();
  let resolveRead; h.client.read = () => new Promise(resolve => { resolveRead = resolve; });
  const pending = h.library.refresh(); await Promise.resolve();
  await h.library.setStatus(page.path, 'finished');
  resolveRead({ data: [{ page_path: page.path, reading_status: 'in_progress' }] }); await pending;
  assert.equal(h.library.state.records[page.path].reading_status, 'finished');
});

test('late progress responses cannot replace a more recently saved status', async () => {
  const h = fakeLibrary(); await h.library.initialize();
  h.library.publish({ page_path: page.path, reading_status: 'finished', updated_at: '2026-10-18T12:00:02Z' }, 'reader-a');
  h.library.publish({ page_path: page.path, reading_status: 'in_progress', updated_at: '2026-10-18T12:00:01Z' }, 'reader-a');
  assert.equal(h.library.state.records[page.path].reading_status, 'finished');
});

test('old account reads and writes never populate a new or signed-out account', async () => {
  const h = fakeLibrary(); await h.library.initialize(); let resolveWrite;
  h.client.write = () => new Promise(resolve => { resolveWrite = resolve; });
  const save = h.library.setStatus(page.path, 'finished'); await h.library.setUser(null);
  resolveWrite({ data: { page_path: page.path, reading_status: 'finished' } });
  assert.equal(await save, false); assert.deepEqual(h.library.state.records, {});
  let resolveRead; h.client.read = () => new Promise(resolve => { resolveRead = resolve; });
  const read = h.library.setUser({ id: 'reader-a' }); await Promise.resolve(); await h.library.setUser(null);
  resolveRead({ data: [{ page_path: page.path, reading_status: 'finished' }] }); await read;
  assert.deepEqual(h.library.state.records, {}); assert.equal(h.library.state.loaded, false);
});

test('library load failure preserves prior records and can be retried', async () => {
  const h = fakeLibrary([{ page_path: page.path, reading_status: 'finished' }]); await h.library.initialize();
  h.client.read = async () => ({ error: { code: 'offline' } }); await h.library.refresh();
  assert.match(h.library.state.error, /could not load/); assert.equal(h.library.state.records[page.path].reading_status, 'finished');
  h.client.read = async () => ({ data: [{ page_path: page.path, reading_status: 'in_progress' }] }); await h.library.refresh();
  assert.equal(h.library.state.error, ''); assert.equal(h.library.state.records[page.path].reading_status, 'in_progress');
});

test('archive controls round trip in the URL and return navigation restores matching scroll once', () => {
  const controls = archiveControls({ q: 'Those Who Remain', sort: 'desc', reading: 'unread' });
  const route = { path: '/albums/', query: { edition: 's5', unrelated: 'keep' } };
  const query = archiveQuery(route, controls, 's5'); assert.deepEqual(archiveControls(query), controls);
  assert.equal(query.unrelated, 'keep');
  rememberArchive(page.path, { ...route, query }, 1200);
  assert.deepEqual(archiveReturnFor(page.path).to.query, query);
  assert.equal(takeArchiveScroll(route), null);
  assert.equal(takeArchiveScroll({ ...route, query }), 1200); assert.equal(takeArchiveScroll({ ...route, query }), null);
  carryArchiveReturn(page.path, '/albums/s5/Episode35/'); assert.deepEqual(archiveReturnFor('/albums/s5/Episode35/').to.query, query);
  assert.equal(archiveControls({ sort: 'invalid', reading: 'invalid', q: ['bad'] }).readingFilter, 'all');
});

test('reading progress continues when a deliberate bookmark exists', t => {
  const previous = globalThis.window; globalThis.window = { dispatchEvent() {} }; t.after(() => { globalThis.window = previous; });
  const ctx = { sceneCount: 73, bookmarkedScene: 10, lastSeenScene: 15, useCloud: true, resumeKey: 'resume',
    setLocalSceneNumber() {}, queueCloudResumeUpdate(value) { assert.equal(value, 24); } };
  albumProgressMethods.saveResumeScene.call(ctx, 24);
  assert.equal(ctx.lastSeenScene, 24); assert.equal(ctx.bookmarkedScene, 10);
});

test('pending progress saves keep their episode identity and failed saves remain retryable', async () => {
  const target = { path: '/albums/s5/Episode33/', userId: 'reader-a', key: 'old-pending-key' };
  let succeeds = false, saves = 0;
  const ctx = { useCloud: true, authUser: { id: 'reader-a' }, $page: { path: page.path }, _pendingResumeTarget: target,
    getSessionSceneNumber(key) { assert.equal(key, 'old-pending-key'); return 20; }, setSessionSceneNumber() {},
    async upsertCloudState(payload, identity) { saves++; assert.equal(identity.path, target.path); assert.equal(payload.resume_scene, 20); return succeeds; } };
  await albumProgressMethods.flushPendingResume.call(ctx); assert.equal(ctx._lastCloudResumeScene, undefined);
  succeeds = true; await albumProgressMethods.flushPendingResume.call(ctx); assert.equal(saves, 2);
  assert.equal(ctx._lastCloudResumeScene, undefined, 'Previous episode must not overwrite current resume state');
});

test('explicit status changes drain older progress saves and cancel queued resume without clearing bookmarks', async t => {
  const previous = globalThis.window; const cancelled = [];
  globalThis.window = { clearTimeout: id => cancelled.push(id) }; t.after(() => { globalThis.window = previous; });
  let complete, drained = false;
  const pending = new Promise(resolve => { complete = resolve; });
  const ctx = { $page: { path: page.path }, authUser: { id: 'reader-a' }, bookmarkedScene: 10, lastSeenScene: 73,
    _resumeSyncTimer: 5, _resumeSaves: new Set([pending]), resumeKey: 'resume',
    _pendingResumeTarget: { key: 'resume:pending' }, resumePendingKey: () => 'resume:pending',
    async flushPendingResume(force) { assert.equal(force, true); drained = true; },
    clearPendingResume: albumProgressMethods.clearPendingResume,
    setSessionSceneNumber(key, value) { assert.equal(key, 'resume:pending'); assert.equal(value, null); },
    setLocalSceneNumber(key, value) { assert.equal(key, 'resume'); assert.equal(value, null); } };
  const reset = albumProgressMethods.prepareReadingStatusChange.call(ctx, 'not_started');
  await Promise.resolve(); assert.equal(drained, false);
  complete(); await reset;
  assert.equal(drained, true); assert.deepEqual(cancelled, [5]);
  assert.equal(ctx._pendingResumeTarget, null); assert.equal(ctx.bookmarkedScene, 10); assert.equal(ctx.lastSeenScene, 73);
});

test('an old episode cloud load cannot overwrite the currently open episode', async () => {
  let finish;
  const chain = { select() { return chain; }, eq() { return chain; }, maybeSingle() { return new Promise(resolve => { finish = resolve; }); } };
  const ctx = { useCloud: true, authUser: { id: 'reader-a' }, $page: { path: page.path },
    supabase: { from: () => chain }, getLocalSceneNumber: () => null, bookmarkedScene: 2, lastSeenScene: 5,
    loadBookmarkLocal() { assert.fail('Stale load must not fall back into a new page'); } };
  const load = albumProgressMethods.loadCloudState.call(ctx);
  ctx.$page = { path: '/albums/s5/Episode35/' };
  finish({ data: { bookmark_scene: 10, resume_scene: 24 } }); await load;
  assert.equal(ctx.bookmarkedScene, 2); assert.equal(ctx.lastSeenScene, 5);
});

test('concurrent first progress save retries a duplicate insert without overwriting reading status', async () => {
  let updates = 0; const payloads = [];
  const chain = { update(row) { updates++; payloads.push(row); return chain; }, eq() { return chain; }, select() { return chain; },
    limit: async () => ({ data: [] }), insert() { return { select: () => ({ single: async () => ({ error: { code: '23505' } }) }) }; },
    single: async () => ({ data: { page_path: page.path, reading_status: 'finished', resume_scene: 24 } }) };
  const ctx = { useCloud: true, authUser: { id: 'reader-a' }, $page: page, supabase: { from: () => chain } };
  assert.equal(await albumProgressMethods.upsertCloudState.call(ctx, { resume_scene: 24 }), true);
  assert.equal(updates, 2); assert.ok(payloads.every(row => !Object.hasOwn(row, 'reading_status')));
});

test('switching accounts clears queued progress and prior account resume before loading the new account', () => {
  let cleared = false, loaded = false;
  const ctx = { authUser: { id: 'reader-a' }, bookmarkedScene: 10, lastSeenScene: 24, _lastCloudResumeScene: 24,
    clearPendingResume() { cleared = true; }, loadReactionCounts() {}, fetchProfile() {},
    loadCloudState() {
      loaded = true; assert.equal(this.authUser.id, 'reader-b');
      assert.equal(this.bookmarkedScene, null); assert.equal(this.lastSeenScene, null);
    } };
  albumAccountMethods.handleAuthSession.call(ctx, { user: { id: 'reader-b' } });
  assert.equal(cleared, true); assert.equal(loaded, true); assert.equal(ctx._lastCloudResumeScene, null);
});
