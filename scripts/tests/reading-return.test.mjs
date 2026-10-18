import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cloudReadingReturn, localReadingReturn } from '../../src/.vuepress/theme/components/albums/library/readingReturn.js';
import { latestEpisode } from '../../src/.vuepress/theme/components/home/latestEpisode.js';

const episode = (number, frontmatter = {}) => ({ path: `/albums/s5/Episode${number}/`,
  frontmatter: { title: `Episode ${number}`, scene_count: 80, date: `2026-10-${number}`, ...frontmatter } });
const pages = [episode(12), episode(13), episode(14), episode(15, { exclude: true })];

test('homepage chooses recent account progress, skipping finished, reset, excluded and missing episodes', () => {
  const rows = [
    { page_path: pages[0].path, resume_scene: 24, bookmark_scene: 5, updated_at: '2026-10-17T10:00:00Z' },
    { page_path: pages[1].path, resume_scene: 80, reading_status: 'finished', updated_at: '2026-10-18T10:00:00Z' },
    { page_path: pages[2].path, bookmark_scene: 7, reading_status: 'not_started', updated_at: '2026-10-18T10:00:00Z' },
    { page_path: pages[3].path, resume_scene: 8, updated_at: '2026-10-18T10:00:00Z' },
    { page_path: '/albums/s5/Episode999/', resume_scene: 8, updated_at: '2026-10-18T10:00:00Z' },
  ];
  const result = cloudReadingReturn(pages, Object.fromEntries(rows.map(row => [row.page_path, row])));
  assert.deepEqual(result.to, { path: pages[0].path, hash: '#scene-24' });
  assert.match(result.meta, /Episode 12 · Scene 24/);
  assert.equal(cloudReadingReturn(pages, { finished: rows[1], reset: rows[2] }), null);
  assert.equal(cloudReadingReturn(pages, {}), null);
});

test('homepage uses the most recently updated unfinished album and clamps obsolete scene positions', () => {
  const result = cloudReadingReturn(pages, {
    older: { page_path: pages[0].path, resume_scene: 20, updated_at: '2026-10-17T10:00:00Z' },
    newer: { page_path: pages[1].path, resume_scene: 90, bookmark_scene: 8, updated_at: '2026-10-18T10:00:00Z' },
  });
  assert.deepEqual(result.to, { path: pages[1].path, hash: '#scene-80' });
  assert.match(result.meta, /Scene 80$/);
});

test('guest reading preserves resume and deliberate bookmarks, ignoring invalid or unavailable albums', () => {
  const data = { [`albumsResume:${pages[0].path}`]: '24', [`albumsResumeUpdated:${pages[0].path}`]: '1000',
    [`albumsBookmark:${pages[1].path}`]: '9', [`albumsBookmarkUpdated:${pages[1].path}`]: '2000',
    [`albumsResume:${pages[2].path}`]: '-2', [`albumsResume:${pages[3].path}`]: '30',
    'albumsResume:/missing/': '5' };
  const storage = { ...data, getItem: key => data[key] ?? null };
  const result = localReadingReturn(pages, storage);
  assert.equal(result.label, 'Return to Bookmark');
  assert.deepEqual(result.to, { path: pages[1].path, hash: '#scene-9' });
  assert.equal(localReadingReturn(pages, new Proxy({}, { ownKeys() { throw new Error('Storage denied'); } })), null);
});

test('latest recovery link uses the same real episode selection as the homepage', () => {
  assert.equal(latestEpisode([...pages,
    { path: '/albums/s5/', frontmatter: { date: '2030-01-01' } },
    { path: '/albums/pr/s5pr99/', frontmatter: { date: '2030-01-01' } },
    episode(16, { date: 'invalid' }),
  ]).path, pages[2].path);
  assert.equal(latestEpisode([]), null);
});
