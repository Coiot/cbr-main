<template>
  <div class="supporter-page collections-page" :class="{ 'collections-page--reading': id && !editing }">
    <div class="collection-page-nav">
      <AlbumsNav compact label="Collection navigation" :archive="{ to: id ? (editing ? collectionLink(id) : '/collections/') : '/spotlight/', label: id ? (editing ? 'Back to collection' : 'Back to collections') : 'Back to Spotlight' }" />
      <div v-if="collection && !editing" class="collection-header-actions">
        <button v-if="(!own || own.published) && !own?.is_hidden" type="button" class="collection-share" title="Copy collection link" aria-label="Copy collection link" @click="share"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg></button>
        <router-link v-if="own" class="collection-manage" :to="collectionLink(id,true)">Manage</router-link>
      </div>
    </div>
    <p v-if="error" role="status">{{ error }} <button @click="load">Try again</button></p>
    <p v-if="loading || (mine && state?.loading)" role="status">Loading collections…</p>
    <template v-else-if="id">
      <template v-if="editing && own">
        <h1>Edit collection</h1><p v-if="own.is_hidden">This collection is hidden from public browsing.</p>
        <p v-if="!state.allowed">{{ state.accessError ? 'Your supporter access could not be checked.' : state.expired ? 'Your supporter access has ended. You can still make this collection private or delete it.' : 'Editing collections is a supporter feature.' }} <router-link to="/support/">Support CBR again anytime</router-link>.</p>
        <form class="showcase-editor" @submit.prevent="save">
          <fieldset :disabled="busy || !state.allowed"><legend>Collection details</legend><label>Title<input v-model="draft.title" maxlength="80" required /></label><label>Description<textarea v-model="draft.description" maxlength="600" rows="3" /></label>
            <label class="collection-check"><input type="checkbox" v-model="draft.published" /> Publish so anyone can read</label>
            <label v-if="draft.published" class="collection-check"><input type="checkbox" v-model="draft.featured" /> Show first on my supporter showcase (up to three)</label>
            <p v-if="draft.published" class="supporter-muted">Your collection, notes, and account display name will be visible to anyone. Avoid spoilers in the title and description.</p>
          </fieldset>
          <fieldset :disabled="busy || !state.allowed"><legend>Scenes · {{ draft.scenes.length }}/100</legend><p>Drag scenes to reorder, or use Move up and Move down. Add scenes using the collection icon while reading, or select favourites below.</p>
            <ol class="showcase-selected"><li v-for="(scene,index) in draft.scenes" :key="sceneKey(scene)" @dragover.prevent @drop.prevent="dropScene(index)">
              <span class="collection-drag" :draggable="state.allowed && !busy" @dragstart="dragStart($event,index)" @dragend="dragged=null" aria-hidden="true">⠿</span>
              <router-link :to="sceneKey(scene)">{{ sceneLabel(scene) }}</router-link>
              <div class="supporter-actions"><button type="button" :disabled="index===0" :aria-label="`Move scene ${index+1} up`" @click="move(index,index-1)">↑ Move up</button><button type="button" :disabled="index===draft.scenes.length-1" :aria-label="`Move scene ${index+1} down`" @click="move(index,index+1)">↓ Move down</button><button type="button" @click="draft.scenes.splice(index,1)">Remove</button></div>
              <label>Curator’s note <span class="supporter-muted">Optional · {{ (scene.note || '').length }}/400</span><textarea v-model="scene.note" maxlength="400" rows="2" /></label>
            </li></ol>
            <button type="button" @click="loadFavourites" :disabled="favouritesLoading">{{ favouritesLoading ? 'Loading…' : 'Choose from my favourites' }}</button>
            <template v-if="favouritesOpen"><label>Find favourites<input v-model="favouriteSearch" type="search" /></label><div class="showcase-picker"><label v-for="card in matchingFavourites.slice(0,favouriteLimit)" :key="card.id"><input type="checkbox" :value="card.id" v-model="selected" :disabled="draft.scenes.some(s=>sceneKey(s)===card.id)" />{{ card.title }} · {{ card.episodeTitle }} · Scene {{ card.sceneNumber }}</label></div><button v-if="matchingFavourites.length>favouriteLimit" type="button" @click="favouriteLimit+=40">Show more favourites</button><button type="button" :disabled="!selected.length" @click="addFavourites">Add selected scenes</button><p v-if="!matchingFavourites.length">No favourites match. Star or heart scenes while reading, or try another search.</p></template>
          </fieldset>
          <div class="supporter-actions"><button type="submit" class="supporter-primary" :disabled="busy || !state.allowed">Save collection</button><router-link :to="collectionLink(id)" class="supporter-button">View saved collection</router-link><button type="button" @click="reloadDraft" :disabled="busy">Reload saved version</button></div>
        </form>
        <div class="supporter-actions"><button v-if="own.published" :disabled="busy" @click="makePrivate">Make private</button><template v-if="confirmDelete"><span>Delete this collection and its notes?</span><button :disabled="busy" @click="remove">Delete permanently</button><button @click="confirmDelete=false">Keep collection</button></template><button v-else @click="confirmDelete=true">Delete collection…</button></div>
      </template>
      <template v-else-if="collection">
        <header class="collection-heading">
          <p class="supporter-eyebrow">Scene collection{{ own && !own.published ? ' · Private' : '' }}</p>
          <h1>{{ collection.title }}</h1>
          <p class="collection-byline">Curated by <router-link v-if="collection.showcase_id" :to="`/supporters/profile/?id=${collection.showcase_id}`">{{ collection.display_name }}</router-link><span v-else>{{ own ? 'you' : collection.display_name || 'CBR reader' }}</span><span aria-hidden="true"> · </span>{{ collection.scenes.length }} {{ collection.scenes.length === 1 ? 'scene' : 'scenes' }}</p>
          <p v-if="collection.description" class="collection-description">{{ collection.description }}</p>
        </header>
        <CollectionReader :key="collection.id" :collection="collection" :episodes="episodes" :metadata-loading="metadataLoading" />
      </template>
      <div v-else-if="!state?.loading && !error" class="supporter-panel"><h1>Collection unavailable</h1><p>This collection may be private or have been removed.</p><template v-if="!state?.user"><p>If it’s yours, sign in to manage it.</p><EmailSignInForm :scene-number="0" /></template></div>
    </template>
    <template v-else>
      <nav class="collection-segments collection-library-tabs" aria-label="Collection library"><router-link to="/collections/" :aria-current="!mine ? 'page' : undefined">Explore</router-link><router-link to="/collections/?view=mine" :aria-current="mine ? 'page' : undefined">My collections</router-link></nav>
      <h1>{{ mine ? 'My collections' : 'Scene collections' }}</h1><p>CBR moments, collected by readers. Explore favourite stories, memorable blunders, and the lines worth reading again.</p>
      <template v-if="mine">
        <div v-if="!state?.user" class="supporter-panel"><p>Sign in to manage your collections.</p><EmailSignInForm :scene-number="0" /></div>
        <template v-else><p v-if="state.error" role="status">{{ state.error }} <button @click="store.refresh()">Try again</button></p>
          <form v-if="state.allowed" class="supporter-controls" @submit.prevent="create"><label>New collection<input v-model="newTitle" maxlength="80" placeholder="Legendary blunders" required /></label><button :disabled="busy || state.rows.length>=20">Create private collection</button></form>
          <p v-else>{{ state.accessError ? 'Your supporter access could not be checked.' : state.expired ? 'Your supporter access has ended. Your collections are still available to read, make private, or delete.' : 'Creating and editing scene collections is a supporter feature.' }} <router-link to="/support/">See supporter perks</router-link>.</p>
          <div class="supporter-grid"><article v-for="row in state.rows" :key="row.id" class="supporter-panel"><h2><router-link :to="collectionLink(row.id)">{{ row.title }}</router-link></h2><p>{{ row.description }}</p><p>{{ row.scenes.length }} scenes · {{ row.is_hidden ? 'Hidden' : row.published ? 'Public' : 'Private' }}{{ row.featured ? ' · Featured on showcase' : '' }}</p><router-link :to="collectionLink(row.id,true)">Manage collection →</router-link></article></div>
          <p v-if="!state.rows.length && !state.error">No collections yet. Create one here or use the collection icon beside a scene’s bookmark.</p>
        </template>
      </template>
      <template v-else>
        <form class="supporter-controls" @submit.prevent="search"><label>Find a collection<input type="search" v-model="searchText" maxlength="80" placeholder="Search collection titles" /></label><button>Search</button></form>
        <p class="supporter-muted">Titles and descriptions may contain spoilers. Each collection has episode filters for its scenes and notes.</p>
        <div class="supporter-grid"><article v-for="row in rows" :key="row.id" class="supporter-panel"><p class="supporter-eyebrow">{{ row.scene_count }} scenes · {{ row.display_name }}</p><h2><router-link :to="collectionLink(row.id)">{{ row.title }}</router-link></h2><p>{{ row.description }}</p><router-link :to="collectionLink(row.id)">Explore collection →</router-link></article></div>
        <p v-if="!rows.length && !error">No public collections match. Try another title or create a collection of your own.</p>
        <div class="supporter-actions"><button :disabled="offset===0" @click="page(-24)">← Previous</button><span>{{ total }} {{ total === 1 ? 'collection' : 'collections' }}</span><button :disabled="offset+24>=total" @click="page(24)">Next →</button></div>
        <router-link to="/support/">Support CBR and create your own collections</router-link>
      </template>
    </template>
    <p v-if="metadataError" role="status">{{ metadataError }} <button @click="loadMetadata">Retry previews</button></p>
    <p v-if="message" role="status" aria-live="polite">{{ message }}</p>
  </div>
