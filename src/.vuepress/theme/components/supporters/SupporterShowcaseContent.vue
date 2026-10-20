<template>
  <div class="showcase-content">
    <header class="showcase-identity">
      <span class="supporter-emblem" :style="civStyle(profile.favorite_civ)" aria-hidden="true">{{ profile.favorite_civ ? profile.favorite_civ.slice(0, 1) : '✦' }}</span>
      <div><p class="supporter-eyebrow">{{ profile.active ? 'CBR supporter' : 'CBR community' }}</p><h1>{{ profile.display_name }}</h1><p v-if="profile.flair" class="supporter-flair">{{ profile.flair }}</p></div>
    </header>
    <p v-if="profile.introduction" class="showcase-introduction">{{ profile.introduction }}</p>
    <section v-if="competitors.length" class="showcase-section"><h2>Rooting for</h2><ul class="supporter-chips"><li v-for="civ in competitors" :key="civ"><span class="supporter-dot" :style="civStyle(civ)" aria-hidden="true"></span>{{ civ }}</li></ul></section>
    <section v-if="allScenes.length" class="showcase-section">
      <h2>Moments worth another look</h2>
      <div class="supporter-controls">
        <label>Season<select v-model="season"><option v-for="item in seasons" :key="item" :value="item">Season {{ item.slice(1) }}</option></select></label>
        <label>Show through<select v-model="through"><option value="all">All released episodes</option><option v-for="episode in episodeOptions" :key="episode" :value="String(episode)">Episode {{ episode }}</option></select></label>
      </div>
      <p class="supporter-muted">Highlights contain spoilers. Choose the episode you’ve reached to hide later moments.</p>
      <div v-if="visibleScenes.length" class="showcase-scenes"><SpotlightScene v-for="scene in visibleScenes" :key="scene.id" :scene="scene" /></div>
      <p v-else>No selected moments through this episode. Try another season or episode limit.</p>
    </section>
    <FeaturedCollections v-if="!preview && profile.id" :client="client" :showcase-id="profile.id" />
    <section v-if="profile.map_views?.length" class="showcase-section">
      <h2>My map views</h2>
      <article v-for="view in profile.map_views" :key="view.id" class="supporter-panel showcase-map">
        <h3>{{ view.title }}</h3><p v-if="view.description">{{ view.description }}</p><p class="supporter-muted">{{ savedViewLabel(view.settings) }}</p>
        <div class="supporter-actions"><router-link :to="mapLink(view.id)" class="supporter-button">Open view</router-link><button v-if="!preview" type="button" :disabled="busy[view.id]" @click="follow(view)">{{ following[view.id] ? 'Following · Unfollow' : 'Follow' }}</button></div>
        <div v-if="signInId === view.id && !user" class="showcase-signin"><p>Follow this view with an account. After signing in, choose Follow to add it to your list.</p><EmailSignInForm :scene-number="0" /><button @click="signInId = ''">Close sign-in</button></div>
      </article>
      <p v-if="message" role="status">{{ message }}</p>
    </section>
  </div>
</template>
<script>
import FeaturedCollections from '../collections/FeaturedCollections.vue';
import SpotlightScene from '../spotlight/SpotlightScene.vue';
import EmailSignInForm from '../account/EmailSignInForm.vue';
import { sceneCards, civStyle } from './showcaseModel.mjs';
import { setSavedViewFollow } from '../community/map/savedViewsApi.mjs';
import { savedViewLabel } from '../community/map/savedViewSettings.mjs';
export default {
  components: { SpotlightScene, EmailSignInForm, FeaturedCollections },
  props: { profile: Object, episodes: { type: Array, default: () => [] }, client: Object, user: Object, preview: Boolean },
  data: () => ({ season: '', through: 'all', following: {}, busy: {}, message: '', signInId: '' }),
  computed: {
    competitors() { return [...new Set([this.profile.favorite_civ, ...(this.profile.competitors || [])].filter(Boolean))]; },
    allScenes() { return sceneCards(this.episodes, this.profile.scenes || []); },
    seasons() { return [...new Set(this.allScenes.map(s => s.season))].sort((a,b) => Number(b.slice(1))-Number(a.slice(1))); },
    episodeOptions() { return [...new Set(this.episodes.filter(e => e.season === this.season).map(e => e.number))].sort((a,b) => b-a); },
    visibleScenes() { return sceneCards(this.episodes, this.profile.scenes || [], this.through, this.season); },
  },
  watch: { seasons: { immediate: true, handler(items) { if (!items.includes(this.season)) this.season = items[0] || ''; } }, season() { this.through = 'all'; }, 'user.id'() { this.loadFollows(); }, 'profile.id'() { this.loadFollows(); } },
  mounted() { this._alive = true; this.loadFollows(); }, beforeUnmount() { this._alive = false; this._followRequest++; },
  methods: {
    civStyle, savedViewLabel, mapLink(id) { return `/community-tile-map/?saved_view=${encodeURIComponent(id)}`; },
    async loadFollows() {
      const request = this._followRequest = (this._followRequest || 0) + 1, userId = this.user?.id;
      this.following = {}; this.busy = {}; this.signInId = ''; this.message = '';
      const ids = (this.profile.map_views || []).map(v => v.id);
      if (!userId || !ids.length || this.preview) return;
      const { data, error } = await this.client.from('map_view_follows').select('view_id').eq('user_id', userId).in('view_id', ids);
      if (!this._alive || request !== this._followRequest || userId !== this.user?.id) return;
      if (error) { this.message = 'Your followed views could not be checked. Try reopening this page.'; return; }
      this.following = Object.fromEntries((data || []).map(row => [row.view_id, true]));
    },
    async follow(view) {
      if (!this.user) { this.signInId = view.id; return; }
      if (this.busy[view.id]) return;
      const userId = this.user.id, request = this._followRequest, next = !this.following[view.id]; this.busy[view.id] = true;
      try { await setSavedViewFollow(this.client, userId, view.id, next); if (this._alive && request === this._followRequest && userId === this.user?.id) { this.following[view.id] = next; this.message = next ? 'View added to Following on the community map.' : 'View removed from Following.'; } }
      catch(error) { if (this._alive && request === this._followRequest) this.message = error.message; }
      finally { if (this._alive && request === this._followRequest) this.busy[view.id] = false; }
    },
  },
};
</script>
