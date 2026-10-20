<template>
  <div class="supporter-page">
    <AlbumsNav compact label="Showcase navigation" :archive="{ to: '/supporters/', label: 'Meet the supporters' }" />
    <p v-if="loading" role="status">Loading showcase…</p>
    <div v-if="error" class="supporter-panel" role="status"><p>{{ error }}</p><button @click="load">Try again</button></div>
    <template v-else-if="publicId">
      <template v-if="profile"><SupporterShowcaseContent :profile="profile" :episodes="episodes" :client="client" :user="user" /><div class="supporter-actions"><router-link class="supporter-button supporter-primary" to="/support/">Make your mark. Support CBR</router-link></div></template>
      <div v-else-if="!loading" class="supporter-panel"><h1>Showcase unavailable</h1><p>This showcase may be private or have been removed. You can still meet the current supporters.</p></div>
    </template>
    <template v-else-if="!loading">
      <h1>My showcase</h1>
      <div v-if="!user" class="supporter-panel"><p>Sign in with your Ko-fi payment email to create or manage your supporter showcase.</p><EmailSignInForm :scene-number="0" /></div>
      <template v-else>
        <div v-if="accessError" class="supporter-panel"><p>Your supporter access could not be checked. Your existing showcase is safe.</p><button @click="refreshAccess">Check access again</button></div>
        <p v-else-if="!allowed">{{ expired ? 'Your supporter access has ended. Your showcase remains available, and you can hide or delete it anytime.' : 'Creating and customizing a showcase is a supporter perk.' }} <router-link to="/support/">{{ expired ? 'Support CBR again anytime' : 'See supporter perks' }}</router-link>.</p>
        <div class="supporter-actions"><button v-if="allowed || previewing" :aria-pressed="previewing" @click="previewing = !previewing">{{ previewing ? 'Back to editing' : 'Preview showcase' }}</button><router-link v-if="own?.published" class="supporter-button" :to="showcaseLink(own.id)">View published showcase</router-link></div>
        <template v-if="previewing"><p class="supporter-muted">Private preview — your changes appear publicly only after you publish or save them.</p><SupporterShowcaseContent :profile="previewProfile" :episodes="episodes" :client="client" :user="user" preview /></template>
        <form v-else class="showcase-editor" @submit.prevent="save(false)">
          <section class="supporter-panel"><h2>Your identity</h2><p><strong>{{ identity.display_name }}</strong> <span v-if="identity.flair" class="supporter-flair">{{ identity.flair }}</span></p><p v-if="identity.favorite_civ">Favourite civ: {{ identity.favorite_civ }}</p><p class="supporter-muted">Your username, flair, and favourite civ come from your account preferences.</p><button type="button" @click="openAccount">Edit account preferences</button></section>
          <fieldset :disabled="!allowed || saving"><legend>Introduce yourself</legend><label>A little about you <span class="supporter-muted">Optional · {{ draft.introduction.length }}/400</span><textarea v-model="draft.introduction" rows="4" maxlength="400" placeholder="Your favourite CBR memories, allegiances, or beautifully doomed predictions…"></textarea></label></fieldset>
          <fieldset :disabled="!allowed || saving">
            <legend>Competitors you’re rooting for · {{ competitorCount }}/{{ maxCompetitors }}</legend>
            <p class="supporter-muted">Your favourite civ comes first. Choose up to {{ maxCompetitors }} favourites, including up to {{ maxAdditionalCompetitors }} additional competitors.</p>
            <label class="showcase-primary-competitor">Favourite competitor<input :value="identity.favorite_civ || 'Not selected — choose in account preferences'" readonly /></label>
            <ul v-if="draft.competitors.length" class="showcase-competitor-choices" aria-label="Additional favourite competitors">
              <li v-for="(civ,index) in draft.competitors" :key="civ"><span>{{ civ }}</span><button type="button" :aria-label="`Remove ${civ}`" @click="draft.competitors.splice(index,1)">×</button></li>
            </ul>
            <label v-if="draft.competitors.length < maxAdditionalCompetitors" class="showcase-add-competitor">Add a competitor
              <select v-model="competitorToAdd" @change="addCompetitor"><option value="">Choose a competitor…</option><option v-for="civ in availableCivs" :key="civ" :value="civ">{{ civ }}</option></select>
            </label>
          </fieldset>
          <fieldset :disabled="!allowed || saving"><legend>Moments worth another look · {{ draft.scenes.length }}/6</legend>
            <p class="supporter-muted">Choose from scenes you’ve starred or hearted. Only your selected scenes are published.</p>
            <ol v-if="draft.scenes.length" class="showcase-selected"><li v-for="(scene,index) in selectedSceneRows" :key="sceneKey(scene)"><span>{{ scene.label }}</span><div class="supporter-actions"><button type="button" :disabled="index===0" :aria-label="`Move scene ${index+1} up`" @click="moveScene(index,-1)">↑ Up</button><button type="button" :disabled="index===draft.scenes.length-1" :aria-label="`Move scene ${index+1} down`" @click="moveScene(index,1)">↓ Down</button><button type="button" @click="draft.scenes.splice(index,1)">Remove</button></div></li></ol>
            <label>Find a favourite<input v-model="favouriteSearch" type="search" placeholder="Search titles or episode numbers" /></label>
            <div class="showcase-picker"><label v-for="scene in filteredFavourites" :key="scene.id"><input type="checkbox" :checked="sceneSelected(scene)" :disabled="!sceneSelected(scene) && draft.scenes.length>=6" @change="toggleScene(scene)" /><span>Season {{ scene.season.slice(1) }} · Episode {{ scene.episodeNumber }} · Scene {{ scene.sceneNumber }} — {{ scene.title }}</span></label></div>
            <p v-if="!favourites.length">Star or heart scenes while reading, then return here to choose your highlights.</p><p v-else-if="!filteredFavourites.length">No favourites match that search.</p><button v-if="filteredFavourites.length < matchingFavourites.length" type="button" @click="favouriteLimit += 40">Show more favourites</button>
          </fieldset>
          <section class="supporter-panel"><h2>Your public contributions</h2><p>Your published showcase automatically includes all your public scene collections, map views, authored map notes, and episode comments. Private or hidden content stays private.</p><div class="supporter-actions"><router-link class="supporter-button" to="/collections/?view=mine">Manage collections</router-link><router-link class="supporter-button" to="/community-tile-map/">Manage map contributions</router-link></div></section>
          <fieldset :disabled="!allowed || saving"><legend>Share map pins · {{ draft.map_pins.length }}/100</legend><p class="supporter-muted">Pins are saved in this browser. Choose which pins to copy to your public showcase; other pins stay private. Save your showcase to apply changes.</p><div class="showcase-picker"><label v-for="pin in availablePins" :key="showcasePinKey(pin)"><input type="checkbox" :checked="pinSelected(pin)" :disabled="!pinSelected(pin) && draft.map_pins.length>=100" @change="togglePin(pin)" /><span>{{ pin.name }} · Tile {{ pin.tile_key }}</span></label></div><p v-if="!availablePins.length">Save named pins on the community map, then return here to choose what to share.</p><button type="button" @click="readLocalPins">Refresh pins from this browser</button></fieldset>
          <p v-if="allowed">Publishing makes your name, flair, favourite competitors, introduction, selected highlights and shared pins visible to anyone, alongside your existing public contributions. Your email, donation amount, reading progress, and other favourites remain private.</p>
          <div v-if="allowed" class="supporter-actions"><button type="submit" :disabled="saving">{{ saving ? 'Saving…' : own?.published ? 'Save published showcase' : 'Save private draft' }}</button><button v-if="!own?.published" type="button" class="supporter-primary" :disabled="saving" @click="save(true)">Publish showcase</button></div>
        </form>
        <section class="supporter-panel showcase-privacy"><h2>Visibility</h2><p>Your public credit name can appear in the current supporters directory without publishing a showcase. You can hide your directory entry here; existing episode artwork stays unchanged.</p><button :disabled="saving" @click="toggleDirectory">{{ directoryHidden ? 'Show my directory entry' : 'Hide my directory entry' }}</button>
          <div v-if="own" class="supporter-actions"><button v-if="own.published" :disabled="saving" @click="unpublish">Unpublish showcase</button><template v-if="confirmDelete"><span>Delete your showcase and its selections?</span><button :disabled="saving" @click="remove">Delete permanently</button><button :disabled="saving" @click="confirmDelete = false">Keep showcase</button></template><button v-else :disabled="saving" @click="confirmDelete = true">Delete showcase…</button></div>
        </section>
      </template>
    </template>
    <p v-if="metadataError" role="status">Scene previews could not be loaded. <button @click="loadEpisodes">Retry scene previews</button></p>
    <p v-if="message" role="status" aria-live="polite">{{ message }}</p>
  </div>
