import { collectionScenes, sceneKey } from './collectionModel.mjs';

export const entryHash = number => `#entry-${number}`;
export const entryNumberFromHash = hash => {
  const match = String(hash || '').match(/^#entry-([1-9]\d*)$/);
  return match ? Number(match[1]) : null;
};
export const readingMode = value => value === 'horizontal' ? 'horizontal' : 'vertical';
export function collectionEntries(albums, selections, season = '', through = 'all') {
  const positions = new Map(selections.map((scene, index) => [sceneKey(scene), index + 1]));
  return collectionScenes(albums, selections, season, through).map(card => ({ ...card, entryNumber: positions.get(card.id) }));
}
export function retainedEntryIndex(cards, previousId, hash = '') {
  const number = entryNumberFromHash(hash);
  const index = cards.findIndex(card => number ? card.entryNumber === number : card.id === previousId);
  return Math.max(0, index);
}

// Cache and deduplicate whole album payloads, with bounded concurrency across a long collection.
export function createCollectionSceneLoader(fetchAlbum, concurrency = 3) {
  const cache = new Map(), queue = [], controllers = new Set();
  let running = 0, disposed = false;
  const abortError = () => Object.assign(new Error('Reader closed.'), { name: 'AbortError' });
  function pump() {
    while (!disposed && running < concurrency && queue.length) {
      const task = queue.shift(), controller = new AbortController();
      running++; controllers.add(controller);
      Promise.resolve().then(() => fetchAlbum(task.album, controller.signal)).then(data => {
        if (!Array.isArray(data?.scenes)) throw new Error('Scene data unavailable.');
        if (disposed) throw abortError();
        task.resolve(data);
      }).catch(error => { cache.delete(task.album.path); task.reject(error); })
        .finally(() => { controllers.delete(controller); running--; pump(); });
    }
  }
  return {
    async load(album, number) {
      if (disposed) throw abortError();
      if (!album?.scene_data_url) throw new Error('Scene data unavailable.');
      if (!cache.has(album.path)) {
        const promise = new Promise((resolve, reject) => queue.push({ album, resolve, reject }));
        cache.set(album.path, promise); pump();
      }
      const data = await cache.get(album.path);
      const scene = data.scenes.find((scene, index) => (Number.parseInt(scene.scene_number, 10) || index + 1) === number);
      if (!scene) throw new Error('Scene unavailable.');
      return scene;
    },
    dispose() {
      disposed = true;
      for (const controller of controllers) controller.abort();
      for (const task of queue.splice(0)) task.reject(abortError());
      cache.clear();
    },
  };
}
