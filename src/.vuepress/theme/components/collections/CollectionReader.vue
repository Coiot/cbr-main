<template>
  <section class="collection-reader" aria-label="Collection reader">
    <div class="collection-tools">
      <div class="collection-segments" role="group" aria-label="Collection view">
        <button v-for="view in views" :key="view.id" type="button" :aria-pressed="mode === view.id" @click="setMode(view.id)">{{ view.label }}</button>
      </div>
      <button ref="fullscreenButton" type="button" class="collection-fullscreen" :disabled="!cards.length" :aria-pressed="fullscreen" @click="openFullscreen()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" /></svg> Fullscreen
      </button>
      <span class="collection-count" aria-live="polite">{{ cards.length ? `Entry ${position + 1} of ${cards.length}` : '0 entries' }}</span>
      <SceneJumpControl v-if="cards.length" :model-value="position + 1" :scene-count="cards.length" :option-labels="jumpLabels" label="Jump to entry" item-label="Entry" select-id="collection-entry-jump" compact @go="jump($event - 1)" />
    </div>
    <details class="collection-filters">
      <summary>Spoiler filters <span>{{ filterSummary }}</span></summary>
      <div class="collection-filter-controls">
        <label v-if="seasons.length > 1">Season<select v-model="season"><option value="">All seasons</option><option v-for="s in seasons" :key="s" :value="s">Season {{ s.slice(1) }}</option></select></label>
        <label v-if="season">Show through<select v-model="through"><option value="all">All released episodes</option><option v-for="ep in episodeOptions" :key="ep" :value="String(ep)">{{ ep === 0 ? 'Opening rankings' : `Episode ${ep}` }}</option></select></label>
        <p>Hide scenes and curator notes beyond the episode you’ve reached.</p>
      </div>
    </details>
    <p v-if="metadataLoading" role="status">Loading collection entries…</p>
    <p v-else-if="!cards.length" role="status">No entries in this selection. Try another season or clear the episode limit.</p>
    <template v-else>
      <div v-if="mode === 'overview'" ref="overview" class="collection-overview">
        <a v-for="card in cards" :key="card.id" :href="hashFor(card.entryNumber)" class="collection-overview-card" :aria-label="`Read entry ${card.entryNumber}: ${card.title}, ${albumLabel(card)}`" @click.prevent="openEntry(card)">
          <img v-if="card.previewUrl" :src="$assetUrl(card.previewUrl)" alt="" loading="lazy" decoding="async" />
          <span class="collection-overview-text"><span class="collection-entry-kicker">{{ card.entryNumber }} · Season {{ card.season.slice(1) }} · {{ albumLabel(card) }}</span><strong>{{ card.title }}</strong></span>
        </a>
      </div>
      <div v-else-if="mode === 'horizontal'" ref="horizontal" class="collection-horizontal">
        <SceneCarousel :scenes="viewerScenes" :active-index="position" :scene-key="viewerKey" label="Collection entries" show-thumbnails show-fraction @change="onSlide">
          <template #content="{ scene }"><CollectionEntry :card="scene._entry" :content="stateFor(scene._entry).content" :status="stateFor(scene._entry).status" :narrator="albumFor(scene._entry)?.narrated_by" :media="false" @retry="ensureEntry(scene._entry, true)" /></template>
        </SceneCarousel>
      </div>
      <div v-else ref="vertical" class="collection-vertical">
        <div v-for="card in cards" :id="`entry-${card.entryNumber}`" :key="card.id" :data-entry-id="card.id" class="collection-vertical-entry">
          <CollectionEntry :card="card" :content="stateFor(card).content" :status="stateFor(card).status" :narrator="albumFor(card)?.narrated_by" @retry="ensureEntry(card, true)" @enlarge="openFullscreen(card)" />
        </div>
      </div>
      <CinematicFullscreen ref="fullscreenViewer" :scenes="viewerScenes" :active-scene="viewerScenes[position]" :active-scene-index="position" :active-scene-number="active?.entryNumber || 1" :is-fullscreen="fullscreen" :narration-layout="narrationLayout" :scene-key="viewerKey" :active-reaction-display="{}" label="Fullscreen collection entries" @slide-change="onSlide" @fullscreen-change="onFullscreenChange" @set-layout="setNarrationLayout">
        <template #narration><CollectionEntry v-if="active" :card="active" :content="stateFor(active).content" :status="stateFor(active).status" :narrator="albumFor(active)?.narrated_by" :media="false" @retry="ensureEntry(active, true)" /></template>
      </CinematicFullscreen>
    </template>
  </section>
