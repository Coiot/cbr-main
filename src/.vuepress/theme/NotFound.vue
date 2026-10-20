<template>
  <Layout>
    <section class="not-found" aria-labelledby="not-found-title">
      <AlbumsNav compact label="Page recovery navigation" :archive="{ to: '/', label: 'Back to the homepage' }" />
      <p class="not-found-code">404 · Page not found</p>
      <h1 id="not-found-title">Lost in the fog of war?</h1>
      <p class="not-found-intro">We couldn’t find this page. Search for an episode, scene, or civilization, or find your way back to the show.</p>
      <form class="not-found-search" role="search" @submit.prevent="search">
        <label for="recovery-search">Search the archive</label>
        <div class="not-found-search-row">
          <input id="recovery-search" v-model="query" type="search" placeholder="Episode title, narrator, civilization…" />
          <button type="submit">Search</button>
        </div>
      </form>
      <div class="not-found-links">
        <router-link to="/albums/" class="recovery-card">
          <strong>Browse the archive <span aria-hidden="true">→</span></strong>
          <span>Find episodes and power rankings from every season.</span>
        </router-link>
        <router-link v-if="latest" :to="latest.path" class="recovery-card">
          <strong>Read the latest <span aria-hidden="true">→</span></strong>
          <span>{{ latest.frontmatter.title }}</span>
        </router-link>
        <router-link to="/start-here/" class="recovery-card">
          <strong>New? Start here <span aria-hidden="true">→</span></strong>
          <span>Meet Civ Battle Royale and start watching.</span>
        </router-link>
      </div>
    </section>
  </Layout>
</template>

<script>
import Layout from './Layout.vue';
import AlbumsNav from './components/albums/AlbumsNav.vue';
import { latestEpisode } from './components/home/latestEpisode.js';

export default {
  components: { Layout, AlbumsNav },
  data: () => ({ query: '' }),
  computed: {
    latest() { return latestEpisode(this.$site?.pages || []); },
  },
  methods: {
    search() {
      window.dispatchEvent(new CustomEvent('open-site-search', { detail: { query: this.query.trim() } }));
    },
  },
};
</script>

<style scoped>
.not-found { max-inline-size: 960px; margin-inline: auto; padding: clamp(2rem, 6vw, 5rem) 1.25rem; }
.not-found-code { color: var(--field-label-color); font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.not-found h1 { margin-block: 1rem; font-size: clamp(2rem, 5vw, 3.4rem); }
.not-found-intro { max-inline-size: 44rem; color: var(--color-text-muted); line-height: 1.6; }
.not-found-search {
  margin-block: 2rem;
  padding: 1.25rem;
  color: var(--panel-text-color);
  background: var(--panel-bg-color);
  border: 1px solid var(--panel-border-color);
  border-block-start: 3px solid var(--accent-color);
  border-radius: 12px;
}
.not-found-search label { display: block; margin-block-end: 0.75rem; font-weight: 800; }
.not-found-search-row { display: flex; gap: 0.75rem; }
.not-found-search input {
  flex: 1;
  min-inline-size: 0;
  inline-size: 100%;
  box-sizing: border-box;
  padding: 0.8rem;
  color: var(--panel-text-color);
  background: var(--panel-bg-soft-color);
  border: 1px solid var(--panel-border-color);
  border-radius: 8px;
  font: inherit;
}
.not-found-search button {
  padding: 0.75rem 1.25rem;
  font: inherit;
  font-weight: 800;
  color: #1a1a1a;
  background: var(--accent-color);
  border: 1px solid var(--accent-color);
  border-radius: 999px;
  cursor: pointer;
}
.not-found-links { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-block-end: 2rem; }
.recovery-card {
  display: grid;
  align-content: start;
  gap: 0.65rem;
  padding: 1.25rem;
  color: var(--panel-text-color);
  background: var(--panel-bg-color);
  border: 1px solid var(--panel-border-color);
  border-block-start: 3px solid var(--accent-color);
  border-radius: 12px;
  text-decoration: none;
}
.recovery-card strong { color: var(--field-label-color); font-size: 1.1rem; }
.recovery-card > span { color: var(--color-text-muted); line-height: 1.5; }
.recovery-card:hover { border-color: var(--accent-color); }
.not-found :is(a, button, input):focus-visible { outline: 3px solid var(--accent-color); outline-offset: 4px; }
@media (max-width: 650px) { .not-found-links { grid-template-columns: 1fr; } }
@media (max-width: 400px) { .not-found-search-row { flex-direction: column; } }
</style>
