<template><section v-if="rows.length || error" class="showcase-section"><h2>My scene collections</h2><p v-if="error" role="status">Collections could not be loaded. <button @click="load">Try again</button></p><div class="supporter-grid"><article v-for="row in rows" :key="row.id" class="supporter-panel"><h3><router-link :to="collectionLink(row.id)">{{ row.title }}</router-link></h3><p>{{ row.description }}</p><p>{{ row.scene_count }} scenes</p><router-link :to="collectionLink(row.id)">Read collection →</router-link></article></div></section></template>
<script>
import { listCollections } from './collectionApi.mjs';
import { collectionLink } from './collectionModel.mjs';
export default {
 props:{client:Object,showcaseId:String},data:()=>({rows:[],error:false}),
 watch:{showcaseId(){this.load();}},mounted(){this._alive=true;this.load();},beforeUnmount(){this._alive=false;this._request++;},
 methods:{collectionLink,async load(){const req=this._request=(this._request||0)+1;this.rows=[];this.error=false;if(!this.showcaseId)return;try{const result=await listCollections(this.client,{showcase:this.showcaseId});if(this._alive&&req===this._request)this.rows=result.entries;}catch{if(this._alive&&req===this._request)this.error=true;}}},
};
</script>
