<template>
  <div class="community-spotlight">
    <header class="spotlight-hero">
      <p class="spotlight-eyebrow">Chosen by the community</p>
      <h1>Spotlight</h1>
      <p>The surprises, facepalms, and favourite moments worth another look.</p>
    </header>

    <div v-if="metadataError" class="spotlight-notice" role="alert">
      We couldn’t load the episode list. <button @click="loadMetadata">Try again</button>
    </div>
    <p v-else-if="!metadataReady" role="status">Loading Spotlight…</p>
    <p v-else-if="!episodes.length">No released episodes are available yet.</p>
    <template v-else>
      <div class="spotlight-controls">
        <div class="spotlight-scope">
          <label>Season
            <select :value="filters.season" @change="changeFilters({ season: $event.target.value, through: 'all' })">
              <option v-for="season in seasons" :key="season" :value="season">Season {{ season.slice(1) }}</option>
            </select>
          </label>
          <label>Show through
            <select :value="filters.through" @change="changeFilters({ through: $event.target.value })">
              <option value="all">All released episodes</option>
              <option v-for="episode in seasonEpisodes" :key="episode.path" :value="String(episode.number)">Episode {{ episode.number }}</option>
            </select>
          </label>
        </div>
        <p class="spotlight-spoilers">{{ filters.through === 'all' ? 'Highlights contain spoilers. Choose the episode you’ve reached to hide later moments.' : `Showing moments through Episode ${filters.through}. Later episodes are hidden.` }}</p>
      </div>

      <nav class="spotlight-views" aria-label="Spotlight views">
        <button :aria-pressed="filters.tab === 'discover'" @click="changeFilters({ view: 'discover' })">Discover moments</button>
        <button :aria-pressed="filters.tab === 'favourites'" @click="changeFilters({ view: 'favourites' })">Your favourites</button>
      </nav>
      <template v-if="filters.tab === 'discover'">
        <label class="spotlight-mood-select">Moment type
          <select :value="filters.mood" @change="changeFilters({ mood: $event.target.value })">
            <option v-for="mood in moods" :key="mood.key" :value="mood.key">{{ mood.label }}</option>
          </select>
        </label>
        <div class="spotlight-moods" role="group" aria-label="Browse by community reaction">
          <button v-for="mood in moods" :key="mood.key" :aria-pressed="filters.mood === mood.key" @click="changeFilters({ mood: mood.key })"><span v-if="mood.emoji" aria-hidden="true">{{ mood.emoji }} </span>{{ mood.label }}</button>
        </div>
        <p class="spotlight-explanation">Categories reflect readers’ reactions.</p>
        <div class="spotlight-status">
          <span v-if="updatedAt">Reactions updated {{ updatedLabel }}</span>
          <button :disabled="loading" @click="loadReactions(true)">{{ loading ? 'Refreshing…' : 'Refresh' }}</button>
        </div>
        <div v-if="loadError" class="spotlight-notice" role="alert">
          {{ rows.length ? 'We couldn’t refresh reactions. Showing the last available highlights.' : 'We couldn’t load reactions. Please try again.' }}
          <button :disabled="loading" @click="loadReactions(true)">Retry</button>
        </div>
        <p v-if="loading && !rows.length" role="status">Finding community favourites…</p>
        <template v-else>
          <SpotlightScene v-if="discovery.featured" :scene="discovery.featured" :reactions="reactions" featured />
          <div v-if="visibleScenes.length" class="spotlight-gallery" aria-label="Community highlights">
            <SpotlightScene v-for="scene in visibleScenes" :key="scene.id" :scene="scene" :reactions="reactions" />
          </div>
          <div v-else-if="!discovery.featured && !loadError" class="spotlight-empty">
            <h2>{{ filters.mood === 'all' ? 'The next great moment starts with you' : 'No moments match this category yet' }}</h2>
            <p>{{ filters.mood === 'all' ? 'React to scenes as you read. Your reactions help memorable moments find their way into Spotlight.' : 'Try All moments, or change the episode limit to explore more highlights.' }}</p>
            <button v-if="filters.mood !== 'all'" @click="changeFilters({ mood: 'all' })">All moments</button>
            <router-link v-else-if="eligible.length" :to="eligible[0].path">Read Episode {{ eligible[0].number }} →</router-link>
          </div>
        </template>
      </template>
      <template v-else>
        <p class="spotlight-explanation">Your starred and hearted scenes, together in one place. Add ⭐ or ❤️ while reading to keep a favourite here.</p>
        <div v-if="!authUser" class="spotlight-empty">
          <h2>Keep your favourite moments close</h2>
          <p>Sign in to revisit the scenes you’ve starred and hearted.</p>
          <button @click="openAccount">Sign in</button>
        </div>
        <p v-else-if="userLoading" role="status">Loading your favourites…</p>
        <div v-else-if="userError" class="spotlight-notice" role="alert">We couldn’t load your favourites. <button @click="loadFavourites(true)">Try again</button></div>
        <div v-else-if="visibleScenes.length" class="spotlight-gallery" aria-label="Your favourite scenes">
          <SpotlightScene v-for="scene in visibleScenes" :key="scene.id" :scene="scene" :reactions="reactions" />
        </div>
        <div v-else class="spotlight-empty">
          <h2>No favourites in this selection yet</h2>
          <p>Star or heart a scene while reading, or adjust the season and episode limit to find earlier favourites.</p>
          <router-link v-if="eligible.length" :to="eligible[0].path">Read Episode {{ eligible[0].number }} →</router-link>
        </div>
      </template>
      <div v-if="visibleScenes.length < gallery.length && !userLoading" class="spotlight-more">
        <button @click="showMore">Show more moments</button>
        <p role="status">Showing {{ visibleScenes.length }} of {{ gallery.length }} moments</p>
      </div>
    </template>
  </div>
