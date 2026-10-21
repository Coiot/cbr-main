import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyViewLayer,validateViewLayer,putViewRecords,mergeViewLayer,resetViewTile,layerDraftKey,loadLayerDraft,validateLayerFrames} from '../../src/shared/mapViewLayers.mjs';
import {createLayerHandler} from '../../supabase/functions/map-release/layers.mjs';
import {mapSavedViewsMethods} from '../../src/.vuepress/theme/components/community/map/mapSavedViews.js';
const history='00000000-0000-4000-8000-000000000001';
const record=(field,value,tile=10)=>({tile,city:null,owner:null,field,value,author:'Local editor',reference:''});
const frame=turn=>({turn,owners:new Int16Array(16920).fill(-1),cities:[],ruins:[]});
test('an anonymous new draft opens the save-access gate rather than managing a nonexistent view',()=>{
  let creates=0,manages=0;
  mapSavedViewsMethods.savePersonalMapView.call({activeSavedView:null,authUser:null,$refs:{savedViews:{create(){creates++;},manage(){manages++;},present(){}}}});
  assert.equal(creates,1);assert.equal(manages,0);
});
test('personal edits apply only at their exact turn while tile notes survive every turn',()=>{
  const layer=putViewRecords(emptyViewLayer(history),[record('improvement','Citadel'),record('notes','A lasting note')],600,645);
  assert.equal(mergeViewLayer(frame(600),layer).details[0].improvement,'Citadel');
  assert.equal(mergeViewLayer(frame(599),layer).details[0].improvement,undefined);
  for(const turn of [0,600,645])assert.equal(mergeViewLayer(frame(turn),layer).details[0].notes,'A lasting note');
  const reset=resetViewTile(layer,10,600);assert.equal(reset.edits.length,0);assert.equal(reset.notes.length,1);
  assert.equal(layer.edits.length,1,'Reset must not mutate the saved version');
});
test('view layers reject hidden fields, unreleased turns, invalid tiles, duplicates and oversized content',()=>{
  for(const field of ['population','religion','owner','terrain','city'])assert.throws(()=>putViewRecords(emptyViewLayer(history),[record(field,1)],600,645));
  assert.throws(()=>putViewRecords(emptyViewLayer(history),[record('improvement','X')],646,645));
  assert.throws(()=>putViewRecords(emptyViewLayer(history),[record('improvement','X',16920)],600,645));
  assert.throws(()=>putViewRecords(emptyViewLayer(history),[record('notes','X'.repeat(2001))],600,645));
  const layer=putViewRecords(emptyViewLayer(history),[record('ruins',true)],600,645);layer.edits.push({...layer.edits[0]});assert.throws(()=>validateViewLayer(layer,{history,lastTurn:645}),/Duplicate/);
});
test('city edits require their historical lifetime and cannot replace a living city with ruins',()=>{
  const live=frame(600);live.owners[10]=1;live.cities=[{id:1,index:10,owner:1,name:'Recorded city',worldWonders:[]}];
  const valid={...record('puppeted',true),city:1,owner:1};
  const layer=putViewRecords(emptyViewLayer(history),[valid],600,645);validateLayerFrames(layer,{frame:()=>live});
  layer.edits[0].city=2;assert.throws(()=>validateLayerFrames(layer,{frame:()=>live}),/lifetime/);
  assert.throws(()=>validateLayerFrames(putViewRecords(emptyViewLayer(history),[record('ruins',true)],600,645),{frame:()=>live}),/city/);
});
test('local drafts are isolated by account and view and fail closed after a rollback',()=>{
  const layer=putViewRecords(emptyViewLayer(history),[record('ruins',true)],645,645),data=new Map(),storage={getItem:key=>data.get(key)};
  const key=layerDraftKey(history,'one','view');data.set(key,JSON.stringify({layer,revision:3}));
  assert.equal(loadLayerDraft(storage,key,{history,lastTurn:645}).revision,3);
  assert.equal(loadLayerDraft(storage,layerDraftKey(history,'two','view'),{history,lastTurn:645}),null);
  assert.equal(loadLayerDraft(storage,layerDraftKey(history,'one','other'),{history,lastTurn:645}),null);
  assert.equal(loadLayerDraft(storage,key,{history,lastTurn:595}),null);
  data.set(key,JSON.stringify({layer:putViewRecords(emptyViewLayer(history),[record('notes','Later public context')],0,645),revision:0,publicEndTurn:645}));
  assert.equal(loadLayerDraft(storage,key,{history,lastTurn:595}),null,'A note-only draft must also respect rollback');
});
function api(){
  const viewId='00000000-0000-4000-8000-000000000010';
  const state={view:{id:viewId,map_id:'s5',user_id:'owner',visibility:'private',is_hidden:false},layer:{history,revision:1,public_end_turn:645,layer:emptyViewLayer(history)},cap:645,calls:[]};
  const db={from(table){let filters=[];const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},async maybeSingle(){const row=table==='map_saved_views'?state.view:table==='map_view_layers'?state.layer:null;return {data:row&&filters.every(([k,v])=>k==='view_id'?v===viewId:row[k]===v)?row:null,error:null};}};return q;},rpc:async(name,args)=>{state.calls.push({name,args});return {data:name==='can_manage_map_layers'?args.p_actor==='owner':[],error:null};}};
  const handler=createLayerHandler({db,active:async()=>({id:'public',history,last_turn:state.cap}),read:async()=>({release:{map:{width:180,height:94}},timeline:{frame}}),check:r=>{if(r.error)throw Error(r.error.message);return r.data;},response:(body,status=200)=>({status,body})});
  return {state,viewId,handler};
}
test('layer reads respect private views, moderation, public visibility and rollback withholding',async()=>{
  const {state,viewId,handler}=api();
  assert.equal((await handler({action:'layer-read',viewId},null)).status,404);
  assert.equal((await handler({action:'layer-read',viewId},{id:'owner'})).body.revision,1);
  state.view.visibility='public';assert.equal((await handler({action:'layer-read',viewId},null)).status,200);
  state.cap=595;const result=await handler({action:'layer-read',viewId},null);assert.equal(result.body.withheld,true);assert.deepEqual(result.body.layer.edits,[]);
  state.view.is_hidden=true;assert.equal((await handler({action:'layer-read',viewId},{id:'owner'})).status,404);
});
test('layer saves reject unavailable access and future anchors before any write',async()=>{
  const {state,handler}=api(),input={action:'layer-save',viewId:null,expectedRevision:0,layer:emptyViewLayer(history),draft:{title:'View',description:'',visibility:'public',settings:{version:1,x:0,y:0,zoom:1,overlay:'none',owner:'',contrast:'00000',tile:'',snapshot:`timeline:${history}:751`,compare:''}}};
  assert.equal((await handler(input,{id:'guest'})).status,403);
  await assert.rejects(handler(input,{id:'owner'}),/published/);
  assert.ok(!state.calls.some(c=>c.name==='save_map_view_layer'));
  input.draft.settings.snapshot='';const saved=await handler(input,{id:'owner'});assert.equal(saved.status,200);
  assert.equal(state.calls.find(c=>c.name==='save_map_view_layer').args.p_settings.snapshot,`timeline:${history}:645`,'Legacy live framing must acquire a valid current timeline anchor when saved with a layer');
});
