<template>
  <div class="supporter-page">
    <header><h1>Meet the supporters</h1><p>The people helping keep the cylinder spinning. Explore their favourite moments and their views of the map.</p>
      <div class="supporter-actions"><router-link class="supporter-button supporter-primary" to="/support/">Join the supporters</router-link><router-link v-if="user" class="supporter-button" to="/supporters/profile/">{{ allowed ? 'Create or edit your showcase' : 'My showcase' }}</router-link></div>
    </header>
    <form class="supporter-controls" @submit.prevent="applyFilters"><label>Find a supporter<input v-model="search" type="search" maxlength="80" placeholder="Search public names" /></label><label>Favourite competitor<select v-model="civ" @change="applyFilters"><option value="">All competitors</option><option v-for="name in civs" :key="name">{{ name }}</option></select></label><button type="submit">Search</button><button v-if="search || civ" type="button" @click="clearFilters">Clear filters</button></form>
    <p v-if="loading" role="status">Loading supporters…</p>
    <div v-if="error" class="supporter-panel" role="status"><p>{{ error }}</p><button @click="load()">Try again</button></div>
    <template v-else>
      <div v-if="entries.length" class="supporter-grid">
        <article v-for="(entry,index) in entries" :key="`${entry.showcase_id || entry.display_name}-${index}`" class="supporter-panel">
          <div class="supporter-card-header"><span class="supporter-dot" :style="civStyle(entry.favorite_civ)" aria-hidden="true"></span><h2><router-link v-if="entry.showcase_id" :to="showcaseLink(entry.showcase_id)">{{ entry.display_name }}</router-link><template v-else>{{ entry.display_name }}</template></h2></div>
          <p v-if="entry.flair" class="supporter-flair">{{ entry.flair }}</p><p v-if="entry.favorite_civ" class="supporter-muted">Rooting for {{ entry.favorite_civ }}</p><p v-if="entry.introduction">{{ entry.introduction }}</p><router-link v-if="entry.showcase_id" :to="showcaseLink(entry.showcase_id)">Explore showcase →</router-link>
        </article>
      </div>
      <p v-else-if="!loading">{{ search || civ ? 'No supporters match this selection. Try another name or clear your filters.' : 'Public supporter credits will appear here. Thank you to everyone helping keep CBR going.' }}</p>
      <p v-if="anonymousCount" class="supporter-anonymous-thanks">With thanks to {{ anonymousCount === 1 ? 'an anonymous supporter' : `${anonymousCount} anonymous supporters` }} as well.</p>
      <section v-if="showrunners.length" class="showcase-section" aria-labelledby="showrunners-title">
        <h2 id="showrunners-title">Behind the show</h2>
        <div class="supporter-grid showrunner-list">
          <ShowrunnerPreview v-for="entry in showrunners" :key="entry.id || entry.display_name" :profile="entry" :client="client" />
        </div>
      </section>
    </template>
    <!-- <p class="supporter-muted">This list reflects current supporter access. Episode credits preserve the supporters acknowledged when each release was prepared. Publishing a personal showcase is optional.</p> -->
  </div>
</template>
<script>
import { getSupabaseClient } from '../supabaseClient';
import { subscribeAccountAuth } from '../account/accountSync.js';
import { listFullDirectory, listShowrunners, loadShowcaseAccess } from '../components/supporters/showcaseApi.mjs';
import { civStyle, showcaseLink } from '../components/supporters/showcaseModel.mjs';
import ShowrunnerPreview from '../components/supporters/ShowrunnerPreview.vue';
import '../components/supporters/supporterPages.css';
export default {
  components: { ShowrunnerPreview },
  data: () => ({ client: null, user: null, allowed: false, search: '', civ: '', civs: [], entries: [], showrunners: [], anonymousCount: 0, loading: false, error: '' }),
  mounted() {
    this._alive = true; this.client = getSupabaseClient(); this.readFilters(); this.load();
    if (this.client) this._auth = subscribeAccountAuth(this.client, async session => { const user = session?.user || null; this.user = user; this.allowed = false; if (user) { try { const result = await loadShowcaseAccess(this.client); if (this._alive && user.id === this.user?.id) this.allowed = result.allowed === true; } catch { /* The editor offers an access retry. */ } } });
  },
  beforeUnmount() { this._alive = false; this._request++; this._auth?.unsubscribe(); },
  watch: { '$route.query'() { this.readFilters(); this.load(); } },
  methods: {
    civStyle, showcaseLink,
    readFilters() { this.search = String(this.$route.query.search || '').slice(0,80); this.civ = String(this.$route.query.civ || '').slice(0,80); },
    applyFilters() { this.$router.replace({ path: '/supporters/', query: { ...(this.search.trim() ? { search: this.search.trim() } : {}), ...(this.civ ? { civ: this.civ } : {}) } }); },
    clearFilters() { this.search = ''; this.civ = ''; this.applyFilters(); },
    async load() {
      const request = this._request = (this._request || 0) + 1; this.loading = true; this.error = '';
      this.entries = []; this.showrunners = []; this.anonymousCount = 0;
      try { const [result, showrunners] = await Promise.all([listFullDirectory(this.client, { search: this.search, civ: this.civ }), listShowrunners(this.client)]); if (!this._alive || request !== this._request) return; this.entries = result.entries; this.showrunners = showrunners; this.civs = result.civs; this.anonymousCount = result.anonymous_count; }
      catch(error) { if (this._alive && request === this._request) this.error = error.message; }
      finally { if (this._alive && request === this._request) this.loading = false; }
    },
  },
};
</script>