</template>
<script>
import { getSupabaseClient } from '../supabaseClient';
import { getAccountSync, subscribeAccountAuth } from '../account/accountSync.js';
import { getEdition } from '../../data/editions';
import { buildEpisodes, buildFavourites } from '../components/spotlight/spotlightModel.mjs';
import { fetchReactionRows } from '../components/spotlight/spotlightData.mjs';
import { listSavedViews } from '../components/community/map/savedViewsApi.mjs';
import { getShowcase, loadOwnShowcase, saveShowcase, unpublishShowcase, deleteShowcase, setDirectoryHidden, loadShowcaseAccess } from '../components/supporters/showcaseApi.mjs';
import { showcaseLink, sceneCards, sceneKey, additionalCompetitors, MAX_SHOWCASE_COMPETITORS, MAX_ADDITIONAL_COMPETITORS, localShowcasePins, showcasePinKey } from '../components/supporters/showcaseModel.mjs';
import SupporterShowcaseContent from '../components/supporters/SupporterShowcaseContent.vue';
import AlbumsNav from '../components/albums/AlbumsNav.vue';
import EmailSignInForm from '../components/account/EmailSignInForm.vue';
import publicConfig from '../../../shared/publicConfig.json';
import '../components/supporters/supporterPages.css';
const blank = () => ({ introduction: '', competitors: [], scenes: [], map_views: [], map_pins: [], published: false });
export default {
  components: { SupporterShowcaseContent, EmailSignInForm, AlbumsNav },
  data: () => ({ client: null, user: null, loading: true, error: '', message: '', profile: null, own: null,
    episodes: [], metadataError: false, allowed: false, isShowrunner: false, expired: false, accessError: false, saving: false, directoryHidden: false,
    maxCompetitors: MAX_SHOWCASE_COMPETITORS, maxAdditionalCompetitors: MAX_ADDITIONAL_COMPETITORS, competitorToAdd: '',
    identity: { display_name: 'CBR supporter', flair: '', favorite_civ: '' }, draft: blank(), favourites: [], favouriteSearch: '', favouriteLimit: 40,
    mapViews: [], localPins: [], previewing: false, confirmDelete: false }),
  computed: {
    availablePins() { return [...new Map([...this.draft.map_pins,...this.localPins].map(pin=>[showcasePinKey(pin),pin])).values()]; },
    publicId() { return this.$route.query.id ? String(this.$route.query.id) : ''; },
    civOptions() { return [...new Set([...(getEdition('s5')?.competitors || []).map(c=>c.name),'Babylon',this.identity.favorite_civ,...this.draft.competitors].filter(Boolean))].sort((a,b)=>a.localeCompare(b)); },
    availableCivs() { return this.civOptions.filter(civ=>civ!==this.identity.favorite_civ && !this.draft.competitors.includes(civ)); },
    competitorCount() { return this.draft.competitors.length + (this.identity.favorite_civ ? 1 : 0); },
    matchingFavourites() { const text = this.favouriteSearch.trim().toLowerCase(); return this.favourites.filter(s=>!text || `${s.title} ${s.episodeNumber} ${s.sceneNumber}`.toLowerCase().includes(text)); },
    filteredFavourites() { return this.matchingFavourites.slice(0,this.favouriteLimit); },
    selectedSceneRows() {
      const cards = new Map(sceneCards(this.episodes, this.draft.scenes).map(card => [card.id, card]));
      return this.draft.scenes.map(scene => {
        const card = cards.get(sceneKey(scene));
        return { ...scene, label: card ? `Season ${card.season.slice(1)} · Episode ${card.episodeNumber} · Scene ${card.sceneNumber} — ${card.title}` : `${scene.path} · Scene ${scene.number}` };
      });
    },
    previewProfile() { return { ...this.identity, id: this.own?.id || '', active: this.allowed && !this.isShowrunner, is_showrunner: this.isShowrunner, introduction: this.draft.introduction, competitors: this.draft.competitors.filter(Boolean), scenes: this.draft.scenes, map_views: this.mapViews, map_pins: this.draft.map_pins }; },
  },
  watch: { '$route.query.id'() { this.load(); }, favouriteSearch() { this.favouriteLimit=40; } },
  mounted() {
    this._alive=true; this.client=getSupabaseClient();
    this._identityUpdate=event=>{ if(event.detail?.userId===this.user?.id) { if(event.detail.profile?.supporter_status) this.refreshAccess(); this.readIdentity(); } };
    this._visibility=()=>{ if(!document.hidden && this.user && !this.publicId) this.refreshAccess(); };
    window.addEventListener('account-profile-updated',this._identityUpdate); window.addEventListener('user-settings-synced',this._identityUpdate); document.addEventListener('visibilitychange',this._visibility);
    this.readLocalPins(); this.loadEpisodes();
    if(this.client) this._auth=subscribeAccountAuth(this.client,session=>{ const user=session?.user||null; if(this._authReady && this.user?.id===user?.id) return; this._authReady=true; this.user=user; this.load(); });
    else { this.loading=false; this.error='The account connection is unavailable. Please try again.'; }
  },
  beforeUnmount() { this._alive=false; this._request++; this._metadataRequest++; this._auth?.unsubscribe(); window.removeEventListener('account-profile-updated',this._identityUpdate); window.removeEventListener('user-settings-synced',this._identityUpdate); document.removeEventListener('visibilitychange',this._visibility); },
  methods: {
    showcaseLink, sceneKey, showcasePinKey, openAccount() { window.dispatchEvent(new CustomEvent('open-account-menu')); },
    readLocalPins() { try { this.localPins=localShowcasePins(window.localStorage.getItem('cbr.mapPins.v1'),publicConfig.MAP_ID); } catch { this.localPins=[]; } },
    pinSelected(pin) { return this.draft.map_pins.some(row=>showcasePinKey(row)===showcasePinKey(pin)); },
    togglePin(pin) { const index=this.draft.map_pins.findIndex(row=>showcasePinKey(row)===showcasePinKey(pin)); if(index>=0) this.draft.map_pins.splice(index,1); else if(this.draft.map_pins.length<100) this.draft.map_pins.push({...pin}); },
    addCompetitor() {
      if(this.allowed && this.availableCivs.includes(this.competitorToAdd) && this.draft.competitors.length < MAX_ADDITIONAL_COMPETITORS) this.draft.competitors.push(this.competitorToAdd);
      this.competitorToAdd='';
    },
    async loadEpisodes() {
      const request=this._metadataRequest=(this._metadataRequest||0)+1; this.metadataError=false;
      try { const lists=await Promise.all(['index','scene-index'].map(async name=>{ const response=await fetch(this.$withBase(`/data/albums/${name}.json`)); if(!response.ok) throw new Error(); const payload=await response.json(); if(!Array.isArray(payload.albums)) throw new Error(); return payload.albums; })); if(this._alive && request===this._metadataRequest) { this.episodes=buildEpisodes(...lists); if(this.user && !this.publicId) await this.loadFavourites(this._request); } }
      catch { if(this._alive && request===this._metadataRequest) this.metadataError=true; }
    },
    async readIdentity() {
      const user=this.user; if(!user) return;
      const sync=getAccountSync(this.client), [p,s]=await Promise.all([sync.loadProfile(user),sync.loadSettings(user)]);
      if(!this._alive || this.user?.id!==user.id) return;
      if(p.error || s.error) return;
      this.identity={ display_name: p.data?.username && !p.data.username.includes('@') ? p.data.username : 'CBR supporter', flair: s.data?.customFlair || '', favorite_civ: s.data?.favoriteCiv || '' };
      this.draft.competitors=additionalCompetitors(this.identity.favorite_civ,this.draft.competitors);
    },
    async refreshAccess() {
      const user=this.user; if(!user) return;
      try {
        const result=await loadShowcaseAccess(this.client);
        if(!this._alive || this.user?.id!==user.id) return;
        this.accessError=false; this.allowed=result.allowed===true; this.isShowrunner=result.is_showrunner===true;
        this.expired=!this.allowed && result.status==='expired';
      } catch {
        if(this._alive && this.user?.id===user.id) { this.accessError=true; this.allowed=false; this.isShowrunner=false; }
      }
    },
    async load() {
      const request=this._request=(this._request||0)+1, userId=this.user?.id; this.loading=true; this.error=''; this.message=''; this.profile=null; this.own=null; this.allowed=false; this.isShowrunner=false; this.previewing=false; this.confirmDelete=false; this.draft=blank(); this.competitorToAdd=''; this.favourites=[]; this.mapViews=[]; this.saving=false; this.accessError=false; this.expired=false; this.identity={display_name:'CBR supporter',flair:'',favorite_civ:''};
      try {
        if(this.publicId) { const profile=await getShowcase(this.client,this.publicId); if(this._alive && request===this._request) this.profile=profile; }
        else if(userId) {
          const [result]=await Promise.all([loadOwnShowcase(this.client,userId),this.refreshAccess(),this.readIdentity()]);
          if(!this._alive || request!==this._request || userId!==this.user?.id) return;
          this.own=result.showcase; this.directoryHidden=result.hidden; this.draft={...blank(),...JSON.parse(JSON.stringify(result.showcase || {}))}; this.draft.competitors=additionalCompetitors(this.identity.favorite_civ,this.draft.competitors);
          await Promise.all([this.loadFavourites(request),this.loadOwnPublicViews(request)]);
        }
      } catch(error) { if(this._alive && request===this._request) this.error=error.message; }
      finally { if(this._alive && request===this._request) this.loading=false; }
    },
    async loadFavourites(request=this._request) {
      const userId=this.user?.id; if(!userId || !this.episodes.length) return;
      const seasons=[...new Set(this.episodes.map(e=>e.season))];
      const rows=(await Promise.all(seasons.map(season=>fetchReactionRows(this.client,season,{userId,table:'album_reactions'})))).flat();
      if(this._alive && request===this._request && userId===this.user?.id) this.favourites=buildFavourites(this.episodes,rows).map(scene=>({...scene,season:scene.path.match(/^\/albums\/(s\d+)\//)?.[1] || 's5'}));
    },
    async loadOwnPublicViews(request=this._request) {
      const userId=this.user?.id; if(!userId) return;
      const views=[]; let offset=0,rows;
      do {
        rows=await listSavedViews(this.client,{mapId:null,section:'mine',offset});
        if(!this._alive || request!==this._request || userId!==this.user?.id) return;
        views.push(...rows.filter(view=>view.visibility==='public' && !view.is_hidden)); offset+=rows.length;
      } while(rows.length===20);
      this.mapViews=views;
    },
    sceneSelected(scene) { return this.draft.scenes.some(s=>sceneKey(s)===scene.id); },
    toggleScene(scene) { const index=this.draft.scenes.findIndex(s=>sceneKey(s)===scene.id); if(index>=0) this.draft.scenes.splice(index,1); else if(this.draft.scenes.length<6) this.draft.scenes.push({path:scene.path,number:scene.sceneNumber}); },
    moveScene(index,delta) { const next=index+delta; if(next<0||next>=this.draft.scenes.length) return; const [scene]=this.draft.scenes.splice(index,1); this.draft.scenes.splice(next,0,scene); },
    async mutate(action) { if(this.saving||!this.user) return; const request=this._request,userId=this.user.id; this.saving=true; this.message=''; try { await action(userId,()=>this._alive&&request===this._request&&userId===this.user?.id); } catch(error) { if(this._alive&&request===this._request) this.message=error.message; } finally { if(this._alive&&request===this._request) this.saving=false; } },
    async save(publish) { if(!this.allowed) return; await this.mutate(async(userId,current)=>{ const draft={...this.draft,map_views:this.draft.map_views.filter(id=>this.mapViews.some(v=>v.id===id)),published:publish||this.own?.published===true}; const row=await saveShowcase(this.client,userId,draft,this.own); if(current()) { this.own=row; this.draft={...this.draft,...JSON.parse(JSON.stringify(row)),competitors:additionalCompetitors(this.identity.favorite_civ,row.competitors)}; this.message=row.published?'Your showcase is published.':'Private draft saved. Publish when you’re ready.'; } }); },
    async toggleDirectory() { await this.mutate(async(userId,current)=>{ const hidden=!this.directoryHidden; await setDirectoryHidden(this.client,userId,hidden); if(current()) { this.directoryHidden=hidden; this.message=hidden?'Your directory entry is hidden. Existing episode credits stay unchanged.':'Your public credit name can appear while your supporter access is active.'; } }); },
    async unpublish() { await this.mutate(async(userId,current)=>{ await unpublishShowcase(this.client,userId,this.own.id); if(current()) { this.own.published=false; this.draft.published=false; this.message='Your showcase is private. Your public credit name can still appear in the directory unless you hide it below.'; } }); },
    async remove() { await this.mutate(async(userId,current)=>{ await deleteShowcase(this.client,userId,this.own.id); if(current()) { this.own=null; this.draft=blank(); this.previewing=false; this.confirmDelete=false; this.message='Your showcase was deleted. Your account and favourites are unchanged.'; } }); },
  },
};
</script>