</template>

<script>
import { getSupabaseClient } from '../supabaseClient';
import { subscribeAccountAuth } from '../account/accountSync.js';
import picks from '../../data/spotlightPicks.json';
import SpotlightScene from '../components/spotlight/SpotlightScene.vue';
import { MOODS, buildEpisodes, readFilters, episodeOptions, eligibleEpisodes, buildDiscovery, buildFavourites } from '../components/spotlight/spotlightModel.mjs';
import { CACHE_TTL, readCache, writeCache, fetchReactionRows } from '../components/spotlight/spotlightData.mjs';

export default {
  name: 'CommunitySpotlight',
  components: { SpotlightScene },
  data: () => ({ episodes: [], moods: MOODS, rows: [], userRows: [], authUser: null, loading: false, userLoading: false,
    loadError: false, userError: false, metadataError: false, metadataReady: false, updatedAt: 0, visibleCount: 12, userLoadedKey: '', supabase: null }),
  computed: {
    filters() { return readFilters(this.$route.query, this.episodes); },
    seasons() { return [...new Set(this.episodes.map(e => e.season))].sort((a, b) => Number(b.slice(1)) - Number(a.slice(1))); },
    seasonEpisodes() { return episodeOptions(this.episodes, this.filters.season); },
    eligible() { return eligibleEpisodes(this.episodes, this.filters); },
    discovery() { return buildDiscovery(this.eligible, this.rows, this.filters.mood, picks[this.filters.season]); },
    gallery() { return this.filters.tab === 'favourites' ? buildFavourites(this.eligible, this.userRows) : this.discovery.gallery; },
    visibleScenes() { return this.gallery.slice(0, this.visibleCount); },
    reactions() { return this.$site.themeConfig.reactions || []; },
    updatedLabel() { return new Date(this.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); },
  },
  watch: {
    'filters.season'(season, previous) {
      if (season && season !== previous) {
        this.rows = []; this.updatedAt = 0; this.userRows = []; this.userLoadedKey = '';
        this.loadReactions(); this.loadFavourites();
      }
    },
    'filters.tab'() { this.loadFavourites(); },
    '$route.query'() { this.visibleCount = 12; },
  },
  mounted() {
    this._disposed = false;
    this.supabase = getSupabaseClient();
    if (this.supabase) this._authSubscription = subscribeAccountAuth(this.supabase, session => {
      const user = session?.user || null;
      if (user?.id === this.authUser?.id) return;
      this.authUser = user; this.userRows = []; this.userLoadedKey = ''; this.userError = false;
      this.loadFavourites();
    });
    this.loadMetadata();
  },
  beforeUnmount() { this._disposed = true; this._authSubscription?.unsubscribe(); },
  methods: {
    openAccount() { window.dispatchEvent(new CustomEvent('open-account-menu')); },
    async loadMetadata() {
      this.metadataError = false;
      try {
        const [catalog, index] = await Promise.all(['index', 'scene-index'].map(async name => {
          const response = await fetch(this.$withBase(`/data/albums/${name}.json`));
          if (!response.ok) throw new Error('Episode metadata unavailable');
          const payload = await response.json();
          if (!Array.isArray(payload.albums)) throw new Error('Invalid episode metadata');
          return payload.albums;
        }));
        if (!this._disposed) { this.episodes = buildEpisodes(catalog, index); this.metadataReady = true; }
      } catch { if (!this._disposed) this.metadataError = true; }
    },
    changeFilters(changes) {
      const query = { ...this.$route.query, season: this.filters.season, through: this.filters.through, mood: this.filters.mood, view: this.filters.tab, ...changes };
      this.$router.push({ path: this.$route.path, query });
    },
    async loadReactions(force = false) {
      const season = this.filters.season;
      if (!season) return;
      const request = this._reactionRequest = (this._reactionRequest || 0) + 1;
      const current = () => !this._disposed && request === this._reactionRequest && season === this.filters.season;
      this.loading = true; this.loadError = false;
      let storage;
      try { storage = window.localStorage; } catch { /* Storage is optional. */ }
      const cached = readCache(storage, season);
      if (cached && !this.rows.length) { this.rows = cached.rows; this.updatedAt = cached.time; }
      if (!force && cached && Date.now() - cached.time < CACHE_TTL) { this.loading = false; return; }
      try {
        if (!this.supabase) throw new Error('Connection unavailable');
        const rows = await fetchReactionRows(this.supabase, season);
        if (!current()) return;
        this.rows = rows; this.updatedAt = Date.now();
        writeCache(storage, season, rows, this.updatedAt);
      } catch { if (current()) this.loadError = true; }
      finally { if (current()) this.loading = false; }
    },
    async loadFavourites(force = false) {
      const season = this.filters.season;
      const userId = this.authUser?.id;
      const request = this._userRequest = (this._userRequest || 0) + 1;
      if (!userId || !season || this.filters.tab !== 'favourites') { this.userLoading = false; return; }
      const key = `${userId}:${season}`;
      if (!force && this.userLoadedKey === key) return;
      const current = () => !this._disposed && request === this._userRequest && userId === this.authUser?.id && season === this.filters.season;
      this.userLoading = true; this.userError = false;
      try {
        const rows = await fetchReactionRows(this.supabase, season, { userId, table: 'album_reactions' });
        if (!current()) return;
        this.userRows = rows; this.userLoadedKey = key;
      } catch { if (current()) this.userError = true; }
      finally { if (current()) this.userLoading = false; }
    },
    showMore() {
      const index = this.visibleCount;
      this.visibleCount += 12;
      this.$nextTick(() => this.$el.querySelectorAll('.spotlight-gallery .spotlight-scene-image')[index]?.focus());
    },
  },
};
</script>

