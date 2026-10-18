import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSceneSearchClient } from '../../src/.vuepress/theme/components/nav/search/sceneSearchClient.mjs';
import { normalizeText, compareSearchResults, sceneSearchPayload, createSceneSearchItems,
  searchSceneItems, createSceneSearchHandler } from '../../src/.vuepress/theme/components/nav/search/sceneSearch.mjs';

const albums = [{ path: '/albums/s5/Episode34/', title: 'Those Who Remain',
  subtitle: 'S5 · 2026-10-13 · Cocaloid', sortDate: 34,
  scenes: [{ number: 1, title: '<b>Corpse</b> Voyage', previewUrl: 'https://example.com/large.jpg' },
    { number: 2, title: '2' }, { number: 'bad', title: '' }, { number: 4, title: 'A Worldwide War' }] },
  { path: '/albums/pr/s5pr33/', title: 'Power Rankings', subtitle: 'S5', sortDate: 33,
    scenes: [{ number: 1, title: 'A Worldwide War' }] }];
const payload = () => sceneSearchPayload(albums);

// Reference the original full-scan/full-sort ranking independently of the new bounded selector.
function legacyRank(items, query, limit = 40) {
  const normalized = normalizeText(query);
  if (!normalized) return [];
  const terms = normalized.split(' ');
  return items.flatMap(item => {
    let score = 0;
    if (item.searchText.startsWith(normalized)) score += 120;
    else if (item.searchText.includes(normalized)) score += 60;
    let matched = 0;
    for (const term of terms) if (item.searchText.includes(term)) { matched++; score += 25; }
    if (matched !== terms.length || !score) return [];
    const { searchText, ...result } = item;
    return [{ ...result, score: score + 10 }];
  }).sort(compareSearchResults).slice(0, limit);
}

test('compact search payload omits image URLs and preserves scene labels and deep links', () => {
  const data = payload();
  assert.equal(JSON.stringify(data).includes('large.jpg'), false);
  const items = createSceneSearchItems(data);
  assert.equal(items.length, 5);
  assert.equal(items[0].title, 'Those Who Remain · Scene 1: Corpse Voyage');
  assert.equal(items[0].path, '/albums/s5/Episode34/#scene-1');
  assert.equal(items[1].title, 'Those Who Remain · Scene 2');
  assert.equal(items[2].path, '/albums/s5/Episode34/#scene-3');
  assert.throws(() => createSceneSearchItems({ version: 99, albums: [] }));
});

test('worker scene ranking preserves substring, multi-term, metadata and date ordering', () => {
  const items = createSceneSearchItems(payload());
  // Plenty of matches exercise the bounded result selector and stable ties.
  for (let i = 0; i < 110; i++) items.push({ ...items[i % 5], id: `extra-${i}`, sortDate: i % 20 });
  for (const query of ['', '  CORP  ', 'corpse cocaloid', 'remain', 'world', 'wide war', 'war', 's5', 'scene 2', '2026-10', 'not-found']) {
    assert.deepEqual(searchSceneItems(items, query), legacyRank(items, query), query);
  }
  assert.equal(searchSceneItems(items, 'war', 0).length, 0);
  const sceneMatches = searchSceneItems(items, 'war');
  const localMatches = [{ id: 'episode', title: 'War', type: 'episode', score: 90, sortDate: 50 }];
  const expected = [...localMatches, ...legacyRank(items, 'war', 1000)].sort(compareSearchResults).slice(0, 40);
  assert.deepEqual([...localMatches, ...sceneMatches].sort(compareSearchResults).slice(0, 40), expected);
});

