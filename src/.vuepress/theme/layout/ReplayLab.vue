<template>
  <main id="main-content" class="replay-lab" @dragover.prevent @drop.prevent="dropFile">
    <AlbumsNav compact label="Replay lab navigation" :archive="{to:'/community-tile-map/',label:'Back to the community map'}" />
    <header><p class="replay-eyebrow">Local testing tool</p><h1>Replay map lab</h1><p>Explore a Season 5 replay on the cylinder. Files stay on this device. Local files do not change the public map.</p></header>
    <p v-if="!fullRange">The public map uses the showrunner’s shared game history. <router-link to="/community-tile-map/">Open the community map →</router-link></p>
    <section v-if="fullRange" class="replay-load" aria-label="Load a local file">
      <!-- Native pickers can reject the game's unregistered extension; validate after selection. -->
      <label class="replay-file-button">Choose replay, history or snapshot<input type="file" :disabled="!base" @change="pickFile" /></label>
      <span class="replay-muted">{{ loading ? 'Reading replay…' : filename || 'Drop a .Civ5Replay or recovered history JSON here · up to 50 MB' }}</span>
      <button v-if="loading" @click="cancelLoad">Cancel</button>
      <button v-if="detailLayer?.records.length" @click="downloadEdits">Save edits</button>
      <button v-if="session" :disabled="loading || !!snapshotIssue" :title="snapshotIssue || undefined" @click="download">Download snapshot</button>
    </section>
    <p v-if="!base && !error" role="status">Loading Season 5 geography…</p>
    <p v-if="loading" role="status" aria-live="polite">Reading file and reconstructing the map…</p>
    <div v-if="error" class="replay-notice" role="alert"><p>{{ error }}</p><button v-if="!base" @click="loadBase">Retry geography</button></div>
    <template v-if="session && frame">
      <ReplayMapViewer :key="session.sourceFingerprint + ':' + session.kind" :base="base" :frame="frame" @edit-details="saveDetails">
        <template #timeline>
          <MapTimelineToolbar :turn="turn" :first-turn="firstTurn" :last-turn="lastTurn" :playing="playing" :speed="speed" :disabled="!isReplay || loading"
            :bookmarks="bookmarks" :can-manage="fullRange" :message="markerMessage" :public-turn="publicEndTurn"
            @turn="setTurn" @play="togglePlay" @speed="speed=$event" @episode="saveEpisode" />
        </template>
        <template #replay>
          <section class="tile-info-card replay-panel">
            <p class="replay-muted">{{ session.mapping.length }} civilizations · {{ frame.cities.length }} cities · {{ summary.reduce((sum,row)=>sum+row.tiles,0).toLocaleString() }} claimed tiles<template v-if="isReplay"> · {{ availableEventCount.toLocaleString() }} events · Turns {{ firstTurn }}–{{ lastTurn }}</template><template v-else> · Frozen snapshot; load the original replay for playback.</template></p>
            <p v-if="snapshotIssue" class="replay-muted" role="status">{{ snapshotIssue }}</p>
            <div class="replay-toggle" role="group" aria-label="Replay information"><button :aria-pressed="tab==='civilizations'" @click="tab='civilizations'">Civilizations</button><button :aria-pressed="tab==='events'" @click="tab='events'">Events</button></div>
            <template v-if="tab==='civilizations'"><h2 class="replay-small-heading">End of turn {{ turn }}</h2><div class="replay-table-scroll"><table><thead><tr><th>Civilization</th><th>Cities</th><th>Tiles</th></tr></thead><tbody><tr v-for="row in summary" :key="row.ownerId"><th scope="row"><span class="replay-civ-dot" :style="civStyle(row.label)" aria-hidden="true"></span>{{ row.label }}</th><td>{{ row.cities }}</td><td>{{ row.tiles }}</td></tr></tbody></table></div></template>
            <template v-else><label class="replay-event-filter">Event type<select v-model="eventType"><option value="all">All events</option><option value="cities">Cities</option><option value="claims">Tile claims</option><option value="messages">Messages and beliefs</option></select></label><p class="replay-muted">{{ isReplay ? 'Most recent 100 matching events through this turn.' : 'Event history is available in the original replay.' }}</p><ol v-if="visibleEvents.length" class="replay-events"><li v-for="event in visibleEvents" :key="event.order"><strong>Turn {{ event.turn }}</strong><span>{{ eventText(event) }}</span></li></ol><p v-else class="replay-muted">No matching events.</p></template>

          </section>
        </template>
      </ReplayMapViewer>
    </template>
    <section v-else-if="base && !loading" class="replay-empty"><h2>A local view of the game</h2><p>Load a replay or recovered save history to follow borders and cities over time. Download any turn as a snapshot and reopen it here later.</p><p class="replay-muted">Supports the Season 5 map and civilization roster. No files are uploaded or saved in browser storage.</p></section>
    <footer class="replay-muted">Replay format research: <a href="https://github.com/aiwebb/civ5replay" target="_blank" rel="noopener noreferrer">Andrew Webb’s civ5replay</a>. Map tools and colors are shared with the CBR community map.</footer>
  </main>
