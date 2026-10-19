import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildEpisodes, readFilters, episodeOptions, eligibleEpisodes, buildDiscovery, buildFavourites, validatePicks } from '../../src/.vuepress/theme/components/spotlight/spotlightModel.mjs';
import { fetchReactionRows, readCache, writeCache, cacheKey } from '../../src/.vuepress/theme/components/spotlight/spotlightData.mjs';

const album = (number, season = 's5') => ({ path: `/albums/${season}/Episode${number}/`, title: `Episode ${number}: A moment`, date: `2026-01-${String(number).padStart(2, '0')}`, scenes: [1, 2, 3].map(number => ({ number, title: `Scene title ${number}`, previewUrl: `scene${number}.jpg` })) });
const albums = [album(1), album(2), album(3), album(1, 's4')];
const episodes = buildEpisodes(albums, albums, Date.parse('2026-02-01'));
const row = (episode, scene, reaction, count = 1) => ({ page_path: `/albums/s5/Episode${episode}/`, scene_number: scene, reaction_key: reaction, reaction_count: count });
const rows = [row(3, 2, 'heart', 3), row(3, 1, 'star', 3), row(3, 1, 'laugh', 2), row(2, 1, 'mindblown', 20), row(2, 2, 'facepalm', 2), row(1, 1, 'tears', 1), row(1, 1, 'rip', 2), row(1, 3, 'laugh', 1)];
const scope = (through = 'all') => eligibleEpisodes(episodes, { season: 's5', through });

test('Spotlight excludes unreleased, excluded and ranking pages from episode controls', () => {
  const extra = [ { ...album(4), date: '2027-01-01' }, { ...album(5), exclude: true }, { ...album(6), pr: true } ];
  const result = buildEpisodes([...albums, ...extra], [...albums, ...extra], Date.parse('2026-02-01'));
  assert.equal(result.length, 4);
  assert.deepEqual(scope().map(e => e.number), [3, 2, 1]);
});

test('Spotlight balances episodes in rounds and removes the featured duplicate', () => {
  const result = buildDiscovery(scope(), rows);
  assert.equal(result.featured.id, '/albums/s5/Episode3/#scene-1');
  assert.deepEqual(result.gallery.map(s => [s.episodeNumber, s.sceneNumber]), [[2, 1], [1, 1], [3, 2], [2, 2], [1, 3]]);
  assert.equal(new Set([result.featured.id, ...result.gallery.map(s => s.id)]).size, 6);
  assert.equal(result.featured.reactions.star, 3);
});

test('mood categories score matching reactions and combine heartbreak reactions', () => {
  assert.equal(buildDiscovery(scope(), rows, 'surprises').featured.episodeNumber, 2);
  assert.equal(buildDiscovery(scope(), rows, 'facepalms').featured.sceneNumber, 2);
  assert.equal(buildDiscovery(scope(), rows, 'heartbreak').featured.score, 3);
  assert.equal(buildDiscovery(scope(), rows, 'favourites').featured.score, 3);
  assert.equal(buildDiscovery(scope('1'), rows, 'surprises').featured, null);
});

test('spoiler limits exclude future titles, images and editorial picks', () => {
  const result = buildDiscovery(scope('2'), rows, 'all', { path: '/albums/s5/Episode3/', scene: 1 });
  assert.equal(result.featured.episodeNumber, 2);
  assert.ok(result.gallery.every(s => s.episodeNumber <= 2));
  assert.equal(result.featured.editorial, undefined);
  assert.equal(JSON.stringify(result).includes('Episode3'), false);
});

test('editorial picks may lack reactions but must match an active mood', () => {
  const pick = { path: '/albums/s5/Episode2/', scene: 3 };
  assert.equal(buildDiscovery(scope(), rows, 'all', pick).featured.editorial, true);
  assert.equal(buildDiscovery(scope(), rows, 'surprises', pick).featured.sceneNumber, 1);
  const reacted = buildDiscovery(scope(), rows, 'surprises', { ...pick, scene: 1 });
  assert.equal(reacted.featured.editorial, true);
  assert.ok(!reacted.gallery.some(s => s.id === reacted.featured.id));
});

test('favourites merge stars and hearts, preserve badges and honour episode scope', () => {
  const personal = [row(3, 1, 'star'), row(3, 1, 'heart'), row(2, 2, 'Heart'), row(2, 1, 'laugh')];
  const cards = buildFavourites(scope(), personal);
  assert.equal(cards.length, 2);
  assert.deepEqual(cards[0].reactions, { star: 1, heart: 1 });
  assert.equal(cards[0].personal, true);
  assert.deepEqual(buildFavourites(scope('2'), personal).map(s => s.episodeNumber), [2]);
});

test('URL state restores all filters and safely defaults unknown parameters', () => {
  assert.deepEqual(readFilters({ season: 's5', through: '2', mood: 'funny', view: 'favourites' }, episodes), { season: 's5', through: '2', mood: 'funny', tab: 'favourites' });
  assert.deepEqual(readFilters({ season: 's900', through: '999', mood: 'invalid', view: 'invalid' }, episodes), { season: 's5', through: 'all', mood: 'all', tab: 'discover' });
  assert.equal(readFilters({ season: 's4', through: '2' }, episodes).through, 'all');
});