</template>
<script>
import SceneCarousel from '../albums/SceneCarousel.vue';
import CinematicFullscreen from '../albums/CinematicFullscreen.vue';
import SceneJumpControl from '../albums/SceneJumpControl.vue';
import CollectionEntry from './CollectionEntry.vue';
import { sceneAlbumLabel } from '../spotlight/spotlightModel.mjs';
import { collectionEntries, createCollectionSceneLoader, entryHash, retainedEntryIndex, readingMode } from './collectionReading.mjs';
const emptyState = Object.freeze({ status: 'idle', content: null });
export default {
  components: { SceneCarousel, CinematicFullscreen, SceneJumpControl, CollectionEntry },
  props: { collection: Object, episodes: Array, metadataLoading: Boolean },
  data: () => ({ season: '', through: 'all', mode: 'vertical', lastReadingMode: 'vertical', position: 0, fullscreen: false, narrationLayout: 'side', sceneStates: {}, views: [{ id: 'vertical', label: 'Vertical' }, { id: 'horizontal', label: 'Horizontal' }, { id: 'overview', label: 'Overview' }] }),
  computed: {
    allCards() { return collectionEntries(this.episodes, this.collection.scenes); },
    seasons() { return [...new Set(this.allCards.map(card => card.season))].sort((a, b) => Number(b.slice(1)) - Number(a.slice(1))); },
    episodeOptions() { return [...new Set(this.episodes.filter(album => album.season === this.season).map(album => album.number))].sort((a, b) => b - a); },
    cards() { return collectionEntries(this.episodes, this.collection.scenes, this.season, this.through); },
    active() { return this.cards[this.position]; },
    filterSummary() { return `${this.season ? `Season ${this.season.slice(1)}` : 'All seasons'} · ${this.through === 'all' ? 'All episodes' : this.through === '0' ? 'Opening rankings' : `Through episode ${this.through}`}`; },
    jumpLabels() { return this.cards.map(card => `${card.entryNumber}. ${sceneAlbumLabel(card)} — ${card.title}`); },
    viewerScenes() { return this.cards.map(card => ({ ...this.stateFor(card).content, slide_url: this.stateFor(card).content?.slide_url || card.previewUrl, scene_title: `${card.title} — Season ${card.season.slice(1)}, ${sceneAlbumLabel(card)}`, _entry: card })); },
  },
  watch: {
    season() { this.through = 'all'; },
    cards(next, previous) { this.reconcileCards(next, previous); },
    'active.id'() { if (this._alive) this.loadActive(); },
    '$route.hash'(hash) { if (hash !== entryHash(this.active?.entryNumber)) this.restoreHash(hash); },
  },
  mounted() {
    this._alive = true;
    this._loader = createCollectionSceneLoader(async (album, signal) => {
      const response = await fetch(this.$withBase(album.scene_data_url), { signal });
      if (!response.ok) throw new Error('Album unavailable.');
      return response.json();
    });
    try {
      this.mode = this.lastReadingMode = readingMode(window.localStorage.getItem('albumsViewMode'));
      const layout = window.localStorage.getItem('albumsCinematicNarrationLayout');
      if (layout === 'side' || layout === 'bottom') this.narrationLayout = layout;
    } catch { /* Reading works when browser storage is unavailable. */ }
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onScroll, { passive: true });
    window.addEventListener('user-settings-updated', this.onSettings);
    document.addEventListener('keydown', this.onViewerKeydown);
    this.reconcileCards(this.cards, []);
  },
  beforeUnmount() {
    this._alive = false; this._observer?.disconnect(); this._loader?.dispose();
    cancelAnimationFrame(this._scrollFrame);
    window.removeEventListener('scroll', this.onScroll); window.removeEventListener('resize', this.onScroll);
    window.removeEventListener('user-settings-updated', this.onSettings); document.removeEventListener('keydown', this.onViewerKeydown);
  },
  methods: {
    albumLabel: sceneAlbumLabel, hashFor: entryHash,
    viewerKey(scene) { return scene._entry.id; },
    stateFor(card) { return this.sceneStates[card?.id] || emptyState; },
    albumFor(card) { return this.episodes.find(album => album.path === card?.path); },
    reconcileCards(next, previous = []) {
      if (!this._alive) return;
      if (!this._seasonInitialized && this.allCards.length) {
        this._seasonInitialized = true;
        if (this.seasons.length === 1 && this.season !== this.seasons[0]) { this.season = this.seasons[0]; return; }
      }
      const previousId = previous[this.position]?.id;
      this.position = retainedEntryIndex(next, previousId, !this._hashRestored ? this.$route.hash : '');
      const restore = !this._hashRestored && next.length && this.$route.hash;
      if (next.length) this._hashRestored = true;
      this.$nextTick(() => {
        if (!this._alive) return;
        this.observeEntries(); this.loadActive();
        if (restore) this.scrollToActive();
        else if (previous.length && this.active) this.updateHash();
      });
    },
    async ensureEntry(card, retry = false) {
      if (!this._alive || !card || !this.cards.some(item => item.id === card.id)) return;
      const existing = this.stateFor(card);
      if (existing.status === 'ready' || existing.status === 'loading' || (existing.status === 'error' && !retry)) return;
      this.sceneStates[card.id] = { status: 'loading', content: null };
      const state = this.sceneStates[card.id];
      try {
        const content = await this._loader.load(this.albumFor(card), card.sceneNumber);
        if (this._alive && this.sceneStates[card.id] === state) this.sceneStates[card.id] = { status: 'ready', content };
      } catch (error) {
        if (this._alive && error.name !== 'AbortError' && this.sceneStates[card.id] === state) this.sceneStates[card.id] = { status: 'error', content: null };
      }
    },
    loadActive() {
      this.ensureEntry(this.active);
      if (this.mode === 'horizontal' || this.fullscreen) {
        this.ensureEntry(this.cards[this.position - 1]); this.ensureEntry(this.cards[this.position + 1]);
      }
    },
    observeEntries() {
      this._observer?.disconnect();
      if (this.mode !== 'vertical' || !this.$refs.vertical) return;
      if (typeof IntersectionObserver !== 'undefined') {
        this._observer = new IntersectionObserver(entries => {
          for (const entry of entries) if (entry.isIntersecting) this.ensureEntry(this.cards.find(card => card.id === entry.target.dataset.entryId));
        }, { rootMargin: '450px 0px' });
        this.$refs.vertical.querySelectorAll('.collection-vertical-entry').forEach(node => this._observer.observe(node));
      }
      this.onScroll();
    },
    onScroll() {
      if (this._scrollFrame || this.mode !== 'vertical' || this.fullscreen) return;
      this._scrollFrame = requestAnimationFrame(() => {
        this._scrollFrame = null;
        if (!this._alive || this.mode !== 'vertical' || this.fullscreen) return;
        const nodes = [...(this.$refs.vertical?.children || [])];
        let candidate = -1;
        nodes.forEach((node, index) => {
          const rect = node.getBoundingClientRect();
          if (rect.top < window.innerHeight + 450 && rect.bottom > -450) this.ensureEntry(this.cards[index]);
          if (candidate === -1 && rect.bottom > 130 && rect.top < window.innerHeight) candidate = index;
        });
        if (candidate >= 0 && candidate !== this.position) { this.position = candidate; this.updateHash(); }
      });
    },
    updateHash() {
      if (!this.active) return;
      const hash = entryHash(this.active.entryNumber);
      if (this.$route.hash !== hash) this.$router.replace({ path: this.$route.path, query: this.$route.query, hash });
    },
    restoreHash(hash) {
      if (!this._alive || !this.cards.length) return;
      this.position = retainedEntryIndex(this.cards, this.active?.id, hash); this.loadActive();
      if (this.mode === 'overview') this.mode = this.lastReadingMode;
      this.$nextTick(() => { this.observeEntries(); this.scrollToActive(); });
    },
    setMode(mode, persist = true) {
      if (this.mode === mode) return;
      this.mode = mode;
      if (mode !== 'overview') {
        this.lastReadingMode = mode;
        if (persist) {
          try { window.localStorage.setItem('albumsViewMode', mode); } catch { /* Optional preference. */ }
          window.dispatchEvent(new CustomEvent('user-settings-updated', { detail: { albumsViewMode: mode } }));
        }
      }
      this.$nextTick(() => { this.observeEntries(); this.loadActive(); this.scrollToActive(); });
    },
    onSettings(event) { if (event.detail?.albumsViewMode && readingMode(event.detail.albumsViewMode) !== this.lastReadingMode) { this.lastReadingMode = readingMode(event.detail.albumsViewMode); if (this.mode !== 'overview') this.setMode(this.lastReadingMode, false); } },
    openEntry(card) { this.position = this.cards.findIndex(item => item.id === card.id); this.mode = this.lastReadingMode; this.loadActive(); this.updateHash(); this.$nextTick(() => { this.observeEntries(); this.scrollToActive(true); }); },
    jump(index) { if (!this.cards[index]) return; this.position = index; if (this.mode === 'overview') this.mode = this.lastReadingMode; this.loadActive(); this.updateHash(); this.$nextTick(() => { this.observeEntries(); this.scrollToActive(true); }); },
    onSlide(event) { const index = Number.isInteger(event) ? event : event?.currentSlide?.index; if (!this.cards[index]) return; this.position = index; this.loadActive(); this.updateHash(); },
    scrollToActive(focus = false) {
      if (this.fullscreen || !this.active) return;
      const node = this.mode === 'vertical' ? this.$refs.vertical?.querySelector(`#entry-${this.active.entryNumber}`) : this.mode === 'overview' ? this.$refs.overview : this.$refs.horizontal;
      if (!node) return;
      node.scrollIntoView({ block: 'start', behavior: 'auto' });
      if (focus) (node.querySelector('h2') || node.querySelector('a,button'))?.focus({ preventScroll: true });
    },
    async openFullscreen(card) {
      this._fullscreenReturn = document.activeElement;
      if (card) { this.position = this.cards.findIndex(item => item.id === card.id); this.updateHash(); }
      this.loadActive(); await this.$nextTick();
      await this.$refs.fullscreenViewer?.toggleFullscreen();
    },
    onFullscreenChange(value) {
      const wasFullscreen = this.fullscreen; this.fullscreen = value;
      if (value) { this.loadActive(); this.$nextTick(() => this.$refs.fullscreenViewer?.$el.querySelector('button')?.focus()); }
      else if (wasFullscreen) this.$nextTick(() => requestAnimationFrame(() => { if (!this._alive) return; this.scrollToActive(); const target = this._fullscreenReturn?.isConnected ? this._fullscreenReturn : this.$refs.fullscreenButton; target?.focus({ preventScroll: true }); }));
    },
    setNarrationLayout(layout) { this.narrationLayout = layout; try { window.localStorage.setItem('albumsCinematicNarrationLayout', layout); } catch { /* Optional preference. */ } },
    onViewerKeydown(event) {
      if (!this.fullscreen || event.defaultPrevented) return;
      if (event.key === 'Escape' && this.$refs.fullscreenViewer?.pseudoFullscreen) { event.preventDefault(); this.$refs.fullscreenViewer.toggleFullscreen(); return; }
      if (event.key === 'Tab') {
        const nodes = [...this.$refs.fullscreenViewer.$el.querySelectorAll('button,a[href],select,[tabindex="0"]')].filter(node => node.getClientRects().length);
        const first = nodes[0], last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        return;
      }
      if (event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); this.onSlide((this.position + (event.key === 'ArrowLeft' ? -1 : 1) + this.cards.length) % this.cards.length); }
    },
  },
};
</script>
<style scoped>
.collection-reader { margin-block-start:1.5rem; }
.collection-tools { display:flex; align-items:center; flex-wrap:wrap; gap:.7rem 1rem; margin-block-end:.8rem; }
.collection-tools .scene-jump { margin-inline-start:auto; min-inline-size:0; inline-size:19rem; }
.collection-tools :deep(.scene-jump.compact .jump-controls select) { max-inline-size:none; min-inline-size:0; inline-size:100%; }
.collection-tools :deep(.jump-label) { font-size:.7rem; }
.collection-count { font-size:.85rem; color:var(--color-text-muted); white-space:nowrap; }
.collection-tools .collection-fullscreen { gap:.5rem; padding:.55rem .8rem; font-size:.9rem; }
.collection-fullscreen svg { inline-size:1rem; block-size:1rem; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
.collection-filters { border-block:1px solid var(--panel-border-color); margin-block:.8rem 1.5rem; }
.collection-filters summary { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; cursor:pointer; padding-block:.65rem; font-weight:700; font-size:.9rem; }
.collection-filters summary::before { content:'▸'; color:var(--accent-color); }
.collection-filters[open] summary::before { content:'▾'; }
.collection-filters summary::-webkit-details-marker { display:none; }
.collection-filters summary span { margin-inline-start:auto; color:var(--color-text-muted); font-size:.8rem; font-weight:400; }
.collection-filter-controls { display:flex; flex-wrap:wrap; align-items:end; gap:1rem; padding-block:.3rem 1rem; }
.collection-filter-controls label { flex:0 1 17rem; inline-size:100%; }
.collection-filter-controls p { flex:1 1 16rem; font-size:.85rem; color:var(--color-text-muted); }
.collection-overview { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr)); gap:1rem; scroll-margin-block-start:6rem; }
.collection-overview-card { display:block; overflow:hidden; border:1px solid var(--panel-border-color); border-radius:12px; background:var(--panel-bg-color); color:var(--panel-text-color); text-decoration:none; }
.collection-overview-card:hover { border-color:var(--accent-color); }
.collection-overview-card img { display:block; inline-size:100%; aspect-ratio:16/9; object-fit:cover; }
.collection-overview-text { display:grid; gap:.5rem; padding:1rem; }
.collection-entry-kicker { font-size:.8rem; color:var(--field-label-color); }
.collection-overview-text strong { font-size:1.2rem; }
.collection-vertical-entry { scroll-margin-block-start:6rem; min-block-size:24rem; border-block-end:1px solid var(--panel-border-color); margin-block-end:2rem; }
.collection-horizontal { scroll-margin-block-start:6rem; }
/* Preserve album carousel geometry against the account-page button defaults. */
.collection-reader :deep(.scene-carousel-arrow) { border:0; border-radius:0; min-block-size:0; padding:0; background:transparent; color:#fff; }
.collection-reader :deep(.scene-carousel-thumbnail) { display:block; min-block-size:0; padding:0; border-radius:4px; }
.collection-reader :is(a,button,summary):focus-visible { outline:3px solid var(--field-label-color); outline-offset:3px; }
@media(max-width:750px) { .collection-tools .scene-jump { flex:1 1 100%; inline-size:100%; margin-inline-start:0; } .collection-count { margin-inline-start:auto; } }
@media(max-width:400px) { .collection-tools { gap:.6rem; } .collection-count { margin-inline-start:0; } }
</style>
