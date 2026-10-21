<template>
  <section class="official-map">
    <div v-if="showTimelineExtras" class="official-card">
      <p class="official-eyebrow">{{preview||turn>publicEndTurn?'Private preview':'Official game timeline'}}</p>
      <h2>{{bookmark ? `Episode ${bookmark.episode}` : 'Season 5'}} · End of turn {{turn}}</h2>
      <p>Available through the end of turn {{lastTurn}}. Terrain, rivers and resources use the Season 5 base geography.</p>
      <label>Compare end of turn<input v-model.number="compareTurn" type="number" :min="release.firstTurn" :max="lastTurn" placeholder="None" @change="compare" /></label>
      <p v-if="comparison">Compared with T{{comparison.turn}}: {{frame?.cities.length-comparison.cities.length}} net city change, {{changedTiles}} territory changes. <button @click="comparison=null;compareTurn=''">Clear comparison</button></p>
    </div>
    <!-- <p v-if="error" role="alert">{{error}}</p>
    <p v-if="busy" role="status">Loading turn…</p> -->
    <CommunityTileMapGrid v-if="source" :official-source="source" extra-panel-label="Replay" :detail-editing="!!(localEditing||(canEditDetails&&turn<=publicEndTurn))" :detail-edit-status="detailResult?.message||''" @official-detail-edit="saveDetails">
      <template #map-timeline><MapTimelineToolbar :turn="turn" :first-turn="release.firstTurn" :last-turn="lastTurn" :playing="playing" :speed="speed" :disabled="!frame"
        :bookmarks="bookmarks" :can-manage="canManageEpisodes" :remote="!!(releaseId&&canManageEpisodes)" :saving="episodeSaving" :message="episodeMessage" :public-turn="publicReleaseId?publicEndTurn:null"
        @turn="choose" @play="togglePlay" @speed="speed=$event" @episode="saveEpisode" /></template>
      <template #extra-panel><TimelineReplayPanel :release="release" :frame="frame" /></template>
    </CommunityTileMapGrid>
    <details v-if="comparison" class="official-card"><summary>View comparison map at the end of turn {{comparison.turn}}</summary>
      <CommunityTileMapGrid :key="comparison.turn" :embedded="true" embedded-mode="snapshot" :official-source="{base,frame:comparison,source:sourceId(comparison.turn),preview:true}" />
    </details>
    <p v-if="showTimelineExtras" class="official-muted">Cities and borders follow game history.<template v-if="editorDetailsEnabled"> Editor updates use one shared live layer across the timeline.</template></p>
    <button v-if="showTimelineExtras&&!preview" @click="download">{{turn>publicEndTurn?'Download private preview':'Download this released turn'}}</button>
    <footer class="official-replay-credit">Replay format credits: <a href="https://github.com/aiwebb/civ5replay" target="_blank" rel="noopener noreferrer">Andrew Webb’s civ5replay</a>.</footer>
  </section>
