<template>
  <div class="layer-tile-notes">
    <template v-if="tile!==null">
      <p class="official-muted notes-scope">Notes stay on this tile at every turn.</p>
      <h3>Community</h3>
      <p v-if="loading" role="status">Loading notes…</p>
      <article v-for="note in visibleNotes" :key="note.author" class="community-tile-note">
        <strong>{{note.author_name}}</strong><span v-if="note.is_hidden" class="official-muted"> · Hidden</span>
        <p>{{note.body}}</p>
        <button v-if="moderator" type="button" :disabled="saving" @click="moderate(note)">{{note.is_hidden?'Restore':'Hide'}}</button>
      </article>
      <p v-if="!loading&&!visibleNotes.length" class="official-muted">No notes yet.</p>
      <button v-if="hasMore" type="button" :disabled="loading" @click="load(false)">More notes</button>
      <form v-if="user&&(allowed||own)" class="tile-notes-editor" @submit.prevent="save">
        <label>Your community note<textarea v-model="text" class="tile-edit-input tile-notes-input" maxlength="2000" rows="3" :disabled="saving||!allowed" /></label>
        <div class="note-actions"><button v-if="allowed" type="submit" :disabled="saving||loading||!text.trim()">{{saving?'Saving…':'Save public note'}}</button>
        <button v-if="own&&!own.is_deleted" type="button" :disabled="saving||loading" @click="remove">Delete</button></div>
      </form>
      <p v-else class="official-muted">{{user?'Supporters can add community notes.':'Sign in as a supporter to add a note.'}}</p>
      <p v-if="error" role="alert">{{error}} <button type="button" @click="load(true,true)">Reload notes</button></p>
      <div class="personal-note-heading"><label for="personal-tile-note">My view note</label><span class="official-muted" id="personal-note-hint">Saved with your view</span></div>
      <div class="tile-notes-editor">
        <textarea id="personal-tile-note" aria-describedby="personal-note-hint" placeholder="Add a note…" v-model="personal" @input="personalDirty=true" class="tile-edit-input tile-notes-input" maxlength="2000" rows="3" @blur="savePersonal()" />
      </div>
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
.layer-tile-notes{font-size:.85rem;line-height:1.4}
.layer-tile-notes h3,.personal-note-heading label{font-size:.9rem;font-weight:700;margin:0}
.layer-tile-notes p{margin:.4rem 0}
.layer-tile-notes .notes-scope{margin:0 0 .7rem}
.community-tile-note{border-bottom:1px solid var(--panel-border-color);padding:.5rem 0}
.community-tile-note p{white-space:pre-wrap;overflow-wrap:anywhere}
.layer-tile-notes form{display:grid;gap:.4rem;margin-top:.6rem}
.layer-tile-notes textarea.tile-notes-input{box-sizing:border-box;width:100%;min-block-size:4.5rem;margin-top:.3rem}
.personal-note-heading{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:.25rem .5rem;border-top:1px solid var(--panel-border-color);padding-top:.65rem;margin-top:.7rem}
.personal-note-heading span{font-size:.75rem}
.note-actions{display:flex;flex-wrap:wrap;gap:.35rem}
.layer-tile-notes button{font-size:.8rem;padding:.3rem .7rem}
</style>