test('worker shares one pending index load and replies only to the newest query', async () => {
  const results = [];
  let resolve, loads = 0;
  const handler = createSceneSearchHandler({ fetchIndex: () => { loads++; return new Promise(done => { resolve = done; }); },
    respond: result => results.push(result) });
  const old = handler({ id: 1, query: 'corp', manifestUrl: 'manifest' });
  const latest = handler({ id: 2, query: 'war', manifestUrl: 'manifest' });
  resolve(payload());
  await Promise.all([old, latest]);
  assert.equal(loads, 1);
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 2);
  assert.equal(results[0].results.length, 2);
  await handler({ id: 3, query: 'cocaloid' });
  assert.equal(loads, 1);
  assert.equal(results[1].results.length, 4);
});

test('worker can retry a failed index download', async () => {
  let fail = true, response;
  const handler = createSceneSearchHandler({ fetchIndex: async () => { if (fail) throw new Error('Offline'); return payload(); },
    respond: result => { response = result; } });
  await handler({ id: 1, query: 'war' });
  assert.equal(response.error, true);
  fail = false;
  await handler({ id: 2, query: 'war' });
  assert.equal(response.results.length, 2);
});

function clientHarness() {
  let timerId = 0;
  const timers = new Map(), workers = [], results = [], states = [];
  const client = createSceneSearchClient({
    setTimer(fn, delay) { assert.equal(delay, 150); timers.set(++timerId, fn); return timerId; },
    clearTimer: id => timers.delete(id),
    createWorker() {
      const worker = { messages: [], terminated: false, postMessage(message) { this.messages.push(message); },
        terminate() { this.terminated = true; } };
      workers.push(worker); return worker;
    },
    onResults: (items, query) => results.push({ items, query }), onState: state => states.push(state),
  });
  function flush() { for (const [id, fn] of timers) { timers.delete(id); fn(); } }
  return { client, timers, workers, results, states, flush };
}

test('search client stays lazy, debounces typing and rejects stale worker results', () => {
  const h = clientHarness();
  h.client.search('', 'manifest');
  assert.equal(h.workers.length, 0);
  h.client.search('c', 'manifest');
  h.client.search('co', 'manifest');
  assert.equal(h.timers.size, 1);
  assert.equal(h.workers.length, 0);
  h.flush();
  const worker = h.workers[0], first = worker.messages[0];
  assert.equal(first.query, 'co');
  h.client.search('corp', 'manifest');
  worker.onmessage({ data: { id: first.id, query: 'co', results: ['old'] } });
  assert.equal(h.results.length, 0);
  h.flush();
  const second = worker.messages[1];
  worker.onmessage({ data: { ...second, results: ['new'] } });
  assert.deepEqual(h.results, [{ items: ['new'], query: 'corp' }]);
  assert.equal(h.workers.length, 1);
  assert.equal(h.states.at(-1).loading, false);
});

test('closing or unmounting search cancels timers and ignores outstanding responses', () => {
  const h = clientHarness();
  h.client.search('war', 'manifest');
  h.client.cancel(); h.flush();
  assert.equal(h.workers.length, 0);
  h.client.search('war', 'manifest'); h.flush();
  const worker = h.workers[0], message = worker.messages[0], deliver = worker.onmessage;
  h.client.cancel();
  deliver({ data: { ...message, results: ['stale'] } });
  assert.equal(h.results.length, 0);
  h.client.dispose();
  assert.equal(worker.terminated, true);
  assert.equal(worker.onmessage, null);
  deliver({ data: { ...message, results: ['stale'] } });
  h.client.search('war', 'manifest'); h.flush();
  assert.equal(h.workers.length, 1);
  assert.equal(h.results.length, 0);
});

test('worker errors retain local search and a later query starts a fresh worker', () => {
  const h = clientHarness();
  h.client.search('war', 'manifest'); h.flush();
  const worker = h.workers[0];
  worker.onerror(new Error('Unavailable'));
  assert.equal(worker.terminated, true);
  assert.equal(h.states.at(-1).error, true);
  h.client.search('corp', 'manifest'); h.flush();
  assert.equal(h.workers.length, 2);
  const next = h.workers[1], message = next.messages[0];
  next.onmessage({ data: { ...message, results: [] } });
  assert.equal(h.states.at(-1).error, false);
});
