import { normalizeText } from "./sceneSearch.mjs";
import { createSceneSearchClient } from "./sceneSearchClient.mjs";

export const SEARCH_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'episodes', label: 'Episodes' },
  { id: 'scenes', label: 'Scenes' },
  { id: 'competitors', label: 'Competitors' },
  { id: 'map', label: 'Map' },
];

const TYPES = {
  episodes: new Set(['episode']),
  scenes: new Set(['scene']),
  competitors: new Set(['competitor']),
  map: new Set(['map', 'mapTile', 'mapCity', 'mapOwner', 'mapSnapshot', 'mapPin']),
};
export function matchesSearchCategory(item, category) {
  return !TYPES[category] || TYPES[category].has(item.type);
}
export function filterPaletteResults(items, category, limit) {
  // Filter before limiting: high-ranked scenes must not crowd out episode matches.
  return items.filter(item => matchesSearchCategory(item, category)).slice(0, limit);
}
export const usesSceneSearch = category => category === 'all' || category === 'scenes';
export const usesMapSearch = category => category === 'all' || category === 'map';

export function paletteEmptyState(query, category, hasSnapshotScope, sceneSearchError = false) {
  const text = String(query || '').trim();
  const label = SEARCH_CATEGORIES.find(item => item.id === category)?.label || 'All';
  if (category === 'scenes' && sceneSearchError) {
    return { title: 'Scene search could not finish.', hint: 'Retry scene search or search another category.',
      showAll: true, clearScope: false, clearQuery: Boolean(text) };
  }
  if (category === 'scenes' && !text) {
    return { title: 'Search scene titles', hint: 'Enter a scene title, episode, or narrator to search the archive.',
      showAll: true, clearScope: false, clearQuery: false };
  }
  const clearScope = hasSnapshotScope && usesMapSearch(category);
  return {
    title: text ? (category === 'all' ? `No results for “${text}”.` : `No matches in ${label} for “${text}”.`) : `No results in ${label} yet.`,
    hint: clearScope ? 'Try the live map, another category, or a shorter search.'
      : category === 'all' ? 'Try a shorter search, a different spelling, or another category.'
      : 'Try a shorter search or search all categories.',
    showAll: category !== 'all', clearScope, clearQuery: Boolean(text),
  };
}

// These computed values and methods execute on the palette component instance.
export const paletteFilterComputed = {
  searchPlaceholder() {
    return {
      episodes: 'Search episode title, narrator, or date',
      scenes: 'Search scene title, episode, or narrator',
      competitors: 'Search civilization, leader, or author',
      map: 'Search city, owner, snapshot, or tile 72,32',
    }[this.activeCategory] || 'Search episodes, scenes, competitors, tile 72,32';
  },
  canClearSnapshotScope() {
    return this.snapshotScope.mode === 'snapshot' && Boolean(this.snapshotScope.id) && usesMapSearch(this.activeCategory);
  },
  searchPending() {
    return (usesSceneSearch(this.activeCategory) && this.sceneSearchLoading)
      || (this.canClearSnapshotScope && this.snapshotIndexLoading);
  },
  emptySearchState() {
    return paletteEmptyState(this.query, this.activeCategory, this.canClearSnapshotScope, this.sceneSearchError);
  },
};
export const paletteFilterMethods = {
  searchScenes(force = false) {
    const query = normalizeText(this.query);
    if (!this.isOpen || !query || !usesSceneSearch(this.activeCategory)) {
      this._sceneSearchClient?.cancel();
      this.sceneResults = [];
      this.sceneResultsQuery = "";
      return;
    }
    if (!force && this.sceneResultsQuery === query && !this.sceneSearchError) return;
    this.sceneResults = [];
    this.sceneResultsQuery = "";
    if (!this._sceneSearchClient) {
      this._sceneSearchClient = createSceneSearchClient({
        createWorker: () => new Worker(new URL("./sceneSearch.worker.js", import.meta.url), { type: "module" }),
        onResults: (results, resultQuery) => {
          if (!this.isOpen || !usesSceneSearch(this.activeCategory) || normalizeText(this.query) !== resultQuery) return;
          this.sceneResults = results;
          this.sceneResultsQuery = resultQuery;
        },
        onState: ({ loading, error }) => {
          this.sceneSearchLoading = loading;
          this.sceneSearchError = error;
        },
      });
    }
    const path = this.$withBase("/data/albums/search-manifest.json");
    this._sceneSearchClient.search(query, new URL(path, window.location.href).href);
  },

  handleSearchKey(event) {
    // Buttons (filters, retry, recovery actions, results) retain native Enter/Space behavior.
    if (event.target !== this.$refs.searchInput || event.isComposing) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.moveActiveIndex(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.moveActiveIndex(-1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = this.results[this.activeIndex];
      if (item) {
        this.activateItem(item);
      }
    }
  },

  setSearchCategory(category) {
    if (!SEARCH_CATEGORIES.some(item => item.id === category)) return;
    this.activeCategory = category;
    this.activeIndex = 0;
  },
  clearSearchQuery() {
    this.query = '';
    this.activeIndex = 0;
    this.$nextTick(() => this.$refs.searchInput?.focus());
  },
};