<style>
.community-spotlight { max-width: 1200px; margin: 0 auto; padding: 1.5rem 1.5rem 4rem; color: var(--panel-text-color); line-height: 1.5; }
.community-spotlight p { line-height: 1.5; }
.community-spotlight .spotlight-hero { margin-bottom: 1.25rem; }
.community-spotlight h1 { font-size: clamp(2.5rem, 5vw, 3.5rem); line-height: 1.1; margin: .3rem 0 .6rem; }
.community-spotlight .spotlight-hero > p:last-child { font-size: 1.2rem; max-width: 42rem; }
.community-spotlight .spotlight-eyebrow { color: var(--accent-color); font-size: .8rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; margin: 0; }
.community-spotlight :is(button, select) { font: inherit; color: var(--panel-text-color); background: var(--panel-bg-color); border: 1px solid var(--panel-border-color); border-radius: 999px; padding: .65rem 1rem; min-height: 44px; cursor: pointer; }
.community-spotlight select { border-radius: 8px; max-width: 100%; }
.community-spotlight button:hover { border-color: var(--accent-color); }
.community-spotlight button:disabled { cursor: wait; opacity: .65; }
.community-spotlight :is(a, button, select):focus-visible { outline: 3px solid var(--accent-color); outline-offset: 4px; }
.community-spotlight .spotlight-controls { padding: .9rem 1.2rem; border: 1px solid var(--panel-border-color); border-radius: 16px; background: var(--panel-bg-soft-color); }
.community-spotlight .spotlight-scope { display: flex; gap: 1.2rem; flex-wrap: wrap; }
.community-spotlight label { display: flex; align-items: center; gap: .75rem; font-size: .95rem; font-weight: 700; }
.community-spotlight .spotlight-spoilers { margin: .9rem 0 0; font-size: .9rem; }
.community-spotlight .spotlight-views { display: flex; gap: .6rem; margin: 1rem 0; flex-wrap: wrap; }
.community-spotlight .spotlight-views button { border: 1px solid var(--accent-color); font-weight: 800; }
.community-spotlight button[aria-pressed="true"] { color: #171717; background: var(--accent-color); border-color: var(--accent-color); }
.community-spotlight .spotlight-mood-select { display: none; }
.community-spotlight .spotlight-moods { display: flex; gap: .5rem; flex-wrap: wrap; }
.community-spotlight .spotlight-moods button { font-size: .9rem; }
.community-spotlight .spotlight-moods button span { margin-right: .35em; }
.community-spotlight .spotlight-explanation { font-size: .9rem; margin: 1rem 0; }
.community-spotlight .spotlight-status { display: flex; align-items: center; justify-content: flex-end; gap: .75rem; font-size: .8rem; margin: .5rem 0 1rem; flex-wrap: wrap; }
.community-spotlight .spotlight-status button { background: transparent; padding: .4rem .8rem; }
.community-spotlight .spotlight-scene { overflow: hidden; border: 1px solid var(--panel-border-color); border-radius: 16px; background: var(--panel-bg-color); min-width: 0; }
.community-spotlight .spotlight-scene.is-featured { border-top: 3px solid var(--accent-color); margin-bottom: 2rem; }
.community-spotlight .spotlight-scene-image { display: block; aspect-ratio: 16 / 9; background: #101010; overflow: hidden; }
.community-spotlight .is-featured .spotlight-scene-image { aspect-ratio: 16 / 9; }
.community-spotlight .spotlight-scene-image img { display: block; width: 100%; height: 100%; object-fit: contain; }
.community-spotlight .spotlight-image-missing { display: grid; place-items: center; height: 100%; color: #ddd; font-size: .9rem; }
.community-spotlight .spotlight-scene-body { padding: 1.2rem; }
.community-spotlight .is-featured .spotlight-scene-body { padding: 1.5rem 1.75rem; }
.community-spotlight .spotlight-scene h2 { font-size: 1.3rem; line-height: 1.3; margin: .5rem 0; overflow-wrap: anywhere; }
.community-spotlight .is-featured h2 { font-size: clamp(1.5rem, 3vw, 2rem); }
.community-spotlight .spotlight-scene h2 a { color: var(--panel-text-color); text-decoration: none; }
.community-spotlight .spotlight-scene h2 a:hover { text-decoration: underline; text-decoration-color: var(--accent-color); }
.community-spotlight .spotlight-scene-episode { font-size: .85rem; margin: .6rem 0; }
.community-spotlight .spotlight-badges { list-style: none; display: flex; flex-wrap: wrap; gap: .4rem; margin: 1rem 0 0; padding: 0; }
html[data-theme="light"] .community-spotlight .spotlight-eyebrow { color: #805500; }
.community-spotlight .spotlight-badges li > span[aria-hidden] { margin-right: .3em; }
.community-spotlight .spotlight-badges li { border: 1px solid var(--panel-border-color); border-radius: 999px; padding: .25rem .6rem; font-size: .85rem; }
.community-spotlight .spotlight-read, .community-spotlight .spotlight-empty > a { display: inline-block; margin-top: 1rem; font-weight: 800; color: #171717; background: var(--accent-color); border-radius: 999px; padding: .7rem 1.2rem; text-decoration: none; }
.community-spotlight .spotlight-gallery { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.25rem; }
.community-spotlight .spotlight-empty, .community-spotlight .spotlight-notice { padding: 1.5rem; border: 1px solid var(--panel-border-color); border-left: 3px solid var(--accent-color); border-radius: 12px; background: var(--panel-bg-soft-color); margin: 1rem 0; }
.community-spotlight .spotlight-empty h2 { margin-top: 0; font-size: 1.5rem; }
.community-spotlight .spotlight-notice button { margin: .5rem; }
.community-spotlight .spotlight-more { text-align: center; margin: 2rem 0 0; }
.community-spotlight .spotlight-more button { border-color: var(--accent-color); font-weight: 800; }
.community-spotlight .spotlight-more p { font-size: .85rem; }
.community-spotlight .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
@media (max-width: 900px) { .community-spotlight .spotlight-gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) {
  .community-spotlight { padding: 1.5rem 1rem 3rem; }
  .community-spotlight .spotlight-gallery { grid-template-columns: minmax(0, 1fr); }
  .community-spotlight label { align-items: flex-start; flex-direction: column; width: 100%; gap: .4rem; }
  .community-spotlight select { width: 100%; }
  .community-spotlight .spotlight-scope { display: grid; grid-template-columns: 1fr 1.7fr; gap: .6rem; }
  .community-spotlight .spotlight-scope label { min-width: 0; }
  .community-spotlight .spotlight-scope select { font-size: .85rem; padding-inline: .5rem; }
  .community-spotlight .spotlight-moods { display: none; }
  .community-spotlight .spotlight-mood-select { display: flex; }
  .community-spotlight .spotlight-hero > p:last-child { font-size: 1rem; }
  .community-spotlight .spotlight-views { gap: .4rem; }
  .community-spotlight .spotlight-views button { font-size: .85rem; padding-inline: .8rem; }
  .community-spotlight .spotlight-status { justify-content: flex-start; }
  .community-spotlight .is-featured .spotlight-scene-body { padding: 1.2rem; }
}
</style>
