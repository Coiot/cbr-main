<template>
  <section class="official-card" aria-label="City details">
    <template v-if="tile?.city">
      <h2>{{ tile.city.name }}</h2>
      <p class="official-muted">Turn {{ turn }} · {{ ownerName }}<br />City and territory: verified game history</p>
      <dl>
        <dt>Population</dt><dd>{{ tile.city.size ?? 'Not recorded' }}<small v-if="tile.city.attribution?.population">Added by {{ tile.city.attribution.population.name }}</small></dd>
        <dt>Majority religion</dt><dd>{{ tile.city.religion === undefined ? 'Not recorded' : tile.city.religion || 'No majority religion' }}<small v-if="tile.city.attribution?.religion">Added by {{ tile.city.attribution.religion.name }}</small></dd>
        <dt>World wonders</dt><dd>{{ tile.city.worldWonders?.join(', ') || 'No verified construction recorded' }}<small v-if="tile.city.attribution?.wonders">Additional records by {{ tile.city.attribution.wonders.name }}</small></dd>
        <template v-if="tile.city.holyReligions?.length"><dt>Holy city</dt><dd>{{ tile.city.holyReligions.join(', ') }}<small>Recorded religion founding</small></dd></template>
      </dl>
      <p class="official-muted">Missing details are unknown, not zero. Reader additions apply only to this city at this turn.</p>
      <p v-if="preview">Contributions are available after publication.</p>
      <button v-else-if="!user" @click="signIn">Sign in to add missing details</button>
      <details v-else @toggle="opened=$event.target.open">
        <summary>Add or update a missing detail</summary>
        <form @submit.prevent="save('contribute')">
          <label>Detail<select v-model="field" @change="reset"><option value="population">Population</option><option value="religion">Majority religion</option><option value="wonders">Additional world wonders</option></select></label>
          <label v-if="field==='population'">Population<input v-model.number="value" required type="number" min="1" max="10000" /></label>
          <label v-else-if="field==='religion'">Religion<select v-model="value"><option value="">No majority religion</option><option v-for="name in availableReligions" :key="name">{{name}}</option></select></label>
          <label v-else>Additional wonders<select v-model="value" multiple><option v-for="name in availableWonders" :key="name">{{name}}</option></select></label>
          <label>Episode / scene reference (optional)<input v-model="reference" maxlength="200" placeholder="Episode 35, scene 12" /></label>
          <p class="official-muted">This appears immediately with your public name. Use information already revealed in the show.</p>
          <button :disabled="busy || !loaded">Save detail</button>
          <button v-if="admin && current" type="button" :disabled="busy" @click="save('hide')">Hide this addition</button>
        </form>
      </details>
      <button v-if="admin && !preview" @click="loadHistory">Edit history</button>
      <ol v-if="history.length"><li v-for="row in history" :key="row.id">{{row.record.field}}: {{row.record.value}} · {{row.record.author_name}}
        <button :disabled="busy" @click="restore(row)">Restore</button></li></ol>
      <p v-if="message" role="status">{{message}}</p>
    </template>
    <p v-else>Select a city to inspect its history or fill a missing detail.</p>
  </section>
</template>
<script>
import {MAP_PUBLISHER_ID} from '../../../../../shared/mapRelease.mjs';
import {s5OwnerList} from '../communityTileMapConstants';
import {mapReleaseRequest} from './mapReleaseApi.mjs';
export default {
  props:['tile','turn','release','releaseId','rows','user','client','preview','loaded'],
  emits:['changed'],
  data:()=>({field:'population',value:'',reference:'',busy:false,message:'',history:[],opened:false}),
  computed:{
    admin(){return this.user?.id===MAP_PUBLISHER_ID;},
    ownerName(){return s5OwnerList[this.tile?.city?.owner]?.name||'Unclaimed';},
    current(){return this.rows?.find(r=>r.city_id===this.tile?.city?.id&&r.field===this.field);},
    availableReligions(){return this.release.catalog.religions.filter(n=>this.release.events.some(e=>e.kind==='holyCity'&&e.turn<=this.turn&&e.name===n));},
    availableWonders(){return this.release.catalog.wonders.filter(n=>this.release.events.some(e=>e.kind==='wonder'&&e.turn<=this.turn&&e.name===n)&&(!this.tile?.city?.worldWonders?.includes(n)||this.current?.value?.includes(n)));}
  },
  watch:{'tile.city.id'(){this.reset();this.history=[];},turn(){this.reset();this.history=[];},rows(){if(!this.opened)this.reset();}},
  methods:{
    signIn(){window.dispatchEvent(new CustomEvent('open-account-menu'));},
    reset(){this.value=this.current?.value??(this.field==='wonders'?[]:'');this.reference=this.current?.reference||'';this.message='';},
    async save(action,historyId){
      if(this.busy||!this.tile?.city)return;
      this.busy=true;this.message='';
      try {
        await mapReleaseRequest({action,id:this.releaseId,turn:this.turn,historyId,contribution:{
          city:this.tile.city.id,turn:this.turn,field:this.field,value:this.value,reference:this.reference,expectedRevision:this.current?.revision||0
        }},this.client);
        this.message='Saved.';this.$emit('changed');
      }catch(error){this.message=error.message;}
      finally{this.busy=false;}
    },
    async loadHistory(){try{const result=await mapReleaseRequest({action:'history',id:this.releaseId,turn:this.turn,city:this.tile.city.id},this.client);this.history=result.rows;}catch(error){this.message=error.message;}},
    restore(row){this.field=row.record.field;this.reset();this.save('restore',row.id);}
  }
};
</script>
