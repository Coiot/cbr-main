<template>
  <main id="main-content" class="map-publishing">
    <AlbumsNav compact label="Map publishing navigation" :archive="{to:'/community-tile-map/',label:'Back to the community map'}" />
    <h1>Map releases</h1>
    <p>Prepare bounded history locally, preview it here, then explicitly publish an episode end turn.</p>
    <section v-if="!local&&!publisher" class="official-card">
      <p>Only Coiot can manage map releases.</p><button @click="signIn">Sign in</button>
    </section>
    <template v-else>
      <section class="official-card">
        <h2>Private preview</h2>
        <label>Choose a prepared release JSON<input type="file" :disabled="busy" @change="loadFile" /></label>
        <p v-if="validation">{{validation.ok?'Local checks passed.':'Recovered history has review gaps.'}}</p>
        <ul v-if="validation?.issues?.length"><li v-for="issue in validation.issues" :key="issue">{{issue}}</li></ul>
        <p v-if="candidate">Episode {{candidate.bookmarks.at(-1)?.episode}} · maximum turn {{candidate.lastTurn}}</p>
        <p v-if="!config.enabled">Public integration is disabled. Deploy and verify the release service before enabling it; publishing is unavailable meanwhile.</p>
        <label v-if="publisher&&validation&&!validation.ok"><input v-model="acceptHistoricalGaps" type="checkbox" /> Use this recovered event history with its recorded gaps. Do not infer missing city events.</label>
        <button v-if="candidate&&publisher" :disabled="busy||!(validation?.ok||acceptHistoricalGaps)||!config.enabled" @click="stage">Stage private history</button>
        <p v-if="local&&!publisher">Local preview is available without an account. Sign in as Coiot to stage or publish.</p>
        <button v-if="!publisher" @click="signIn">Sign in as Coiot</button>
      </section>
      <section v-if="publisher" class="official-card">
        <h2>Publication</h2><p>{{active?`Public through T${active.last_turn}`:'No official timeline has been published.'}}</p>
        <button :disabled="busy" @click="refresh">Refresh releases</button>
        <label>Prepared release<select v-model="selectedId" :disabled="busy" @change="previewDraft"><option value="">Choose a release</option>
          <option v-for="r in releases" :key="r.id" :value="r.id">T{{r.last_turn}} · {{r.published_at?'Previously published':'Private draft'}} · {{r.id.slice(0,8)}}</option>
        </select></label>
        <template v-if="selectedId&&candidate">
          <label>Confirm maximum public turn<input v-model.number="confirmationTurn" type="number" :placeholder="String(candidate.lastTurn)" /></label>
          <label><input v-model="confirmed" type="checkbox" /> I reviewed this exact episode release and its safe end turn.</label>
          <p v-if="active&&candidate.lastTurn<active.last_turn">This rolls back the served limit. Information already downloaded cannot be recalled.</p>
          <button :disabled="busy||!config.enabled||!confirmed||confirmationTurn!==candidate.lastTurn" @click="publish">Publish through T{{candidate.lastTurn}}</button>
        </template>
      </section>
      <p v-if="message" role="status">{{message}}</p>
      <OfficialTimeline v-if="candidate&&base" :key="previewKey" :release="candidate" :release-id="selectedId" :base="base" :preview="true" :local-editing="local" :full-range="local||publisher" :can-manage-episodes="publisher&&config.enabled" :episode-markers="active?.bookmarks" :episode-saving="busy" :episode-message="message" :public-release-id="active?.id" @episode="saveEpisode" />
    </template>
  </main>
