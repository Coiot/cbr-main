<template>
  <div class="layer-tile-notes">
    <template v-if="tile!==null">
      <h3>Community notes</h3>
      <p v-if="loading" role="status">Loading notes…</p>
      <article v-for="note in visibleNotes" :key="note.author" class="community-tile-note">
        <strong>{{note.author_name}}</strong><span v-if="note.is_hidden" class="official-muted"> · Hidden</span>
        <p>{{note.body}}</p>
        <button v-if="moderator" type="button" :disabled="saving" @click="moderate(note)">{{note.is_hidden?'Restore':'Hide'}}</button>
      </article>
      <p v-if="!loading&&!visibleNotes.length" class="official-muted">No community notes on this tile yet.</p>
      <button v-if="hasMore" type="button" :disabled="loading" @click="load(false)">More notes</button>
      <form v-if="user&&(allowed||own)" class="tile-notes-editor" @submit.prevent="save">
        <label>Your community note<textarea v-model="text" class="tile-edit-input tile-notes-input" maxlength="2000" rows="4" :disabled="saving||!allowed" /></label>
        <p class="official-muted">Public at every timeline turn.</p>
        <button v-if="allowed" type="submit" :disabled="saving||loading||!text.trim()">{{saving?'Saving…':'Save public note'}}</button>
        <button v-if="own&&!own.is_deleted" type="button" :disabled="saving||loading" @click="remove">Delete my note</button>
      </form>
      <p v-else class="official-muted">{{user?'Supporters can add community notes.':'Sign in as a supporter to add a community note.'}}</p>
      <p v-if="error" role="alert">{{error}} <button type="button" @click="load(true,true)">Reload notes</button></p>
      <h3>My view note</h3>
      <label class="tile-notes-editor"><span class="official-muted">Stays on this tile at every turn. Included when you save this view.</span>
        <textarea v-model="personal" @input="personalDirty=true" class="tile-edit-input tile-notes-input" maxlength="2000" rows="4" @blur="savePersonal()" />
      </label>
    </template>
    <p v-else>Select a tile to view notes.</p>
  </div>
</template>
<script>
import {mapReleaseRequest} from './mapReleaseApi.mjs';
export default {
  props:{tile:{type:Number,default:null},client:Object,user:Object,allowed:Boolean,moderator:Boolean,personalNote:{type:String,default:''},version:Number},
  emits:['personal','changed'],
  data:()=>({rows:[],loading:false,saving:false,text:'',loadedText:'',draftRevision:0,personal:'',personalDirty:false,error:'',hasMore:false}),
  computed:{own(){return this.rows.find(n=>n.author===this.user?.id);},visibleNotes(){return this.rows.filter(n=>!n.is_deleted);}},
  watch:{tile(value,previous){if(previous!==null&&this.personalDirty)this.savePersonal(previous);this.rows=[];this.text='';this.loadedText='';this.draftRevision=0;this.personal=this.personalNote;this.load();},'user.id'(){this.rows=[];this.text='';this.loadedText='';this.draftRevision=0;this.load();},personalNote(v){if(!this.personalDirty)this.personal=v;},version(){if(!this.saving)this.load();}},
  mounted(){this._alive=true;this.personal=this.personalNote;this.load();},beforeUnmount(){this._alive=false;this._request++;},
  methods:{
    async load(reset=true,forceText=false){if(this.tile===null)return;const request=this._request=(this._request||0)+1,tile=this.tile;this.loading=true;this.error='';try{const result=await mapReleaseRequest({action:'tile-notes',tile,offset:reset?0:this.rows.length},this.client);if(!this._alive||request!==this._request||tile!==this.tile)return;this.rows=reset?result.rows:[...this.rows,...result.rows];this.hasMore=result.rows.length===50;if(forceText||this.text===this.loadedText){this.text=this.own&&!this.own.is_deleted?this.own.body:'';this.loadedText=this.text;this.draftRevision=this.own?.revision||0;}}catch(error){if(this._alive&&request===this._request)this.error=error.message;}finally{if(this._alive&&request===this._request)this.loading=false;}},
    async save(){if(!this.user||!this.allowed||this.saving||this.loading||!this.text.trim())return;await this.write(this.text);},
    async remove(){if(!this.saving&&!this.loading)await this.write('');},
    async write(text){const tile=this.tile;this.saving=true;this.error='';try{await mapReleaseRequest({action:'note-write',tile,text,expectedRevision:this.draftRevision},this.client);if(this._alive){await this.load(true,true);this.$emit('changed');}}catch(error){if(this._alive)this.error=error.message;}finally{if(this._alive)this.saving=false;}},
    async moderate(note){this.saving=true;this.error='';try{await mapReleaseRequest({action:'note-hide',tile:this.tile,author:note.author,hidden:!note.is_hidden,expectedRevision:note.revision},this.client);if(this._alive){await this.load(true,true);this.$emit('changed');}}catch(error){if(this._alive)this.error=error.message;}finally{if(this._alive)this.saving=false;}},
    savePersonal(tile=this.tile){if(this.personalDirty){this.personalDirty=false;this.$emit('personal',{tile,text:this.personal});}}
  }
};
</script>
<style scoped>
.layer-tile-notes h3{font-size:1rem;margin:1rem 0 .5rem}.community-tile-note{border-bottom:1px solid var(--panel-border-color);padding:.6rem 0}.community-tile-note p{white-space:pre-wrap;overflow-wrap:anywhere;margin:.4rem 0}.layer-tile-notes form{display:grid;gap:.5rem}.layer-tile-notes textarea{box-sizing:border-box;width:100%;margin-top:.4rem}.layer-tile-notes button{margin:.3rem .3rem .3rem 0}
</style>