</template>
<script>
import { markRaw } from 'vue';
import {timelineLastTurn,defaultEpisodeMarkers,isLoopbackTimeline} from '../../../shared/mapTimelineDisplay.mjs';
import MapTimelineToolbar from '../components/community/official/MapTimelineToolbar.vue';
import {loadLocalEpisodeMarkers,saveLocalEpisodeMarkers} from '../components/community/official/localEpisodeMarkers.mjs';
import {upsertEpisodeMarker} from '../../../shared/mapEpisodeMarkers.mjs';
import {MAP_PUBLISHER_ID} from '../../../shared/mapRelease.mjs';
import {getSupabaseClient} from '../supabaseClient';
import {subscribeAccountAuth} from '../account/accountSync.js';
import {mapReleaseRequest} from '../components/community/official/mapReleaseApi.mjs';
import config from '../../../shared/officialMapConfig.json';
import AlbumsNav from '../components/albums/AlbumsNav.vue';
import ReplayMapViewer from '../components/community/replay/ReplayMapViewer.vue';
import {DETAIL_FORMAT,emptyDetails,mergeDetails,putDetail,validateDetails} from '../../../shared/mapDetails.mjs';
import { s5OwnerList } from '../components/community/communityTileMapConstants';
import { civStyle } from '../components/supporters/showcaseModel.mjs';
import { EXTRACTION_FORMAT, readReplayExtraction } from '../components/community/replay/replayExtraction.mjs';
import { MAX_REPLAY_BYTES } from '../components/community/replay/replayParser.mjs';
import { baseIdentity, mapCivilizations, validateReplayMap, reconstructFrame, frameSummary, cityEventLabels, exportReplaySnapshot, readReplaySnapshot, replaySnapshotIssue } from '../components/community/replay/replayModel.mjs';
export default {
  components:{AlbumsNav,ReplayMapViewer,MapTimelineToolbar},
  data:()=>({base:null,map:null,session:null,frame:null,rawFrame:null,detailLayer:null,turn:0,filename:'',error:'',loading:false,playing:false,speed:2,tab:'civilizations',eventType:'all',local:false,user:null,bookmarks:defaultEpisodeMarkers.map(m=>({...m})),markerMessage:''}),
  computed:{
    isReplay(){return this.session?.kind==='replay';},firstTurn(){return this.session?.meta.startTurn??0;},lastTurn(){return timelineLastTurn(this.session?.meta.endTurn??0,this.bookmarks,this.fullRange);},
    fullRange(){return this.local||this.user?.id===MAP_PUBLISHER_ID;},
    publicEndTurn(){return this.bookmarks.at(-1)?.turn??0;},
    availableEventCount(){return this.isReplay?this.session.replay.events.filter(e=>e.turn<=this.lastTurn).length:0;},
    snapshotIssue(){return replaySnapshotIssue(this.frame);},
    summary(){return this.frame?frameSummary(this.frame,this.session.mapping):[];},
    cityEvents(){return this.isReplay?cityEventLabels(this.session.replay,this.session.mapping):new Map();},
    visibleEvents(){if(!this.isReplay)return [];return this.session.replay.events.filter(e=>e.turn<=this.turn&&(this.eventType==='all'||this.eventType==='cities'&&[1,3,4].includes(e.type)||this.eventType==='claims'&&e.type===2||this.eventType==='messages'&&![1,2,3,4].includes(e.type))).slice(-100).reverse();},
  },
  watch:{speed(){if(this.playing){this.pause();this.togglePlay();}},lastTurn(value){if(this.session&&this.turn>value){if(this.isReplay)this.setTurn(value);else{this.session=null;this.frame=null;this.rawFrame=null;this.detailLayer=null;this.error='This frozen snapshot is later than the public endpoint. Load the game history to view earlier turns.';}}}},
  mounted(){this._alive=true;this.local=isLoopbackTimeline(location.hostname);if(this.local)this.bookmarks=loadLocalEpisodeMarkers();else{const client=getSupabaseClient();if(client)this._auth=subscribeAccountAuth(client,session=>{this.user=session?.user||null;});if(config.enabled)mapReleaseRequest({action:'manifest'}).then(({active})=>{if(this._alive&&active?.bookmarks?.length)this.bookmarks=active.bookmarks;}).catch(()=>{});}this._visibility=()=>{if(document.hidden)this.pause();};document.addEventListener('visibilitychange',this._visibility);window.addEventListener('keydown',this.shortcuts);this.loadBase();},
  beforeUnmount(){this._alive=false;this._auth?.unsubscribe();this._request++;this.pause();this.cancelRead();this._baseAbort?.abort();document.removeEventListener('visibilitychange',this._visibility);window.removeEventListener('keydown',this.shortcuts);},
  methods:{
    civStyle,
    async loadBase(){this.error='';this._baseAbort?.abort();const controller=this._baseAbort=new AbortController();try{const response=await fetch(this.$withBase('/community/CBRXMapOct62025_V2.base.json'),{signal:controller.signal});if(!response.ok)throw new Error('Base map unavailable.');const base=await response.json();if(this._alive){this.base=markRaw(base);this.map=markRaw(baseIdentity(base));}}catch(error){if(this._alive&&error.name!=='AbortError')this.error='The Season 5 base map could not be loaded. Please retry.';}},
    pickFile(event){const file=event.target.files?.[0];if(file)this.loadFile(file);event.target.value='';},
    dropFile(event){const file=event.dataTransfer?.files?.[0];if(file&&this.base&&this.fullRange)this.loadFile(file);},
    cancelRead(){this._worker?.terminate();this._worker=null;this._rejectRead?.(new Error('Read cancelled.'));this._rejectRead=null;},
    cancelLoad(){this._request++;this.cancelRead();this.loading=false;},
    parse(buffer){return new Promise((resolve,reject)=>{let worker;try{worker=new Worker(new URL('../components/community/replay/replayWorker.mjs',import.meta.url),{type:'module'});}catch{reject(new Error('This browser cannot start the replay reader. Try a current browser.'));return;}this._worker=worker;this._rejectRead=reject;const finish=()=>{worker.terminate();if(this._worker===worker){this._worker=null;this._rejectRead=null;}};worker.onmessage=event=>{finish();event.data.ok?resolve(event.data.replay):reject(new Error(event.data.error));};worker.onerror=()=>{finish();reject(new Error('The replay reader failed. Please try loading the file again.'));};worker.postMessage(buffer,[buffer]);});},
    async loadFile(file){
      if(!this.fullRange)return;
      const request=this._request=(this._request||0)+1;this.pause();this.cancelRead();this.error='';this.loading=true;
      const current=()=>this._alive&&request===this._request;
      try{
        if(!this.base)throw new Error('Wait for the Season 5 geography to load.');if(file.size>MAX_REPLAY_BYTES)throw new Error('Choose a file smaller than 50 MB.');
        let session;
        if(/\.json$/i.test(file.name)){
          const input=JSON.parse(await file.text());if(!current())return;
          if(input?.format===DETAIL_FORMAT){if(!this.session)throw new Error('Load the matching game history before loading saved edits.');validateDetails(input,this.session.sourceFingerprint);this.setDetails(input);return;}
          if(input?.format===EXTRACTION_FORMAT){
            const replay=readReplayExtraction(input,this.base,s5OwnerList);
            session={kind:'replay',replay,meta:replay.meta,mapping:mapCivilizations(replay.civs,s5OwnerList),sourceFingerprint:replay.sourceFingerprint,warnings:replay.warnings};
          }else session=readReplaySnapshot(input,this.map,s5OwnerList);
        }
        else if(/\.civ5replay$/i.test(file.name)){const buffer=await file.arrayBuffer();if(!current())return;const replay=await this.parse(buffer);if(!current())return;session={kind:'replay',replay,meta:replay.meta,mapping:mapCivilizations(replay.civs,s5OwnerList),sourceFingerprint:replay.sourceFingerprint,warnings:validateReplayMap(replay,this.base)};}
        else throw new Error('Choose a .Civ5Replay file, recovered save history JSON or downloaded snapshot JSON.');
        if(session.meta.startTurn>timelineLastTurn(session.meta.endTurn,this.bookmarks,this.fullRange)||session.frame?.turn>timelineLastTurn(session.meta.endTurn,this.bookmarks,this.fullRange))throw new Error(`This file starts after the public endpoint. Load the game history to view the end of turn ${this.publicEndTurn}.`);
        if(!current())return;this.session=markRaw(session);this.detailLayer=markRaw(emptyDetails(session.sourceFingerprint));this.filename=file.name;this.setTurn(session.frame?.turn??Math.min(this.lastTurn,this.publicEndTurn));
      }catch(error){if(current())this.error=error instanceof SyntaxError?'This JSON file could not be read. Choose a recovered history, snapshot or saved edits JSON.':error.message;}
      finally{if(current())this.loading=false;}
    },
    setTurn(value,stop=true){if(stop)this.pause();if(!this.session)return;const turn=Math.max(this.firstTurn,Math.min(this.lastTurn,Math.round(Number(value)||0)));this.turn=turn;this.rawFrame=markRaw(this.isReplay?reconstructFrame(this.session.replay,this.session.mapping,turn):this.session.frame);this.frame=markRaw(mergeDetails(this.rawFrame,this.detailLayer.records));},
    setDetails(layer){this.pause();this.detailLayer=markRaw(layer);this.frame=markRaw(mergeDetails(this.rawFrame,layer.records));},
    saveEpisode(marker){if(!this.fullRange)return;try{this.bookmarks=upsertEpisodeMarker(this.bookmarks,marker,{firstTurn:this.firstTurn,lastTurn:this.session.meta.endTurn});saveLocalEpisodeMarkers(this.bookmarks);this.markerMessage='Marker saved on this device. The public map is unchanged.';}catch(error){this.markerMessage=error.message;}},
    saveDetails(records){try{let layer=this.detailLayer;for(const record of records)layer=putDetail(layer,record);this.setDetails(layer);}catch(error){this.error=error.message;}},
    pause(){clearTimeout(this._timer);this._timer=null;this.playing=false;},
    togglePlay(){if(this.playing){this.pause();return;}if(!this.isReplay||this.loading||this.turn>=this.lastTurn||document.hidden)return;this.playing=true;const tick=()=>{if(!this.playing)return;this.setTurn(this.turn+1,false);if(this.turn>=this.lastTurn)this.pause();else this._timer=setTimeout(tick,1000/this.speed);};this._timer=setTimeout(tick,1000/this.speed);},
    shortcuts(event){if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||event.target?.closest('input,select,textarea,button,a,[contenteditable]')||!this.isReplay||this.loading)return;if(event.code==='Space'){event.preventDefault();this.togglePlay();}else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();this.setTurn(this.turn+(event.key==='ArrowLeft'?-1:1)*(event.shiftKey?10:1));}},
    eventText(event){if(!event.text&&this.cityEvents.has(event.order))return this.cityEvents.get(event.order);const owner=event.civ<0?'Unclaimed':this.session.mapping[event.civ].label;const names={2:`${event.tiles.length} tile claims`,3:`${event.tiles.length} city transfers`,4:`${event.tiles.length} city razings`};return `${owner}: ${event.text||names[event.type]||`Event ${event.type}`}`;},
    downloadEdits(){if(!this.detailLayer?.records.length)return;const url=URL.createObjectURL(new Blob([JSON.stringify(this.detailLayer)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='cbr-live-map-edits.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
    download(){if(!this.session||!this.frame||this.snapshotIssue)return;const data=exportReplaySnapshot(this.session,this.frame,this.map);const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`cbr-s5-replay-turn-${this.turn}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
  },
};
</script>
<style>
.replay-lab{box-sizing:border-box;max-width:1600px;margin:auto;padding:2rem clamp(1rem,3vw,3rem);color:var(--panel-text-color);line-height:1.5;overflow-wrap:anywhere}.replay-lab *{box-sizing:border-box}.replay-lab h1{font-size:clamp(2.1rem,4vw,3.3rem);line-height:1.1;margin:.3rem 0 .8rem}.replay-lab h2{font-size:1.2rem}.replay-lab h3{font-size:1rem}.replay-lab p{margin:.6rem 0 1rem}.replay-lab header>p:last-child{max-width:75ch}.replay-eyebrow{color:var(--field-label-color);text-transform:uppercase;font-weight:800;letter-spacing:.1em;font-size:.8rem}.replay-muted{color:var(--color-text-muted)}.replay-lab button,.replay-file-button{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:.45rem .85rem;border:1px solid var(--accent-color);border-radius:999px;background:var(--panel-bg-color);color:var(--panel-text-color);font:inherit;font-size:.9rem;font-weight:700;cursor:pointer}.replay-lab button:hover,.replay-file-button:hover{background:var(--panel-bg-soft-color)}.replay-lab button:disabled{opacity:.45;cursor:default}.replay-lab :is(button,a,input,select,summary):focus-visible,.replay-file-button:focus-within{outline:3px solid var(--field-label-color);outline-offset:3px}.replay-lab label{display:grid;gap:.3rem;font-weight:700;font-size:.85rem}.replay-lab :is(input,select){font:inherit;min-width:0;max-width:100%;padding:.4rem .5rem;border:1px solid var(--panel-border-color);border-radius:7px;background:var(--panel-bg-elevated-color);color:var(--panel-text-color)}.replay-lab input[type=range]{width:100%;padding:0;accent-color:var(--accent-color)}.replay-file-button{position:relative;display:inline-flex!important}.replay-file-button input{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden}.replay-load{display:flex;gap:.8rem;align-items:center;flex-wrap:wrap;margin:1.5rem 0;padding:1rem;border:1px dashed var(--panel-border-color);border-radius:12px}.replay-load>span{flex:1 1 230px}.replay-toggle{display:inline-flex;border:1px solid var(--accent-color);border-radius:999px;overflow:hidden;flex-shrink:0}.replay-toggle button{border:0;border-radius:0;min-height:36px}.replay-toggle button+button{border-left:1px solid var(--accent-color)}.replay-toggle button[aria-pressed=true]{background:var(--accent-color);color:#171717}.replay-toggle button:focus-visible{outline-offset:-4px}.replay-panel,.replay-empty,.replay-notice{padding:1rem;border:1px solid var(--panel-border-color);border-top:3px solid var(--accent-color);border-radius:0 0 12px 12px;background:var(--panel-bg-color)}.replay-panel h2{margin-top:0}.replay-panel dl{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.3rem .8rem;font-size:.9rem}.replay-panel dt{font-weight:700}.replay-panel dd{margin:0}.replay-panel table{display:table;margin:0;width:100%;border-collapse:collapse;font-size:.82rem}.replay-panel tr{border:0;background:var(--panel-bg-color);color:var(--panel-text-color)}.replay-panel tbody tr:nth-child(even){background:var(--panel-bg-elevated-color)}.replay-panel thead th{position:sticky;top:0;z-index:1;background:var(--panel-bg-elevated-color);color:var(--panel-text-color)}.replay-panel th,.replay-panel td{border:0;padding:.4rem .25rem;border-bottom:1px solid var(--panel-border-color);text-align:left}.replay-panel td{text-align:right}.replay-table-scroll{max-height:330px;overflow:auto}.replay-civ-dot{display:inline-block;width:.65rem;height:.65rem;border:2px solid;border-radius:50%;margin-right:.4rem}.replay-events{max-height:330px;overflow:auto;list-style:none;margin:0;padding:0}.replay-events li{padding:.6rem 0;border-bottom:1px solid var(--panel-border-color);font-size:.85rem}.replay-events strong,.replay-events span{display:block}.replay-events strong{color:var(--field-label-color)}.replay-event-filter{margin-top:.8rem}.replay-small-heading{margin-top:1rem!important}.replay-empty{margin-block:2rem}.replay-lab footer{margin-top:2rem;font-size:.8rem}.replay-notice{margin-block:1rem}@media(max-width:600px){.replay-lab{padding:1rem}.replay-load{padding:.8rem}}
</style>
