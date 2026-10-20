<template>
  <div class="showcase-content">
    <header class="showcase-identity">
      <span class="supporter-emblem" :style="civStyle(profile.favorite_civ)" aria-hidden="true"></span>
      <div><p class="supporter-eyebrow">{{ profile.is_showrunner ? 'CBR showrunner' : profile.active ? 'CBR supporter' : 'CBR community' }}</p><h1>{{ profile.display_name }}</h1><p v-if="profile.flair" class="supporter-flair">{{ profile.flair }}</p></div>
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
    <p v-if="contentLoading" role="status">Loading public contributions…</p>
    <p v-else-if="contentError" role="status">Public contributions could not be loaded. <button @click="loadContent">Try again</button></p>
    <section v-if="publicContent?.collections?.length" class="showcase-section">
      <h2>My scene collections</h2>
      <div class="supporter-grid"><article v-for="collection in publicContent.collections" :key="collection.id" class="supporter-panel"><h3>{{ collection.title }}</h3><p v-if="collection.description">{{ collection.description }}</p><p class="supporter-muted">{{ collection.scene_count }} scenes</p><router-link :to="collectionLink(collection.id)">Read collection →</router-link></article></div>
    </section>
    <section v-if="mapViews.length" class="showcase-section">
      <h2>My map views</h2>
      <article v-for="view in mapViews" :key="view.id" class="supporter-panel showcase-map">
        <h3>{{ view.title }}</h3><p v-if="view.description">{{ view.description }}</p><p class="supporter-muted">{{ savedViewLabel(view.settings) }}</p>
        <div class="supporter-actions"><router-link :to="mapLink(view.id)" class="supporter-button">Open view</router-link><button v-if="!preview" type="button" :disabled="busy[view.id]" @click="follow(view)">{{ following[view.id] ? 'Following · Unfollow' : 'Follow' }}</button></div>
        <div v-if="signInId === view.id && !user" class="showcase-signin"><p>Follow this view with an account. After signing in, choose Follow to add it to your list.</p><EmailSignInForm :scene-number="0" /><button @click="signInId = ''">Close sign-in</button></div>
      </article>
      <p v-if="message" role="status">{{ message }}</p>
    </section>
    <section v-if="mapPins.length" class="showcase-section">
      <h2>My shared map pins</h2>
      <div class="supporter-grid"><article v-for="pin in mapPins" :key="showcasePinKey(pin)" class="supporter-panel"><h3>{{ pin.name }}</h3><p class="supporter-muted">{{ [pin.city_name, pin.owner_name, `Tile ${pin.tile_key}`].filter(Boolean).join(' · ') }}</p><router-link :to="showcaseMapLink(pin)">Open pin on the map →</router-link></article></div>
    </section>
    <section v-if="publicContent?.map_notes?.length" class="showcase-section">
      <h2>My map notes</h2>
      <div class="supporter-grid"><article v-for="(note,index) in publicContent.map_notes" :key="`${note.map_id}:${note.tile_key}:${index}`" class="supporter-panel"><h3>Tile {{ note.tile_key }}</h3><p class="supporter-muted">{{ note.source_label }}</p><p class="showcase-public-text">{{ note.note }}</p><router-link :to="showcaseMapLink(note)">Open location on the map →</router-link></article></div>
    </section>
    <section v-if="publicContent?.comments?.length" class="showcase-section">
      <h2>Episode discussions</h2>
      <div class="supporter-grid"><article v-for="comment in publicContent.comments" :key="comment.id" class="supporter-panel"><h3>{{ commentAlbumLabel(comment) }}</h3><p class="showcase-public-text">{{ comment.message }}</p><router-link :to="{ path: comment.page_path, hash: '#comments-title' }">Read discussion →</router-link></article></div>
    </section>
  </div>
</template>
<script>
import { collectionLink } from '../collections/collectionModel.mjs';
import { getShowcaseContent } from './showcaseApi.mjs';
import SpotlightScene from '../spotlight/SpotlightScene.vue';
import EmailSignInForm from '../account/EmailSignInForm.vue';
import { sceneCards, civStyle, showcasePinKey, showcaseMapLink } from './showcaseModel.mjs';
import { setSavedViewFollow } from '../community/map/savedViewsApi.mjs';
import { savedViewLabel } from '../community/map/savedViewSettings.mjs';
export default {
  components: { SpotlightScene, EmailSignInForm },
  props: { profile: Object, episodes: { type: Array, default: () => [] }, client: Object, user: Object, preview: Boolean },
  data: () => ({ publicContent: null, contentLoading: false, contentError: false, season: '', through: 'all', following: {}, busy: {}, message: '', signInId: '' }),
  computed: {
    mapViews() { return this.publicContent?.map_views || (this.preview ? this.profile.map_views || [] : []); },
    mapPins() { return this.preview ? this.profile.map_pins || [] : this.publicContent?.map_pins || this.profile.map_pins || []; },
    competitors() { return [...new Set([this.profile.favorite_civ, ...(this.profile.competitors || [])].filter(Boolean))]; },
    allScenes() { return sceneCards(this.episodes, this.profile.scenes || []); },
    seasons() { return [...new Set(this.allScenes.map(s => s.season))].sort((a,b) => Number(b.slice(1))-Number(a.slice(1))); },
    episodeOptions() { return [...new Set(this.episodes.filter(e => e.season === this.season).map(e => e.number))].sort((a,b) => b-a); },
    visibleScenes() { return sceneCards(this.episodes, this.profile.scenes || [], this.through, this.season); },
  },
  watch: { seasons: { immediate: true, handler(items) { if (!items.includes(this.season)) this.season = items[0] || ''; } }, season() { this.through = 'all'; }, 'user.id'() { this.loadFollows(); }, 'profile.id'() { this.loadContent(); this.loadFollows(); }, mapViews() { if(this._alive) this.loadFollows(); } },
  mounted() { this._alive = true; this.loadContent(); this.loadFollows(); }, beforeUnmount() { this._alive = false; this._contentRequest++; this._followRequest++; },
  methods: {
    civStyle, savedViewLabel, collectionLink, showcasePinKey, showcaseMapLink,
    commentAlbumLabel(comment) { return this.episodes.find(episode=>episode.path===comment.page_path)?.title || 'Episode discussion'; },
    async loadContent() {
      const request=this._contentRequest=(this._contentRequest||0)+1;
      this.publicContent=null; this.contentError=false; this.contentLoading=!!this.profile.id;
      if(!this.profile.id) return;
      try { const content=await getShowcaseContent(this.client,this.profile.id); if(this._alive && request===this._contentRequest) this.publicContent=content; }
      catch { if(this._alive && request===this._contentRequest) this.contentError=true; }
      finally { if(this._alive && request===this._contentRequest) this.contentLoading=false; }
    }, mapLink(id) { return `/community-tile-map/?saved_view=${encodeURIComponent(id)}`; },
    async loadFollows() {
      const request = this._followRequest = (this._followRequest || 0) + 1, userId = this.user?.id;
      this.following = {}; this.busy = {}; this.signInId = ''; this.message = '';
      const ids = this.mapViews.map(v => v.id);
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
