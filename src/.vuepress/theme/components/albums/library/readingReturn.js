import { readingStatus, readingTarget } from './readingLibrary.js';

const localKeys = [
  { prefix: 'albumsResume:', updated: 'albumsResumeUpdated:', label: 'Continue Reading' },
  { prefix: 'albumsBookmark:', updated: 'albumsBookmarkUpdated:', label: 'Return to Bookmark' },
];

function albumPages(pages) {
  return new Map(pages.filter(page => page?.path?.startsWith('/albums/') &&
    !page.frontmatter?.exclude &&
    (Number(page.frontmatter?.scene_count) > 0 || page.frontmatter?.scenes?.length > 0))
    .map(page => [page.path, page]));
}

function candidate(page, row, label, score) {
  const to = readingTarget(page, row);
  const scene = to.hash.slice('#scene-'.length);
  return { label, to, score: Number.isFinite(score) ? score : 0,
    meta: `${page.frontmatter.title || page.title} · Scene ${scene}` };
}

export function cloudReadingReturn(pages, records) {
  const albums = albumPages(pages);
  return Object.values(records).filter(row => albums.has(row.page_path) && readingStatus(row) === 'in_progress')
    .map(row => candidate(albums.get(row.page_path), row, 'Continue Reading', Date.parse(row.updated_at)))
    .sort((a, b) => b.score - a.score)[0] || null;
}

export function localReadingReturn(pages, storage) {
  const albums = albumPages(pages), candidates = [];
  try {
    for (const type of localKeys) for (const key of Object.keys(storage || {})) {
      if (!key.startsWith(type.prefix)) continue;
      const page = albums.get(key.slice(type.prefix.length));
      const scene = Number(storage.getItem(key));
      if (!page || !Number.isInteger(scene) || scene < 1) continue;
      const updated = Number(storage.getItem(`${type.updated}${page.path}`));
      const date = Date.parse(page.frontmatter.date || page.frontmatter.release_date || '');
      candidates.push(candidate(page, { resume_scene: scene }, type.label, updated || date));
    }
  } catch { /* Reading remains available when browser storage is restricted. */ }
  return candidates.sort((a, b) => b.score - a.score)[0] || null;
}