</template>
<script>
import {markRaw} from 'vue';
import {timelineLastTurn,timelineBookmarks,defaultEpisodeMarkers} from '../../../../../shared/mapTimelineDisplay.mjs';
import MapTimelineToolbar from './MapTimelineToolbar.vue';
import TimelineReplayPanel from './TimelineReplayPanel.vue';
import CommunityTileMapGrid from '../CommunityTileMapGrid.vue';
import {emptyDetails,mergeDetails,putDetail,detailKey} from '../../../../../shared/mapDetails.mjs';
import {mapReleaseRequest,timelineSource} from './mapReleaseApi.mjs';
import {getSupabaseClient} from '../../../supabaseClient';
import config from '../../../../../shared/officialMapConfig.json';
import {subscribeAccountAuth} from '../../../account/accountSync.js';
export default {
  components:{CommunityTileMapGrid,MapTimelineToolbar,TimelineReplayPanel},
  props:['release','releaseId','base','initialTurn','initialCompare','preview','localEditing','episodeMarkers','canManageEpisodes','episodeSaving','episodeMessage','publicReleaseId'],
  emits:['turn','episode'],
  data:()=>({showTimelineExtras:config.showTimelineExtras,editorDetailsEnabled:config.editorDetailsEnabled,turn:0,frame:null,detailRows:[],detailLayer:null,canEditDetails:false,savingDetail:false,detailResult:null,source:null,selected:null,error:'',busy:false,playing:false,speed:2,localMarkers:defaultEpisodeMarkers.map(m=>({...m})),compareTurn:'',comparison:null,client:null,user:null}),
  computed:{
    lastTurn(){return timelineLastTurn(this.release.lastTurn,this.confirmedMarkers);},
    confirmedMarkers(){return this.episodeMarkers||this.localMarkers;},
    publicEndTurn(){return Math.min(this.release.lastTurn,this.confirmedMarkers.at(-1)?.turn??0);},
    bookmarks(){return timelineBookmarks(this.confirmedMarkers,this.lastTurn);},
    dataReleaseId(){return this.publicReleaseId||this.releaseId;},
    bookmark(){return this.bookmarks.find(b=>b.turn===this.turn);},
    changedTiles(){return this.comparison&&this.frame?this.frame.owners.reduce((n,o,i)=>n+Number(o!==this.comparison.owners[i]),0):0;}
  },
  watch:{
    lastTurn(value){if(this.frame&&this.turn>value)this.choose(value);},
    speed(){if(this.playing){this.pause(false);this.togglePlay();}},
    initialTurn(v){if(v!==this.turn)this.choose(v);},
    initialCompare(v){this.compareTurn=v??'';this.compare();},
    comparison(){if(this.frame)this.updateSource();}
  },
  mounted(){
    this._alive=true;this.localMarkers=this.episodeMarkers||defaultEpisodeMarkers;if(!this.localMarkers.length)this.localMarkers=[{episode:'0',turn:this.release.firstTurn}];this._requests=new Map();this._sequence=0;
    this.detailLayer=markRaw(emptyDetails(this.release.history));
    this._worker=new Worker(new URL('./timelineWorker.mjs',import.meta.url),{type:'module'});
    this._worker.onmessage=({data})=>{const pending=this._requests.get(data.request);if(!pending)return;this._requests.delete(data.request);data.error?pending.reject(new Error(data.error)):pending.resolve(data.frame);};
    this._worker.onerror=()=>{for(const p of this._requests.values())p.reject(new Error('Timeline worker failed. Reload to retry.'));this._requests.clear();};
    if(!this.preview&&this.editorDetailsEnabled){this.client=getSupabaseClient();this._auth=subscribeAccountAuth(this.client,session=>{this.user=session?.user||null;this.canEditDetails=false;if(this.user)this.checkEditAccess(this.user.id);});
      this._refresh=setInterval(()=>{if(!document.hidden&&!this.playing&&!this.busy)this.loadDetails();},60000);
    }
    this._visibility=()=>{if(document.hidden)this.pause();};document.addEventListener('visibilitychange',this._visibility);
    this.choose(this.initialTurn??this.publicEndTurn,true).then(async()=>{await this.loadDetails();if(this.initialCompare!=null){this.compareTurn=this.initialCompare;this.compare();}});
  },
  beforeUnmount(){this._alive=false;this._choose++;this.pause();clearInterval(this._refresh);this._worker?.terminate();this._auth?.unsubscribe();document.removeEventListener('visibilitychange',this._visibility);},
  methods:{
    sourceId(turn){return timelineSource(this.release.history,turn);},
    requestFrame(turn,initialize=false){if(!Number.isInteger(turn)||turn<this.release.firstTurn||turn>this.lastTurn)return Promise.reject(new Error('That turn is outside the available timeline.'));return new Promise((resolve,reject)=>{const request=++this._sequence;this._requests.set(request,{resolve,reject});this._worker.postMessage({request,turn,...(initialize?{release:JSON.parse(JSON.stringify(this.release))}:{})});});},
    async choose(turn,initialize=false,playback=false){
      if(!playback)this.pause(false);
      if(!Number.isInteger(turn)||turn<this.release.firstTurn||turn>this.lastTurn){this.error='That turn has not been released.';return;}
      const request=this._choose=(this._choose||0)+1;this.busy=true;this.error='';
      try{const frame=await this.requestFrame(turn,initialize);if(!this._alive||request!==this._choose)return;
        this.turn=turn;this.frame=markRaw(frame);this.updateSource();this.$emit('turn',turn);
      }catch(error){if(this._alive&&request===this._choose)this.error=error.message;}
      finally{if(this._alive&&request===this._choose)this.busy=false;}
    },
    updateSource(){this.source=markRaw({base:this.base,frame:mergeDetails(this.frame,[...this.detailRows.map(r=>r.record),...this.detailLayer.records]),source:this.sourceId(this.turn),compareSource:this.comparison?this.sourceId(this.comparison.turn):'',preview:!!this.preview||this.turn>this.publicEndTurn});},
    setDetails(layer){this.pause(false);this.detailLayer=markRaw(layer);this.updateSource();if(this.comparison)this.compare();},
    async checkEditAccess(userId){try{const result=await mapReleaseRequest({action:'detail-access'},this.client);if(this._alive&&this.user?.id===userId)this.canEditDetails=result.allowed===true;}catch{this.canEditDetails=false;}},
    saveEpisode(marker){if(this.canManageEpisodes)this.$emit('episode',marker);},
    async saveDetails(records){
      if(this.localEditing){let layer=this.detailLayer;for(const record of records)layer=putDetail(layer,record);this.setDetails(layer);return;}
      if(!this.canEditDetails||this.turn>this.publicEndTurn)return;this.pause(false);this._detailQueue??=new Map();this._detailRevisions??=new Map();
      for(const record of records){const key=detailKey(record),previous=this.detailRows.find(r=>detailKey(r.record)===key);this._detailQueue.set(key,{record,turn:this.turn,revision:previous?.revision||0});}
      if(this.savingDetail)return;this.savingDetail=true;
      try{while(this._detailQueue.size&&this._alive){
        const [key,entry]=this._detailQueue.entries().next().value;this._detailQueue.delete(key);
        const expected=Math.max(entry.revision,this._detailRevisions.get(key)||0);
        await mapReleaseRequest({action:'edit-detail',id:this.dataReleaseId,turn:entry.turn,record:entry.record,expectedRevision:expected},this.client);
        this._detailRevisions.set(key,expected+1);
        await this.loadDetails();
      }this.detailResult={message:'Saved.'};}
      catch(error){this._detailQueue.clear();this.error=error.message;this.detailResult={message:error.message};if(this.frame)this.updateSource();}
      finally{this.savingDetail=false;}
    },
    async loadDetails(){
      if(this.preview||!this.frame||!this.dataReleaseId||!this.editorDetailsEnabled)return;
      const request=this._detailRead=(this._detailRead||0)+1;
      try{const details=await mapReleaseRequest({action:'details',id:this.dataReleaseId,turn:Math.min(this.turn,this.publicEndTurn)},this.client);
        if(!this._alive||request!==this._detailRead)return;this.detailRows=details.rows;this.updateSource();if(this.comparison)this.compare();
      }catch(error){if(this._alive&&request===this._detailRead)this.error=`Editor updates could not be loaded. ${error.message}`;}
    },
    async compare(){if(this.compareTurn===''){this.comparison=null;return;}const turn=this.compareTurn;try{const frame=await this.requestFrame(turn);
      if(this._alive&&turn===this.compareTurn)this.comparison=markRaw(mergeDetails(frame,[...this.detailRows.map(r=>r.record),...this.detailLayer.records]));}catch(error){this.error=error.message;this.comparison=null;}},
    pause(refresh=true){clearTimeout(this._timer);const wasPlaying=this.playing;this.playing=false;if(wasPlaying&&refresh&&this._alive)this.loadDetails();},
    togglePlay(){if(this.playing){this.pause();return;}this.playing=true;const tick=async()=>{if(!this.playing||document.hidden)return;
      await this.choose(this.turn+1,false,true);if(!this.playing)return;if(this.turn>=this.lastTurn||this.error)this.pause();else this._timer=setTimeout(tick,1000/this.speed);};this._timer=setTimeout(tick,1000/this.speed);},
    download(){if(!this.source)return;const data={format:'cbr-published-map-frame',version:1,history:this.release.history,turn:this.turn,map:this.release.map,
      owners:Array.from(this.frame.owners),cities:this.source.frame.cities,ruins:this.source.frame.ruins,details:this.source.frame.details,availability:this.release.availability};
      const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`cbr-s5-turn-${this.turn}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }
};
</script>
<style>
.official-map{min-width:0}.official-card{padding:1rem;margin:1rem 0;border:1px solid var(--panel-border-color);border-top:3px solid var(--accent-color);border-radius:0 0 12px 12px;background:var(--panel-bg-color);color:var(--panel-text-color);overflow-wrap:anywhere}
.official-replay-credit{margin-top:2rem;color:var(--color-text-muted);font-size:.8rem}
.official-card h2{font-size:1.25rem;margin:.3rem 0 .6rem}.official-muted{color:var(--color-text-muted);font-size:.9rem}.official-eyebrow{color:var(--field-label-color);font-size:.8rem;text-transform:uppercase;font-weight:800;letter-spacing:.08em}
.official-controls{display:flex;gap:1rem;flex-wrap:wrap;align-items:end}.official-range{flex:1 1 200px}.official-controls input[type=number]{max-width:7rem}
.official-card label{display:grid;gap:.35rem;margin:.65rem 0;font-weight:700;font-size:.9rem}
.official-card input,.official-card select{box-sizing:border-box;min-width:0;max-width:100%;padding:.45rem;border:1px solid var(--panel-border-color);border-radius:6px;background:var(--panel-bg-elevated-color);color:var(--panel-text-color);font:inherit}
.official-card dl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:.6rem}.official-card dt{font-weight:bold}.official-card dd{margin:0}.official-card small{display:block;color:var(--field-label-color)}
.official-map button,.official-card button{border:1px solid var(--accent-color);border-radius:999px;background:var(--panel-bg-color);color:var(--panel-text-color);font:inherit;font-weight:700;padding:.5rem .9rem;cursor:pointer}
.official-map button:disabled,.official-card button:disabled{opacity:.45;cursor:default}.official-card :is(a,button,input,select,summary):focus-visible{outline:3px solid var(--accent-color);outline-offset:3px}
.official-card summary{cursor:pointer;font-weight:700}.official-card form{display:grid;gap:.5rem}.official-card p{line-height:1.5}
</style>