</template>
<script>
import {markRaw} from 'vue';
import AlbumsNav from '../components/albums/AlbumsNav.vue';
import OfficialTimeline from '../components/community/official/OfficialTimeline.vue';
import {mapReleaseRequest} from '../components/community/official/mapReleaseApi.mjs';
import {baseIdentity} from '../components/community/replay/replayModel.mjs';
import {MAP_PUBLISHER_ID,MAX_RELEASE_BYTES,validateRelease,auditRelease} from '../../../shared/mapRelease.mjs';
import config from '../../../shared/officialMapConfig.json';
import {getSupabaseClient} from '../supabaseClient';
import {subscribeAccountAuth} from '../account/accountSync.js';
export default {
  components:{AlbumsNav,OfficialTimeline},
  data:()=>({config,local:false,user:null,client:null,candidate:null,base:null,validation:null,message:'',busy:false,
    active:null,releases:[],selectedId:'',confirmed:false,confirmationTurn:'',previewKey:0,acceptHistoricalGaps:false}),
  computed:{publisher(){return this.user?.id===MAP_PUBLISHER_ID;}},
  mounted(){
    this._alive=true;
    this.local=import.meta.env.DEV && ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
    this.client=getSupabaseClient();this._auth=subscribeAccountAuth(this.client,session=>{
      this.user=session?.user||null;
      if(this.publisher)this.refresh();
      else if(!this.local){this.candidate=null;this.releases=[];this.active=null;}
    });
  },
  beforeUnmount(){this._alive=false;this._auth?.unsubscribe();},
  methods:{
    signIn(){window.dispatchEvent(new CustomEvent('open-account-menu'));},
    async readBase(release){
      const response=await fetch(this.$withBase('/community/CBRXMapOct62025_V2.base.json'));if(!response.ok)throw new Error('Base geography unavailable.');
      const base=await response.json();if(baseIdentity(base).fingerprint!==release.map.fingerprint)throw new Error('Base geography differs from this release.');this.base=markRaw(base);
    },
    async loadFile(event){
      const file=event.target.files?.[0];event.target.value='';if(!file)return;
      this.busy=true;this.message='';this.selectedId='';this.confirmed=false;this.confirmationTurn='';this.acceptHistoricalGaps=false;
      try{
        if(file.size>MAX_RELEASE_BYTES+65536)throw new Error('Prepared release exceeds the size limit.');
        const input=JSON.parse(await file.text()),candidate=validateRelease(input.release);
        const audit=auditRelease(candidate);
        this.validation={...input.validation,ok:input.validation?.ok===true&&audit.ok,issues:[...(input.validation?.issues||[]),...audit.issues]};
        await this.readBase(candidate);if(!this._alive||(!this.local&&!this.publisher))return;
        this.candidate=markRaw(candidate);this.previewKey++;
      }catch(error){this.candidate=null;this.message=error.message;}
      finally{this.busy=false;}
    },
    async refresh(){try{const result=await mapReleaseRequest({action:'admin'},this.client);if(this._alive&&this.publisher){this.active=result.active;this.releases=result.releases;}}catch(error){this.message=error.message;}},
    async stage(){
      if(!config.enabled)return;
      this.busy=true;try{const result=await mapReleaseRequest({action:'stage',release:this.candidate,validation:this.validation,acceptHistoricalGaps:this.acceptHistoricalGaps},this.client);
        await this.refresh();this.selectedId=result.id;this.confirmed=false;this.confirmationTurn='';this.message='Staged privately. Review and confirm the end turn before publishing.';
      }catch(error){this.message=error.message;}finally{this.busy=false;}
    },
    async previewDraft(){
      this.confirmed=false;this.confirmationTurn='';this.candidate=null;
      const id=this.selectedId;if(!id)return;
      this.busy=true;try{const {release}=await mapReleaseRequest({action:'draft',id},this.client);validateRelease(release);
        await this.readBase(release);if(!this._alive||!this.publisher||id!==this.selectedId)return;
        this.candidate=markRaw(release);this.validation=null;this.previewKey++;
      }catch(error){this.candidate=null;this.message=error.message;}finally{this.busy=false;}
    },
    async saveEpisode(marker){
      if(!this.publisher||!config.enabled||!this.selectedId)return;
      this.busy=true;this.message='';try{await mapReleaseRequest({action:'set-episode',sourceId:this.selectedId,expected:this.active?.id||null,marker},this.client);await this.refresh();this.message=`Published Episode ${marker.episode} through the end of turn ${marker.turn}.`;}catch(error){this.message=error.message;}finally{this.busy=false;}
    },
    async publish(){
      if(!config.enabled||!this.confirmed||this.confirmationTurn!==this.candidate?.lastTurn)return;
      this.busy=true;try{await mapReleaseRequest({action:'publish',id:this.selectedId,endTurn:this.confirmationTurn,confirm:true,expected:this.active?.id||null},this.client);
        this.confirmed=false;await this.refresh();this.message=`Published through T${this.active.last_turn}.`;
      }catch(error){this.message=error.message;}finally{this.busy=false;}
    }
  }
};
</script>
<style scoped>.map-publishing{max-width:1400px;margin:auto;padding:2rem 1rem}.map-publishing>p{max-width:75ch}</style>
