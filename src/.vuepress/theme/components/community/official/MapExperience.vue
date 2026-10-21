<template>
  <section>
    <template v-if="!enabled"><CommunityTileMapGrid /></template>
    <template v-else-if="loading"><p role="status">Loading the released map…</p></template>
    <section v-else-if="error" class="official-card" role="alert"><p>{{error}}</p><button @click="load">Retry map</button></section>
    <template v-else-if="release">
      <div v-if="showTimelineExtras" class="official-card"><div class="official-controls" role="group" aria-label="Map source">
        <button :aria-pressed="!archive" @click="showOfficial">Official timeline</button>
        <button :aria-pressed="archive" @click="showArchive">Community archive</button>
      </div><p v-if="archive">Earlier maps assembled by community editors. These are preserved as originally published.</p></div>
      <CommunityTileMapGrid v-if="archive" :key="`archive:${archiveId}`" archive-mode :snapshot-payload="[]" />
      <OfficialTimeline v-else :key="releaseId" :release="release" :release-id="releaseId" :base="base" :initial-turn="turn" :initial-compare="compareTurn" :episode-markers="markers" :can-manage-episodes="publisher" :episode-saving="savingEpisode" :episode-message="episodeMessage" :public-release-id="publicReleaseId" @turn="turn=$event" @episode="saveEpisode" />
    </template>
    <CommunityTileMapGrid v-else />
    <p v-if="episodeMessage" role="status">{{episodeMessage}}</p>
  </section>
