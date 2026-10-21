<template>
  <CommunityTileMapGrid v-if="ready" ref="map" embedded :official-source="source" />
  <p v-else-if="error" role="status">Map preview unavailable. <button @click="load">Retry</button></p>
  <p v-else role="status">Loading the released map…</p>
</template>
<script>
import {markRaw} from 'vue';
import CommunityTileMapGrid from '../CommunityTileMapGrid.vue';
import config from '../../../../../shared/officialMapConfig.json';
import {validateRelease} from '../../../../../shared/mapRelease.mjs';
import {mergeDetails} from '../../../../../shared/mapDetails.mjs';
import {baseIdentity} from '../replay/replayModel.mjs';
import {mapReleaseRequest,timelineSource} from './mapReleaseApi.mjs';
export default {
  components:{CommunityTileMapGrid},
  data:()=>({source:null,ready:!config.enabled,error:''}),
  mounted(){this._alive=true;if(config.enabled)this.load();},
  beforeUnmount(){this._alive=false;this._worker?.terminate();this._abort?.abort();},
  methods:{
    zoomIn(){this.$refs.map?.zoomIn();},zoomOut(){this.$refs.map?.zoomOut();},fitToView(){this.$refs.map?.fitToView();},
    async load(){
      this.error='';this._abort?.abort();this._abort=new AbortController();
      try {
        const {active}=await mapReleaseRequest({action:'manifest'},null,this._abort.signal);
        if(!active){this.ready=true;return;}
        const [{release},response]=await Promise.all([mapReleaseRequest({action:'release',id:active.id},null,this._abort.signal),fetch(this.$withBase('/community/CBRXMapOct62025_V2.base.json'),{signal:this._abort.signal})]);
        if(!response.ok)throw new Error('Base unavailable.');const base=await response.json();validateRelease(release);
        if(baseIdentity(base).fingerprint!==release.map.fingerprint)throw new Error('Map geography differs.');
        const frame=await new Promise((resolve,reject)=>{
          this._worker=new Worker(new URL('./timelineWorker.mjs',import.meta.url),{type:'module'});
          this._worker.onmessage=({data})=>{this._worker.terminate();data.error?reject(new Error(data.error)):resolve(data.frame);};
          this._worker.onerror=()=>{this._worker.terminate();reject(new Error('Map reader failed.'));};
          this._worker.postMessage({request:1,release,turn:release.lastTurn});
        });
        const details=await mapReleaseRequest({action:'details',id:active.id,turn:release.lastTurn},null,this._abort.signal);
        if(!this._alive)return;this.source=markRaw({base,frame:mergeDetails(frame,details.rows.map(r=>r.record)),source:timelineSource(release.history,release.lastTurn),preview:true});this.ready=true;
      }catch(error){if(this._alive&&error.name!=='AbortError')this.error=error.message;}
    }
  }
};
</script>
