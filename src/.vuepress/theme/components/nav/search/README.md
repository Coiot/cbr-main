# Archive scene search

The palette keeps its small episode, competitor, map and snapshot indexes on the
UI thread. `sceneSearch.worker.js` owns the full archive index; only the top 40
scene matches return to Vue. Both use the same score/date/title ordering.
Substring matching, multi-term matching, narrator metadata and scene deep links
retain their original behavior. The worker retains only the best matches while
scanning, instead of sorting all matching scenes.

`sceneSearchClient.mjs` creates the worker on the first nonempty query, after a
150 ms typing delay. Request IDs discard obsolete responses. Closing the palette
cancels pending queries; unmounting terminates the worker. A failed worker or
index fetch leaves local results available and can be retried. The full index is
never inserted into Vue's reactive state. A later query reuses the worker's index.

`npm run build:album-data` also generates:

- `data/albums/search-manifest.json`: a small manifest that is revalidated.
- `data/albums/search/<content-hash>.json`: an immutable search payload without
  image URLs. Changes to scene metadata automatically produce a new hash.

Netlify cache headers allow the hashed payload to be reused across visits and
builds when its contents are unchanged. The existing `scene-index.json` remains
available to Community Spotlight, which needs image previews. The worker fetches,
parses and prepares its own compact payload; merely opening the palette does not
fetch the scene index. No word index or search service is required.

Run `npm run test:site` for ranking, debounce, cancellation, error recovery and
concurrent index-loading regressions. The production VuePress build also checks
that Vite emits the worker as a separate asset.
