<template>
  <div class="supporter-page">
    <router-link to="/supporters/">← Meet the supporters</router-link>
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
          <fieldset :disabled="!allowed || saving"><legend>More competitors you’re rooting for</legend><p class="supporter-muted">Your favourite civ appears first. Add up to two more.</p><div class="supporter-controls"><label v-for="index in [0,1]" :key="index">Competitor {{ index+1 }}<select v-model="draft.competitors[index]"><option value="">None</option><option v-for="civ in civOptions" :key="civ" :value="civ" :disabled="civ === identity.favorite_civ || draft.competitors[1-index] === civ">{{ civ }}</option></select></label></div></fieldset>
          <fieldset :disabled="!allowed || saving"><legend>Moments worth another look · {{ draft.scenes.length }}/6</legend>
            <p class="supporter-muted">Choose from scenes you’ve starred or hearted. Only your selected scenes are published.</p>
            <ol v-if="draft.scenes.length" class="showcase-selected"><li v-for="(scene,index) in selectedSceneRows" :key="sceneKey(scene)"><span>{{ scene.label }}</span><div class="supporter-actions"><button type="button" :disabled="index===0" :aria-label="`Move scene ${index+1} up`" @click="moveScene(index,-1)">↑ Up</button><button type="button" :disabled="index===draft.scenes.length-1" :aria-label="`Move scene ${index+1} down`" @click="moveScene(index,1)">↓ Down</button><button type="button" @click="draft.scenes.splice(index,1)">Remove</button></div></li></ol>
            <label>Find a favourite<input v-model="favouriteSearch" type="search" placeholder="Search titles or episode numbers" /></label>
            <div class="showcase-picker"><label v-for="scene in filteredFavourites" :key="scene.id"><input type="checkbox" :checked="sceneSelected(scene)" :disabled="!sceneSelected(scene) && draft.scenes.length>=6" @change="toggleScene(scene)" /><span>Season {{ scene.season.slice(1) }} · Episode {{ scene.episodeNumber }} · Scene {{ scene.sceneNumber }} — {{ scene.title }}</span></label></div>
            <p v-if="!favourites.length">Star or heart scenes while reading, then return here to choose your highlights.</p><p v-else-if="!filteredFavourites.length">No favourites match that search.</p><button v-if="filteredFavourites.length < matchingFavourites.length" type="button" @click="favouriteLimit += 40">Show more favourites</button>
          </fieldset>
          <section class="supporter-panel"><h2>My scene collections</h2><p>Feature up to three public collections on your showcase. Choose “Feature on my supporter showcase” when editing a collection.</p><router-link to="/collections/?view=mine">Manage scene collections →</router-link></section>
          <fieldset :disabled="!allowed || saving"><legend>My map views · {{ draft.map_views.length }}/3</legend><p class="supporter-muted">Select up to three of your public views. Making a view private removes it from your public showcase.</p><div class="showcase-picker"><label v-for="view in mapViews" :key="view.id"><input type="checkbox" :checked="draft.map_views.includes(view.id)" :disabled="!draft.map_views.includes(view.id) && draft.map_views.length>=3" @change="toggleMap(view.id)" /><span>{{ view.title }}</span></label></div><p v-if="!mapViews.length">No public map views yet. <router-link to="/community-tile-map/">Create a view on the map</router-link>.</p><button v-if="moreMapViews" type="button" :disabled="viewsLoading" @click="moreViews">Show more map views</button></fieldset>
          <p v-if="allowed">Publishing makes your name, flair, favourite competitors, introduction, and selected content visible to anyone. Your email, donation amount, reading progress, and other favourites remain private.</p>
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
import { getShowcase, loadOwnShowcase, saveShowcase, unpublishShowcase, deleteShowcase, setDirectoryHidden } from '../components/supporters/showcaseApi.mjs';
import { showcaseLink, sceneCards, sceneKey } from '../components/supporters/showcaseModel.mjs';
import SupporterShowcaseContent from '../components/supporters/SupporterShowcaseContent.vue';
import EmailSignInForm from '../components/account/EmailSignInForm.vue';
import '../components/supporters/supporterPages.css';
const blank = () => ({ introduction: '', competitors: ['', ''], scenes: [], map_views: [], published: false });
export default {
  components: { SupporterShowcaseContent, EmailSignInForm },
  data: () => ({ client: null, user: null, loading: true, error: '', message: '', profile: null, own: null,
    episodes: [], metadataError: false, allowed: false, expired: false, accessError: false, saving: false, directoryHidden: false,
    identity: { display_name: 'CBR supporter', flair: '', favorite_civ: '' }, draft: blank(), favourites: [], favouriteSearch: '', favouriteLimit: 40,
    mapViews: [], moreMapViews: false, viewsLoading: false, previewing: false, confirmDelete: false }),
  computed: {
    publicId() { return this.$route.query.id ? String(this.$route.query.id) : ''; },
    civOptions() { return [...new Set([...(getEdition('s5')?.competitors || []).map(c=>c.name),'Babylon'])].sort((a,b)=>a.localeCompare(b)); },
    matchingFavourites() { const text = this.favouriteSearch.trim().toLowerCase(); return this.favourites.filter(s=>!text || `${s.title} ${s.episodeNumber} ${s.sceneNumber}`.toLowerCase().includes(text)); },
    filteredFavourites() { return this.matchingFavourites.slice(0,this.favouriteLimit); },
    selectedSceneRows() {
      const cards = new Map(sceneCards(this.episodes, this.draft.scenes).map(card => [card.id, card]));
      return this.draft.scenes.map(scene => {
        const card = cards.get(sceneKey(scene));
        return { ...scene, label: card ? `Season ${card.season.slice(1)} · Episode ${card.episodeNumber} · Scene ${card.sceneNumber} — ${card.title}` : `${scene.path} · Scene ${scene.number}` };
      });
    },
    previewProfile() { return { ...this.identity, id: this.own?.id || '', active: this.allowed, introduction: this.draft.introduction, competitors: this.draft.competitors.filter(Boolean), scenes: this.draft.scenes, map_views: this.draft.map_views.map(id=>this.mapViews.find(v=>v.id===id)).filter(Boolean) }; },
  },
  watch: { '$route.query.id'() { this.load(); }, favouriteSearch() { this.favouriteLimit=40; } },
  mounted() {
    this._alive=true; this.client=getSupabaseClient();
    this._identityUpdate=event=>{ if(event.detail?.userId===this.user?.id) { if(event.detail.profile?.supporter_status) { this.allowed=event.detail.profile.can_edit===true; this.expired=event.detail.profile.supporter_status==='expired'; } this.readIdentity(); } };
    this._visibility=()=>{ if(!document.hidden && this.user && !this.publicId) this.refreshAccess(); };
    window.addEventListener('account-profile-updated',this._identityUpdate); window.addEventListener('user-settings-synced',this._identityUpdate); document.addEventListener('visibilitychange',this._visibility);
    this.loadEpisodes();
    if(this.client) this._auth=subscribeAccountAuth(this.client,session=>{ const user=session?.user||null; if(this._authReady && this.user?.id===user?.id) return; this._authReady=true; this.user=user; this.load(); });
    else { this.loading=false; this.error='The account connection is unavailable. Please try again.'; }
  },
  beforeUnmount() { this._alive=false; this._request++; this._metadataRequest++; this._auth?.unsubscribe(); window.removeEventListener('account-profile-updated',this._identityUpdate); window.removeEventListener('user-settings-synced',this._identityUpdate); document.removeEventListener('visibilitychange',this._visibility); },
  methods: {
    showcaseLink, sceneKey, openAccount() { window.dispatchEvent(new CustomEvent('open-account-menu')); },
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
    },
    async refreshAccess() {
      const user=this.user; if(!user) return;
      const result=await getAccountSync(this.client).refreshSupporter(user,{force:true});
      if(!this._alive || this.user?.id!==user.id) return;
      this.accessError=!!result.error; this.allowed=!result.error && result.allowed; this.expired=result.data?.status==='expired';
    },
    async load() {
      const request=this._request=(this._request||0)+1, userId=this.user?.id; this.loading=true; this.error=''; this.message=''; this.profile=null; this.own=null; this.allowed=false; this.previewing=false; this.confirmDelete=false; this.draft=blank(); this.favourites=[]; this.mapViews=[]; this._viewOffset=0; this.saving=false; this.accessError=false; this.expired=false; this.identity={display_name:'CBR supporter',flair:'',favorite_civ:''}; this.moreMapViews=false; this.viewsLoading=false;
      try {
        if(this.publicId) { const profile=await getShowcase(this.client,this.publicId); if(this._alive && request===this._request) this.profile=profile; }
        else if(userId) {
          const [result]=await Promise.all([loadOwnShowcase(this.client,userId),this.refreshAccess(),this.readIdentity()]);
          if(!this._alive || request!==this._request || userId!==this.user?.id) return;
          this.own=result.showcase; this.directoryHidden=result.hidden; this.draft={...blank(),...JSON.parse(JSON.stringify(result.showcase || {}))}; this.draft.competitors=[this.draft.competitors[0]||'',this.draft.competitors[1]||''];
          await Promise.all([this.loadFavourites(request),this.loadMoreViews(request)]);
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
    async loadMoreViews(request=this._request) {
      const userId=this.user?.id; if(!userId) return;
      const rows=await listSavedViews(this.client,{mapId:null,section:'mine',offset:this._viewOffset||0});
      if(!this._alive || request!==this._request || userId!==this.user?.id) return;
      this._viewOffset=(this._viewOffset||0)+rows.length; this.mapViews.push(...rows.filter(v=>v.visibility==='public' && !v.is_hidden && !this.mapViews.some(old=>old.id===v.id))); this.moreMapViews=rows.length===20;
      // Selected older views must be available in the preview even when not on the first picker page.
      const missing=this.draft.map_views.filter(id=>!this.mapViews.some(v=>v.id===id));
      if(missing.length) { const {data,error}=await this.client.from('map_saved_views').select('id,title,description,settings,visibility,is_hidden').eq('user_id',userId).in('id',missing); if(error) throw new Error('Your selected map views could not be loaded. Please try again.'); if(this._alive && request===this._request) this.mapViews.push(...(data||[]).filter(v=>v.visibility==='public' && !v.is_hidden)); }
    },
    async moreViews() { if(this.viewsLoading) return; this.viewsLoading=true; const request=this._request; try { await this.loadMoreViews(request); } catch(error) { if(this._alive && request===this._request) this.message=error.message; } finally { if(this._alive && request===this._request) this.viewsLoading=false; } },
    sceneSelected(scene) { return this.draft.scenes.some(s=>sceneKey(s)===scene.id); },
    toggleScene(scene) { const index=this.draft.scenes.findIndex(s=>sceneKey(s)===scene.id); if(index>=0) this.draft.scenes.splice(index,1); else if(this.draft.scenes.length<6) this.draft.scenes.push({path:scene.path,number:scene.sceneNumber}); },
    moveScene(index,delta) { const next=index+delta; if(next<0||next>=this.draft.scenes.length) return; const [scene]=this.draft.scenes.splice(index,1); this.draft.scenes.splice(next,0,scene); },
    toggleMap(id) { const index=this.draft.map_views.indexOf(id); if(index>=0) this.draft.map_views.splice(index,1); else if(this.draft.map_views.length<3) this.draft.map_views.push(id); },
    async mutate(action) { if(this.saving||!this.user) return; const request=this._request,userId=this.user.id; this.saving=true; this.message=''; try { await action(userId,()=>this._alive&&request===this._request&&userId===this.user?.id); } catch(error) { if(this._alive&&request===this._request) this.message=error.message; } finally { if(this._alive&&request===this._request) this.saving=false; } },
    async save(publish) { if(!this.allowed) return; await this.mutate(async(userId,current)=>{ const draft={...this.draft,map_views:this.draft.map_views.filter(id=>this.mapViews.some(v=>v.id===id)),published:publish||this.own?.published===true}; const row=await saveShowcase(this.client,userId,draft,this.own); if(current()) { this.own=row; this.draft={...this.draft,...JSON.parse(JSON.stringify(row))}; this.message=row.published?'Your showcase is published.':'Private draft saved. Publish when you’re ready.'; } }); },
    async toggleDirectory() { await this.mutate(async(userId,current)=>{ const hidden=!this.directoryHidden; await setDirectoryHidden(this.client,userId,hidden); if(current()) { this.directoryHidden=hidden; this.message=hidden?'Your directory entry is hidden. Existing episode credits stay unchanged.':'Your public credit name can appear while your supporter access is active.'; } }); },
    async unpublish() { await this.mutate(async(userId,current)=>{ await unpublishShowcase(this.client,userId,this.own.id); if(current()) { this.own.published=false; this.draft.published=false; this.message='Your showcase is private. Your public credit name can still appear in the directory unless you hide it below.'; } }); },
    async remove() { await this.mutate(async(userId,current)=>{ await deleteShowcase(this.client,userId,this.own.id); if(current()) { this.own=null; this.draft=blank(); this.previewing=false; this.confirmDelete=false; this.message='Your showcase was deleted. Your account and favourites are unchanged.'; } }); },
  },
};
</script>