</template>
<script>
import { getSupabaseClient } from '../supabaseClient';
import { getCollectionStore } from '../components/collections/collectionStore.js';
import { getCollection, listCollections } from '../components/collections/collectionApi.mjs';
import { blankCollection, collectionLink, sceneKey, moveScene, collectionScenes, loadCollectionEpisodes } from '../components/collections/collectionModel.mjs';
import { buildFavourites, sceneAlbumLabel } from '../components/spotlight/spotlightModel.mjs';
import { fetchReactionRows } from '../components/spotlight/spotlightData.mjs';
import AlbumsNav from '../components/albums/AlbumsNav.vue';
import CollectionReader from '../components/collections/CollectionReader.vue';
import EmailSignInForm from '../components/account/EmailSignInForm.vue';
import '../components/supporters/supporterPages.css';
import '../components/collections/collectionPresentation.css';
export default {
  components:{CollectionReader,EmailSignInForm,AlbumsNav},
  data:()=>({store:null,state:null,client:null,loading:true,error:'',metadataError:'',metadataLoading:true,episodes:[],rows:[],total:0,publicCollection:null,draft:blankCollection(),busy:false,message:'',newTitle:'',searchText:'',confirmDelete:false,dragged:null,favourites:[],favouritesLoading:false,favouritesOpen:false,favouriteSearch:'',favouriteLimit:40,selected:[]}),
  computed:{
    id(){return String(this.$route.query.id||'');}, mine(){return this.$route.query.view==='mine';}, editing(){return this.$route.query.edit==='1';}, offset(){return Math.max(0,Number.parseInt(this.$route.query.offset,10)||0);},
    own(){return this.state?.rows.find(r=>r.id===this.id);}, collection(){return this.own || this.publicCollection;},
    loadKey(){return JSON.stringify([this.id,this.mine,this.editing,this.offset,String(this.$route.query.search||'')]);},
    matchingFavourites(){const search=this.favouriteSearch.toLowerCase();return this.favourites.filter(s=>`${s.title} ${s.episodeTitle}`.toLowerCase().includes(search));},
    draftCards(){return new Map(collectionScenes(this.episodes,this.draft.scenes).map(c=>[c.id,c]));},
  },
  watch:{loadKey(){this.load();},'state.user.id'(){this.load();},'own.id'(){if(this.own)this.setDraft();},favouriteSearch(){this.favouriteLimit=40;}},
  mounted(){this._alive=true;this.client=getSupabaseClient();this.store=getCollectionStore();if(this.store){this.state=this.store.state;this._release=this.store.retain();}this.loadMetadata();this.load();},
  beforeUnmount(){this._alive=false;this._request++;this._release?.();},
  methods:{
    collectionLink,sceneKey,
    async loadMetadata(){this.metadataLoading=true;this.metadataError='';try{const rows=await loadCollectionEpisodes(this.$withBase);if(this._alive)this.episodes=rows;}catch(e){if(this._alive)this.metadataError=e.message;}finally{if(this._alive)this.metadataLoading=false;}},
    setDraft(){this.draft=JSON.parse(JSON.stringify(this.own||blankCollection()));this._revision=this.own?.revision;},
    async load(){
      const req=this._request=(this._request||0)+1;this.loading=true;this.error='';this.message='';this.publicCollection=null;this.confirmDelete=false;this.favourites=[];this.favouritesLoading=false;this.favouritesOpen=false;this.selected=[];this.busy=false;this.searchText=String(this.$route.query.search||'');this.setDraft();
      try{if(this.id){const row=await getCollection(this.client,this.id);if(this._alive&&req===this._request)this.publicCollection=row;}
      else if(!this.mine){const result=await listCollections(this.client,{search:this.searchText,offset:this.offset});if(this._alive&&req===this._request){this.rows=result.entries;this.total=result.total;}}}
      catch(e){if(this._alive&&req===this._request)this.error=e.message;}
      finally{if(this._alive&&req===this._request)this.loading=false;}
    },
    async mutate(action){if(this.busy||!this.store)return;const req=this._request;this.busy=true;this.message='';try{await action(()=>this._alive&&req===this._request);}catch(e){if(this._alive&&req===this._request)this.message=e.message;}finally{if(this._alive&&req===this._request)this.busy=false;}},
    async create(){await this.mutate(async current=>{const row=await this.store.change('save',null,{...blankCollection(),title:this.newTitle});if(current())await this.$router.push(collectionLink(row.id,true));});},
    async save(){if(!this.state.allowed)return;const draft=JSON.parse(JSON.stringify(this.draft)),row={id:this.id,revision:this._revision};await this.mutate(async current=>{await this.store.change('save',row,draft);if(current()){this.setDraft();this.message=draft.published?'Collection published.':'Private collection saved.';}});},
    async makePrivate(){await this.mutate(async current=>{await this.store.change('private',this.own);if(current()){this.setDraft();this.message='Collection is now private.';}});},
    async remove(){await this.mutate(async current=>{await this.store.change('delete',this.own);if(current())await this.$router.push('/collections/?view=mine');});},
    async reloadDraft(){const req=this._request;await this.store.refresh();if(this._alive&&req===this._request){if(this.state.error){this.message=this.state.error;return;}this.setDraft();this.message='Loaded the saved version.';}},
    move(from,to){if(!this.state.allowed||this.busy)return;this.draft.scenes=moveScene(this.draft.scenes,from,to);},
    dragStart(event,index){if(!this.state.allowed||this.busy){event.preventDefault();return;}this.dragged=index;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',String(index));},
    dropScene(index){if(this.dragged!==null)this.move(this.dragged,index);this.dragged=null;},
    sceneLabel(scene){const card=this.draftCards.get(sceneKey(scene));return card?`Season ${card.season.slice(1)} · ${sceneAlbumLabel(card)} · Scene ${card.sceneNumber} — ${card.title}`:`${scene.path} · Scene ${scene.number} (preview unavailable)`;},
    async loadFavourites(){
      if(this.favouritesLoading||!this.state.user)return;const req=this._request,uid=this.state.user.id;this.favouritesLoading=true;this.message='';
      try{const rows=(await Promise.all([...new Set(this.episodes.map(e=>e.season))].map(s=>fetchReactionRows(this.client,s,{userId:uid,table:'album_reactions'})))).flat();if(this._alive&&req===this._request&&uid===this.state.user?.id){this.favourites=buildFavourites(this.episodes,rows);this.favouritesOpen=true;}}
      catch{if(this._alive&&req===this._request)this.message='Favourites could not be loaded. Please try again.';}
      finally{if(this._alive&&req===this._request)this.favouritesLoading=false;}
    },
    addFavourites(){const existing=new Set(this.draft.scenes.map(sceneKey)),added=this.favourites.filter(c=>this.selected.includes(c.id)&&!existing.has(c.id));if(this.draft.scenes.length+added.length>100){this.message='Choose up to 100 scenes per collection.';return;}this.draft.scenes.push(...added.map(c=>({path:c.path,number:c.sceneNumber,note:''})));this.selected=[];this.message='Scenes added. Save your collection to keep these changes.';},
    search(){this.$router.push({path:'/collections/',query:{search:this.searchText.trim()||undefined}});},
    page(delta){this.$router.push({path:'/collections/',query:{...this.$route.query,offset:String(this.offset+delta)}});},
    async share(){const url=new URL(this.$withBase(collectionLink(this.id))+window.location.hash,window.location.origin).href;try{await navigator.clipboard.writeText(url);this.message='Collection link copied.';}catch{this.message=`Share this link: ${url}`;}},
  },
};
</script>
<style scoped>
.collection-page-nav { display:flex; align-items:start; justify-content:space-between; gap:1rem; margin-block-end:1.4rem; }
.collection-page-nav :deep(.page-nav) { margin:0; }
.collection-header-actions { display:flex; align-items:center; gap:.8rem; padding-block-start:.15rem; }
.collection-header-actions .collection-share { padding:0; inline-size:44px; min-block-size:44px; border:1px solid var(--panel-border-color); background:var(--panel-bg-color); }
.collection-share svg { inline-size:1.1rem; block-size:1.1rem; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.collection-manage { font-size:.85rem; font-weight:700; }
.collection-heading { max-inline-size:100%; }
.collection-heading h1 { font-size:clamp(2rem,4.3vw,3.4rem); text-wrap:balance; margin-block:.4rem .7rem; }
.collection-heading .collection-byline { margin-block:.35rem .6rem; font-size:.9rem; color:var(--color-text-muted); }
.collection-description { white-space:pre-wrap; max-inline-size:75ch; hyphens:none; }
.collections-page--reading { inline-size:min(1440px,calc(100% - 6rem)); }
.collection-library-tabs { margin-block:0 1.25rem; }
@media(max-width:799px) { .collections-page--reading { inline-size:calc(100% - 2rem); } .collection-page-nav { gap:.5rem; } .collection-header-actions { gap:.5rem; } }

.collections-page fieldset > label { margin-block:.8rem; }
.collections-page .collection-check { display:flex; align-items:start; gap:.6rem; }
.collection-drag { display:inline-block; padding:.3rem; cursor:grab; color:var(--field-label-color); font-size:1.5rem; }
</style>
