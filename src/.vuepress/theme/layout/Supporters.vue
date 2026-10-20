<template>
  <div class="supporter-page">
    <header><h1>Meet the supporters</h1><p>The people helping keep the cylinder spinning. Explore their favourite moments and their views of the map.</p>
      <div class="supporter-actions"><router-link class="supporter-button supporter-primary" to="/support/">Join the supporters</router-link><router-link v-if="user" class="supporter-button" to="/supporters/profile/">{{ allowed ? 'Create or edit your showcase' : 'My showcase' }}</router-link></div>
    </header>
    <form class="supporter-controls" @submit.prevent="applyFilters"><label>Find a supporter<input v-model="search" type="search" maxlength="80" placeholder="Search public names" /></label><label>Favourite competitor<select v-model="civ" @change="applyFilters"><option value="">All competitors</option><option v-for="name in civs" :key="name">{{ name }}</option></select></label><button type="submit">Search</button><button v-if="search || civ" type="button" @click="clearFilters">Clear filters</button></form>
    <p v-if="loading" role="status">Loading supporters…</p>
    <div v-if="error" class="supporter-panel" role="status"><p>{{ error }}</p><button @click="load(true)">Try again</button></div>
    <template v-else>
      <div v-if="entries.length" class="supporter-grid">
        <article v-for="(entry,index) in entries" :key="`${entry.showcase_id || entry.display_name}-${index}`" class="supporter-panel">
          <div class="supporter-card-header"><span class="supporter-dot" :style="civStyle(entry.favorite_civ)" aria-hidden="true"></span><h2><router-link v-if="entry.showcase_id" :to="showcaseLink(entry.showcase_id)">{{ entry.display_name }}</router-link><template v-else>{{ entry.display_name }}</template></h2></div>
          <p v-if="entry.flair" class="supporter-flair">{{ entry.flair }}</p><p v-if="entry.favorite_civ" class="supporter-muted">Rooting for {{ entry.favorite_civ }}</p><p v-if="entry.introduction">{{ entry.introduction }}</p><router-link v-if="entry.showcase_id" :to="showcaseLink(entry.showcase_id)">Explore showcase →</router-link>
        </article>
      </div>
      <p v-else-if="!loading">{{ search || civ ? 'No supporters match this selection. Try another name or clear your filters.' : 'Public supporter credits will appear here. Thank you to everyone helping keep CBR going.' }}</p>
      <button v-if="entries.length < total" :disabled="loading" @click="load(false)">Show more supporters</button>
      <p v-if="anonymousCount" class="supporter-muted">With thanks to {{ anonymousCount === 1 ? 'an anonymous supporter' : `${anonymousCount} anonymous supporters` }} as well.</p>
    </template>
    <p class="supporter-muted">This list reflects current supporter access. Episode credits preserve the supporters acknowledged when each release was prepared. Publishing a personal showcase is optional.</p>
  </div>
</template>
<script>
import { getSupabaseClient } from '../supabaseClient';
import { subscribeAccountAuth, getAccountSync } from '../account/accountSync.js';
import { listDirectory } from '../components/supporters/showcaseApi.mjs';
import { civStyle, showcaseLink } from '../components/supporters/showcaseModel.mjs';
import '../components/supporters/supporterPages.css';
export default {
  data: () => ({ client: null, user: null, allowed: false, search: '', civ: '', civs: [], entries: [], total: 0, anonymousCount: 0, loading: false, error: '' }),
  mounted() {
    this._alive = true; this.client = getSupabaseClient(); this.readFilters(); this.load(true);
    if (this.client) this._auth = subscribeAccountAuth(this.client, async session => { const user = session?.user || null; this.user = user; this.allowed = false; if (user) { const result = await getAccountSync(this.client).refreshSupporter(user); if (this._alive && user.id === this.user?.id) this.allowed = !result.error && result.allowed; } });
  },
  beforeUnmount() { this._alive = false; this._request++; this._auth?.unsubscribe(); },
  watch: { '$route.query'() { this.readFilters(); this.load(true); } },
  methods: {
    civStyle, showcaseLink,
    readFilters() { this.search = String(this.$route.query.search || '').slice(0,80); this.civ = String(this.$route.query.civ || '').slice(0,80); },
    applyFilters() { this.$router.replace({ path: '/supporters/', query: { ...(this.search.trim() ? { search: this.search.trim() } : {}), ...(this.civ ? { civ: this.civ } : {}) } }); },
    clearFilters() { this.search = ''; this.civ = ''; this.applyFilters(); },
    async load(reset) {
      if (!reset && this.loading) return;
      const request = this._request = (this._request || 0) + 1; this.loading = true; this.error = '';
      if (reset) this.entries = [];
      try { const result = await listDirectory(this.client, { search: this.search, civ: this.civ, offset: this.entries.length }); if (!this._alive || request !== this._request) return; this.entries.push(...result.entries); this.total = result.total; this.civs = result.civs; this.anonymousCount = result.anonymous_count; }
      catch(error) { if (this._alive && request === this._request) this.error = error.message; }
      finally { if (this._alive && request === this._request) this.loading = false; }
    },
  },
};
</script>