</template>
<script>
import {markRaw} from 'vue';
import CommunityTileMapGrid from '../CommunityTileMapGrid.vue';
import OfficialTimeline from './OfficialTimeline.vue';
import config from '../../../../../shared/officialMapConfig.json';
import {timelineLastTurn,defaultEpisodeMarkers} from '../../../../../shared/mapTimelineDisplay.mjs';
import {validateRelease,MAP_PUBLISHER_ID} from '../../../../../shared/mapRelease.mjs';
import {baseIdentity} from '../replay/replayModel.mjs';
import {mapReleaseRequest,parseTimelineSource} from './mapReleaseApi.mjs';
import {getSavedView} from '../map/savedViewsApi.mjs';
import {getSupabaseClient} from '../../../supabaseClient';
import {subscribeAccountAuth} from '../../../account/accountSync.js';
export default {
  components:{CommunityTileMapGrid,OfficialTimeline},
  data:()=>({enabled:config.enabled,showTimelineExtras:config.showTimelineExtras,loading:true,error:'',release:null,releaseId:'',sourceId:'',base:null,turn:null,compareTurn:null,archive:false,archiveId:'',client:null,user:null,markers:defaultEpisodeMarkers.map(m=>({...m})),publicReleaseId:'',savingEpisode:false,episodeMessage:''}),
  computed:{publisher(){return this.user?.id===MAP_PUBLISHER_ID;},lastTurn(){return this.release?timelineLastTurn(this.release.lastTurn,this.markers):0;}},
  watch:{'$route.query'(){if(this.enabled)this.resolveSource().catch(e=>this.error=e.message);}},
  mounted(){this._alive=true;if(!this.enabled)return;
    this.client=getSupabaseClient();if(this.client)this._auth=subscribeAccountAuth(this.client,session=>{const user=session?.user||null;if(!this._authReady||user?.id!==this.user?.id){this._authReady=true;this.user=user;this.release=null;this.load();}});else this.load();
    this._poll=setInterval(async()=>{if(document.hidden||this.loading||this.savingEpisode)return;try{const {active}=await mapReleaseRequest({action:'manifest'});if(this._alive&&(active?.id||'')!==this.publicReleaseId)this.load(this.turn);}catch{}},60000);
  },
  beforeUnmount(){this._alive=false;this._auth?.unsubscribe();clearInterval(this._poll);this._abort?.abort();this._sourceRequest++;},
  methods:{
    async load(preserveTurn=null){
      const request=this._loadRequest=(this._loadRequest||0)+1;
      this.loading=true;this.error='';this._abort?.abort();this._abort=new AbortController();
      const publisher=this.publisher;
      try {
        let result;
        const manifest=await mapReleaseRequest({action:'manifest'},null,this._abort.signal);let active=manifest.active;
        if(active){
          if(publisher){const admin=await mapReleaseRequest({action:'timeline-admin'},this.client,this._abort.signal);active=admin.active;this.sourceId=admin.sourceId;result={id:active.id,release:admin.release};}
          else result=await mapReleaseRequest({action:'release',id:active.id},null,this._abort.signal);
        }
        if(!this._alive||request!==this._loadRequest)return;
        this.publicReleaseId=active?.id||'';
        if(!result){this.release=null;return;}
        const baseResponse=await fetch(this.$withBase('/community/CBRXMapOct62025_V2.base.json'),{signal:this._abort.signal});
        if(!baseResponse.ok)throw new Error('Season 5 geography is unavailable.');
        const base=await baseResponse.json(),release=validateRelease(result.release);
        if(baseIdentity(base).fingerprint!==release.map.fingerprint)throw new Error('The released map uses different geography.');
        if(!this._alive||request!==this._loadRequest)return;
        this.markers=active?.bookmarks?.length?active.bookmarks:defaultEpisodeMarkers.filter(m=>m.turn<=release.lastTurn);
        if(!this.markers.length)this.markers=[{episode:'0',turn:release.firstTurn}];
        this.base=markRaw(base);this.release=markRaw(release);this.releaseId=result.id;await this.resolveSource(preserveTurn);
      }catch(error){if(this._alive&&request===this._loadRequest&&error.name!=='AbortError')this.error=error.message;}
      finally{if(this._alive&&request===this._loadRequest)this.loading=false;}
    },
    async saveEpisode(marker){
      if(!this.publisher||!config.enabled)return;this.savingEpisode=true;this.episodeMessage='';
      try{await mapReleaseRequest({action:'set-episode',sourceId:this.sourceId,expected:this.publicReleaseId||null,marker},this.client);await this.load(this.turn);this.episodeMessage=`Episode ${marker.episode} endpoint published at the end of turn ${marker.turn}.`;}
      catch(error){this.episodeMessage=error.message;}finally{this.savingEpisode=false;}
    },
    async resolveSource(preserveTurn=null){
      if(!this.release)return;
      const request=this._sourceRequest=(this._sourceRequest||0)+1;
      let snapshot=this.$route.query.snapshot||'',compare=this.$route.query.compare||'';
      if(this.$route.query.saved_view) {
        const view=await getSavedView(getSupabaseClient(),this.$route.query.saved_view);
        if(!this._alive||request!==this._sourceRequest)return;
        if(!view)throw new Error('This saved view is unavailable.');
        snapshot=view.settings?.snapshot||'';
        compare=view.settings?.compare||'';
      }
      const source=parseTimelineSource(snapshot);
      if(String(snapshot).startsWith('timeline:')&&!source)throw new Error('Invalid timeline link.');
      if(source&&(source.history!==this.release.history||source.turn<this.release.firstTurn||source.turn>this.lastTurn))throw new Error('That timeline turn has not been released.');
      this.error='';this.archive=!!snapshot&&!source;this.archiveId=this.archive?snapshot:'';
      this.turn=source?.turn??(Number.isInteger(preserveTurn)?Math.max(this.release.firstTurn,Math.min(preserveTurn,this.lastTurn)):Math.min(this.lastTurn,this.markers.at(-1).turn));
      const comparison=parseTimelineSource(compare);
      if(!this.archive&&compare&&(!comparison||comparison.history!==this.release.history||comparison.turn>this.lastTurn||comparison.turn<this.release.firstTurn))throw new Error('That comparison turn has not been released.');
      this.compareTurn=comparison?.turn??null;
    },
    showOfficial(){this.$router.replace({path:'/community-tile-map/',query:{}});},
    showArchive(){this.$router.replace({path:'/community-tile-map/',query:{snapshot:'episode-0-base'}});}
  }
};
</script>
