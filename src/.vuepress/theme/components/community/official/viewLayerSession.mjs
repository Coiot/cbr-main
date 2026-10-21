import {markRaw} from 'vue';
import {emptyViewLayer,validateViewLayer,putViewRecords,resetViewTile,mergeViewLayer,layerDraftKey,loadLayerDraft} from '../../../../../shared/mapViewLayers.mjs';
import {mapReleaseRequest} from './mapReleaseApi.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
export const viewLayerMethods={
  draftKey(){return layerDraftKey(this.release.history,this.user?.id,this.layerViewId);},
  restoreLayerDraft(saved=emptyViewLayer(this.release.history),revision=0){
    this.savedLayer=clone(saved);this.layerRevision=revision;
    const draft=loadLayerDraft(window.localStorage,this.draftKey(),{history:this.release.history,lastTurn:this.lastTurn});
    this.viewLayer=markRaw(draft?.layer||clone(saved));
    this.layerRevision=draft?.revision??revision;this.layerDirty=!!draft;
    this.layerNotice=draft&&draft.revision!==revision?'This saved view changed. Reset to the saved view or save your draft as a new view.':'';
    if(this.frame)this.updateSource();
  },
  persistLayerDraft(){
    try{window.localStorage.setItem(this.draftKey(),JSON.stringify({layer:this.viewLayer,revision:this.layerRevision,publicEndTurn:this.publicEndTurn}));this.layerNotice='Draft saved on this device. Save a view to share it.';}
    catch{this.layerNotice='This browser could not keep your draft. Save a view before closing the page.';}
  },
  changeLayer(records){
    this.pause(false);this.viewLayer=markRaw(putViewRecords(this.viewLayer,records,this.turn,this.lastTurn));this.layerDirty=true;this.persistLayerDraft();this.updateSource();
  },
  setPersonalNote(tile,text){this.changeLayer([{tile,city:null,owner:null,field:'notes',value:text.trim()||null,author:'View note',reference:''}]);},
  resetLayerTile(tile){this.pause(false);this.viewLayer=markRaw(resetViewTile(this.viewLayer,tile,this.turn));this.layerDirty=true;this.persistLayerDraft();this.updateSource();},
  resetLayerDraft(){this.viewLayer=markRaw(clone(this.savedLayer));this.layerDirty=false;window.localStorage.removeItem(this.draftKey());this.layerNotice='Reset to the saved view.';this.updateSource();},
  mergePersonalFrame(frame){
    const merged=mergeViewLayer(frame,this.viewLayer),details=new Map(merged.details.map(d=>[d.index,d]));
    for(const row of this.noteCounts){const count=Number(row.count);if(!count)continue;const tile=Number(row.tile),d=details.get(tile)||{index:tile,attribution:{}};d.notes=[d.notes,`${count} community ${count===1?'note':'notes'}`].filter(Boolean).join('\n\n');details.set(tile,d);}
    return {...merged,details:[...details.values()]};
  },
  async refreshNotes(){if(this.preview||!this.layersEnabled)return;try{const result=await mapReleaseRequest({action:'note-summary'},this.client);if(this._alive){this.noteCounts=result.rows;this.notesVersion++;if(this.frame)this.updateSource();}}catch(error){this.layerNotice=`Community notes could not be refreshed. ${error.message}`;}},
  async loadViewLayer(row,reset=false){
    const key=`${this.user?.id||'guest'}:${row.id}`;if(this._loadedLayer===key&&!reset)return;
    const request=this._layerRequest=(this._layerRequest||0)+1;
    const result=await mapReleaseRequest({action:'layer-read',viewId:row.id},this.client);
    if(!this._alive||request!==this._layerRequest)return;
    this._loadedLayer=key;this.layerViewId=row.id;
    if(reset)window.localStorage.removeItem(this.draftKey());
    this.restoreLayerDraft(result.layer,result.revision);if(result.message)this.layerNotice=result.message;
  },
  closeViewLayer(){this._layerRequest=(this._layerRequest||0)+1;this._loadedLayer='';this.layerViewId='';this.restoreLayerDraft();},
  async layerForForm(row){
    if(row&&row.id===this.layerViewId)return {layer:clone(this.viewLayer),revision:this.layerRevision};
    if(!row)return {layer:clone(this.viewLayer),revision:0};
    return mapReleaseRequest({action:'layer-read',viewId:row.id},this.client);
  },
  async saveViewLayer(draft,existing){
    const userId=this.user?.id;
    validateViewLayer(draft.layer,{history:this.release.history,lastTurn:this.lastTurn});
    const result=await mapReleaseRequest({action:'layer-save',viewId:existing?.id||null,expectedRevision:draft.layerRevision||0,draft:{title:draft.title,description:draft.description,visibility:draft.visibility,settings:draft.settings},layer:draft.layer},this.client);
    if(!this._alive||this.user?.id!==userId)return result.view;
    if(!existing||existing.id===this.layerViewId){
      window.localStorage.removeItem(this.draftKey());this.layerViewId=result.view.id;this._loadedLayer='';
      this.savedLayer=clone(draft.layer);this.viewLayer=markRaw(clone(draft.layer));this.layerRevision=(draft.layerRevision||0)+1;this.layerDirty=false;this.layerNotice='View saved.';
      window.localStorage.removeItem(this.draftKey());
      await this.$router.replace({path:'/community-tile-map/',query:{saved_view:result.view.id}});
    }
    return result.view;
  },
  async checkLayerAccess(){
    this.canEditDetails=false;this.notesModerator=false;if(!this.user||this.preview)return;
    const id=this.user.id;
    try{const result=await mapReleaseRequest({action:'layer-access'},this.client);if(this._alive&&this.user?.id===id){this.canEditDetails=result.allowed;this.notesModerator=result.moderator;}}catch{this.canEditDetails=false;}
  }
};
