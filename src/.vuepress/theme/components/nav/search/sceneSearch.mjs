// Shared ranking keeps worker results comparable with the palette's local results.
export const SCENE_RESULT_LIMIT = 40;

export function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function compareSearchResults(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if ((b.sortDate || 0) !== (a.sortDate || 0)) return (b.sortDate || 0) - (a.sortDate || 0);
  return a.title.localeCompare(b.title, 'en');
}

// Omit image URLs: Community Spotlight needs them, text search does not.
export function sceneSearchPayload(albums) {
  return { version: 1, albums: albums.map(({ path, title, subtitle, sortDate, scenes }) => ({
    path, title, subtitle, sortDate,
    scenes: scenes.map(({ number, title }) => ({ number, title })),
  })) };
}

export function createSceneSearchItems(payload) {
  if (payload?.version !== 1 || !Array.isArray(payload.albums)) throw new Error('Invalid scene search index');
  const items = [];
  for (const album of payload.albums) {
    for (const [index, scene] of (album.scenes || []).entries()) {
      const parsed = Number.parseInt(scene.number, 10);
      const number = Number.isFinite(parsed) && parsed > 0 ? parsed : index + 1;
      const title = String(scene.title || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const label = title && title !== String(number) ? `Scene ${number}: ${title}` : `Scene ${number}`;
      items.push({
        id: `scene:${album.path}#${number}`, type: 'scene', title: `${album.title} · ${label}`,
        subtitle: album.subtitle || '', path: `${album.path}#scene-${number}`, sortDate: album.sortDate || 0,
        searchText: normalizeText(`${album.title} ${label} ${title} ${album.subtitle || ''}`),
      });
    }
  }
  return items;
}

export function searchSceneItems(items, query, limit = SCENE_RESULT_LIMIT) {
  const normalized = normalizeText(query);
  if (!normalized || limit <= 0) return [];
  const terms = normalized.split(' ');
  const best = [];
  for (const item of items) {
    if (!terms.every(term => item.searchText.includes(term))) continue;
    const score = (item.searchText.startsWith(normalized) ? 120 : item.searchText.includes(normalized) ? 60 : 0)
      + terms.length * 25 + 10;
    const match = { ...item, score };
    // Retain only the best results, rather than sorting every matching scene.
    let position = best.findIndex(other => compareSearchResults(match, other) < 0);
    if (position < 0) position = best.length;
    if (position < limit) best.splice(position, 0, match);
    if (best.length > limit) best.pop();
  }
  return best.map(({ searchText, ...item }) => item);
}

// Fetching, parsing and index construction all happen in the worker.
export function createSceneSearchHandler({ fetchIndex, respond }) {
  let itemsPromise;
  let latestId;
  return async ({ id, query, manifestUrl }) => {
    latestId = id;
    try {
      if (!itemsPromise) {
        itemsPromise = fetchIndex(manifestUrl).then(createSceneSearchItems).catch(error => {
          itemsPromise = null;
          throw error;
        });
      }
      const items = await itemsPromise;
      if (id !== latestId) return;
      respond({ id, query, results: searchSceneItems(items, query) });
    } catch (error) {
      if (id === latestId) respond({ id, query, error: true });
    }
  };
}
