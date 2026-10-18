import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SEARCH_CATEGORIES, filterPaletteResults, matchesSearchCategory, usesSceneSearch,
  paletteEmptyState, paletteFilterComputed, paletteFilterMethods } from '../../src/.vuepress/theme/components/nav/search/paletteFilters.mjs';

function instance(state = {}) {
  const context = { ...state };
  for (const [key, method] of Object.entries(paletteFilterMethods)) context[key] = method.bind(context);
  for (const [key, get] of Object.entries(paletteFilterComputed)) Object.defineProperty(context, key, { get: get.bind(context) });
  return context;
}

test('categories filter before the result cap and keep existing ranking order', () => {
  const scenes = Array.from({ length: 90 }, (_, i) => ({ id: `scene-${i}`, type: 'scene' }));
  const episodes = Array.from({ length: 60 }, (_, i) => ({ id: `episode-${i}`, type: 'episode' }));
  const items = [...scenes, ...episodes, { id: 'civ', type: 'competitor' }];
  assert.deepEqual(filterPaletteResults(items, 'all', 40), scenes.slice(0, 40));
  assert.deepEqual(filterPaletteResults(items, 'episodes', 40), episodes.slice(0, 40));
  assert.deepEqual(filterPaletteResults(items, 'competitors', 40), [{ id: 'civ', type: 'competitor' }]);
  assert.equal(filterPaletteResults(items, 'map', 40).length, 0);
  assert.deepEqual(SEARCH_CATEGORIES.map(item => item.label), ['All', 'Episodes', 'Scenes', 'Competitors', 'Map']);
});

test('Map covers every map destination while competitor and scene results stay separate', () => {
  for (const type of ['map', 'mapCity', 'mapOwner', 'mapTile', 'mapSnapshot', 'mapPin']) {
    assert.equal(matchesSearchCategory({ type }, 'map'), true, type);
    assert.equal(matchesSearchCategory({ type }, 'competitors'), false, type);
    assert.equal(matchesSearchCategory({ type }, 'scenes'), false, type);
  }
  assert.equal(matchesSearchCategory({ type: 'competitor' }, 'map'), false);
  assert.equal(matchesSearchCategory({ type: 'scene' }, 'episodes'), false);
});

test('empty states offer category recovery and snapshot clearing only when the scope applies', () => {
  assert.equal(paletteEmptyState('missing', 'map', true).clearScope, true);
  assert.equal(paletteEmptyState('missing', 'all', true).clearScope, true);
  for (const category of ['episodes', 'scenes', 'competitors']) {
    const state = paletteEmptyState('missing', category, true);
    assert.equal(state.showAll, true); assert.equal(state.clearScope, false); assert.equal(state.clearQuery, true);
  }
  const all = paletteEmptyState('missing', 'all', false);
  assert.equal(all.showAll, false); assert.match(all.hint, /different spelling/);
  const scenes = paletteEmptyState('', 'scenes', true);
  assert.equal(scenes.title, 'Search scene titles'); assert.equal(scenes.clearQuery, false);
  assert.match(paletteEmptyState('missing', 'scenes', false, true).title, /could not finish/);
});

test('changing categories keeps the query and resets navigation; clearing query returns focus', () => {
  let focused = false;
  const context = instance({ query: 'Babylon', activeCategory: 'all', activeIndex: 25,
    $nextTick: callback => callback(), $refs: { searchInput: { focus() { focused = true; } } } });
  context.setSearchCategory('map');
  assert.equal(context.query, 'Babylon'); assert.equal(context.activeCategory, 'map'); assert.equal(context.activeIndex, 0);
  context.setSearchCategory('invalid'); assert.equal(context.activeCategory, 'map');
  context.clearSearchQuery(); assert.equal(context.query, ''); assert.equal(context.activeCategory, 'map'); assert.equal(focused, true);
});

test('episode, competitor and map filters cancel scene work and show no scene loading state', () => {
  let cancellations = 0;
  const context = instance({ isOpen: true, query: 'Babylon', sceneResults: ['old'], sceneResultsQuery: 'old',
    sceneSearchLoading: true, snapshotScope: { mode: 'live' },
    _sceneSearchClient: { cancel() { cancellations++; }, search() { assert.fail('Do not search scenes'); } } });
  for (const activeCategory of ['episodes', 'competitors', 'map']) {
    context.activeCategory = activeCategory;
    context.searchScenes();
    assert.equal(context.searchPending, false); assert.equal(context.sceneResultsQuery, ''); assert.deepEqual(context.sceneResults, []);
  }
  assert.equal(cancellations, 3);
});

test('only All and Scenes request scene matches and cached responses can be retried explicitly', t => {
  const original = globalThis.window;
  globalThis.window = { location: { href: 'https://civbattleroyale.tv/' } };
  t.after(() => { globalThis.window = original; });
  const requests = [];
  const context = instance({ isOpen: true, query: ' Corpse  Voyage ', sceneResultsQuery: '', activeCategory: 'all',
    $withBase: path => path, _sceneSearchClient: { search: (...args) => requests.push(args), cancel() {} } });
  context.searchScenes();
  assert.equal(requests.length, 1); assert.equal(requests[0][0], 'corpse voyage');
  context.sceneResults = ['matching scene']; context.sceneResultsQuery = 'corpse voyage';
  context.activeCategory = 'scenes'; context.searchScenes();
  assert.equal(requests.length, 1); assert.deepEqual(context.sceneResults, ['matching scene']);
  context.searchScenes(true); assert.equal(requests.length, 2);
  assert.deepEqual(SEARCH_CATEGORIES.filter(item => usesSceneSearch(item.id)).map(item => item.id), ['all', 'scenes']);
});

test('snapshot loading suppresses premature map emptiness but does not block other categories', () => {
  const context = instance({ activeCategory: 'map', snapshotScope: { mode: 'snapshot', id: 's5-episode-34' }, snapshotIndexLoading: true,
    sceneSearchLoading: false, query: 'missing' });
  assert.equal(context.searchPending, true); assert.equal(context.canClearSnapshotScope, true);
  context.activeCategory = 'episodes'; assert.equal(context.searchPending, false); assert.equal(context.canClearSnapshotScope, false);
});

test('Enter on filters, empty-state actions and result buttons uses their native action', () => {
  const input = {}, context = instance({ $refs: { searchInput: input }, results: [{ id: 'correct-result' }], activeIndex: 0 });
  let activations = 0, prevented = 0, movement = 0;
  context.activateItem = item => { assert.equal(item.id, 'correct-result'); activations++; };
  context.moveActiveIndex = delta => { movement += delta; };
  const event = { key: 'Enter', target: {}, preventDefault() { prevented++; } };
  context.handleSearchKey(event); assert.equal(activations, 0); assert.equal(prevented, 0);
  context.handleSearchKey({ ...event, target: input }); assert.equal(activations, 1); assert.equal(prevented, 1);
  context.handleSearchKey({ ...event, target: input, isComposing: true }); assert.equal(activations, 1);
  context.handleSearchKey({ ...event, key: 'ArrowDown', target: input }); assert.equal(movement, 1);
  context.handleSearchKey({ ...event, key: 'ArrowUp', target: input }); assert.equal(movement, 0);
  context.results = []; context.handleSearchKey({ ...event, target: input }); assert.equal(activations, 1);
});
