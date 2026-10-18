import { createSceneSearchHandler } from './sceneSearch.mjs';

async function json(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  if (!response.ok) throw new Error(`Search request failed: ${response.status}`);
  return response.json();
}

const search = createSceneSearchHandler({
  async fetchIndex(manifestUrl) {
    const manifest = await json(manifestUrl, { cache: 'no-cache' });
    if (manifest.version !== 1 || typeof manifest.url !== 'string') throw new Error('Invalid search manifest');
    return json(new URL(manifest.url, manifestUrl).href);
  },
  respond: result => self.postMessage(result),
});
self.onmessage = event => search(event.data);