test('missing scenes and invalid reaction counts cannot create gallery cards', () => {
  const result = buildDiscovery(scope(), [row(3, 999, 'star'), row(3, 1, 'star', -1), row(2, 1, 'star', 'invalid')]);
  assert.equal(result.featured, null);
  assert.deepEqual(result.gallery, []);
  assert.equal(buildDiscovery(scope(), [{ page_path: '/albums/s5/Episode3.html', scene_number: 2, reaction_key: 'Face-Palm' }], 'facepalms').featured.sceneNumber, 2);
});

test('invalid editorial references fail validation while empty configuration is valid', () => {
  assert.doesNotThrow(() => validatePicks({}, albums));
  assert.doesNotThrow(() => validatePicks({ s5: { path: albums[0].path, scene: 2 } }, albums));
  for (const picks of [{ s5: { path: albums[0].path, scene: 999 } }, { s4: { path: albums[0].path, scene: 1 } }, { s5: { path: '/missing/', scene: 1 } }]) assert.throws(() => validatePicks(picks, albums), /Invalid Spotlight pick/);
});

function clientFor(respond) {
  const requests = [];
  return { requests, from(table) {
    const request = { table, filters: [], orders: [] }; requests.push(request);
    const query = {
      select(fields) { request.fields = fields; return query; },
      ilike(...args) { request.filters.push(['ilike', ...args]); return query; },
      eq(...args) { request.filters.push(['eq', ...args]); return query; },
      order(field) { request.orders.push(field); return query; },
      range(from, to) { request.range = [from, to]; return Promise.resolve(respond(request)); },
    }; return query;
  } };
}

test('reaction requests paginate deterministically and are scoped to a season', async () => {
  const client = clientFor(request => ({ data: request.range[0] === 0 ? Array(1000).fill(rows[0]) : [rows[1]] }));
  assert.equal((await fetchReactionRows(client, 's5')).length, 1001);
  assert.deepEqual(client.requests.map(r => r.range), [[0, 999], [1000, 1999]]);
  for (const request of client.requests) {
    assert.deepEqual(request.filters, [['ilike', 'page_path', '/albums/s5/%']]);
    assert.deepEqual(request.orders, ['page_path', 'scene_number', 'reaction_key']);
  }
});

test('favourites requests include account scope and never fall back to public rows', async () => {
  const client = clientFor(() => ({ error: { code: 'PGRST205' } }));
  await assert.rejects(fetchReactionRows(client, 's4', { userId: 'reader-a', table: 'album_reactions' }));
  assert.equal(client.requests.length, 1);
  assert.deepEqual(client.requests[0].filters, [['ilike', 'page_path', '/albums/s4/%'], ['eq', 'user_id', 'reader-a']]);
});

test('only a missing aggregate uses the legacy fallback; connection errors remain visible', async () => {
  const client = clientFor(request => request.table === 'album_reaction_spotlight' ? { error: { code: '42P01' } } : { data: rows });
  assert.equal((await fetchReactionRows(client, 's5')).length, rows.length);
  assert.equal(client.requests[1].table, 'album_reactions');
  const failed = clientFor(() => ({ error: { code: 'NETWORK' } }));
  await assert.rejects(fetchReactionRows(failed, 's5'));
  assert.equal(failed.requests.length, 1);
});

test('season caches survive stale timestamps and storage failures without mixing seasons', () => {
  const data = new Map(); const storage = { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) };
  writeCache(storage, 's5', rows, 10);
  assert.deepEqual(readCache(storage, 's5'), { rows, time: 10 });
  assert.equal(readCache(storage, 's4'), null);
  data.set(cacheKey('s5'), 'broken'); assert.equal(readCache(storage, 's5'), null);
  assert.equal(readCache(undefined, 's5'), null);
  assert.doesNotThrow(() => writeCache(undefined, 's5', rows, 10));
});


test('split episodes share a spoiler option and a gallery round; decimal specials retain their number', () => {
  const split = [
    { ...album(2), path: '/albums/s5/Episode2part1/' },
    { ...album(2), path: '/albums/s5/Episode2part2/' },
    { ...album(3), path: '/albums/s5/Episode2.5/' },
    album(1),
  ];
  const all = buildEpisodes(split, split, Date.parse('2026-02-01'));
  assert.deepEqual(episodeOptions(all, 's5').map(e => e.number), [2.5, 2, 1]);
  const eligible = eligibleEpisodes(all, { season: 's5', through: '2' });
  assert.equal(eligible.length, 3);
  const votes = eligible.map(e => ({ page_path: e.path, scene_number: 1, reaction_key: 'star' }));
  const result = buildDiscovery(eligible, votes);
  assert.deepEqual([result.featured, ...result.gallery].map(s => s.episodeNumber), [2, 1, 2]);
});
