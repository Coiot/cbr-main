import {validateDetail,detailKey,mergeDetails,CITY_FIELDS} from './mapDetails.mjs';
import {isHistoryId} from './mapRelease.mjs';

export const VIEW_LAYER_FORMAT='cbr-map-view-layer';
export const MAX_LAYER_BYTES=1024*1024;
export const MAX_LAYER_RECORDS=5000;
export const VIEW_EDIT_FIELDS=['wonders','capital','puppeted','occupied','resistance','ideology','improvement','route','units','pillaged','ruins'];
const fail=message=>{throw new Error(message);};
export const emptyViewLayer=history=>({format:VIEW_LAYER_FORMAT,version:1,history,edits:[],notes:[]});
export const layerEditKey=record=>`${record.turn}:${detailKey(record)}`;
export function validateViewLayer(layer,{history,lastTurn=645,tileCount=16920}={}) {
  if(!layer||Object.keys(layer).some(k=>!['format','version','history','edits','notes'].includes(k))||layer.format!==VIEW_LAYER_FORMAT||layer.version!==1||!isHistoryId(layer.history)||history&&layer.history!==history||!Array.isArray(layer.edits)||!Array.isArray(layer.notes))fail('This edit layer belongs to a different game history.');
  if(layer.edits.length+layer.notes.length>MAX_LAYER_RECORDS||new TextEncoder().encode(JSON.stringify(layer)).length>MAX_LAYER_BYTES)fail('Keep a view under 5,000 edits and 1 MiB.');
  const keys=new Set();
  for(const entry of layer.edits){const {turn,...record}=entry;
    if(!Number.isInteger(turn)||turn<0||turn>lastTurn||!VIEW_EDIT_FIELDS.includes(record.field))fail('This edit is outside the published timeline or uses an unavailable field.');
    validateDetail(record,{tileCount});const key=layerEditKey(entry);if(keys.has(key))fail('Duplicate tile edit.');keys.add(key);
  }
  const tiles=new Set();
  for(const note of layer.notes){if(!note||Object.keys(note).some(k=>!['tile','text'].includes(k))||!Number.isInteger(note.tile)||note.tile<0||note.tile>=tileCount||typeof note.text!=='string'||!note.text.trim()||note.text.length>2000||tiles.has(note.tile))fail('Keep each personal tile note under 2,000 characters.');tiles.add(note.tile);}
  return layer;
}
export function validateLayerFrames(layer,timeline){
  const frames=new Map();
  for(const record of layer.edits){if(!frames.has(record.turn))frames.set(record.turn,timeline.frame(record.turn));const frame=frames.get(record.turn),city=frame.cities.find(c=>c.index===record.tile);
    if(CITY_FIELDS.includes(record.field)&&(city?.id!==record.city||city.owner!==record.owner))fail('A city edit does not match its recorded lifetime and owner.');
    if(record.field==='ideology'&&frame.owners[record.tile]!==record.owner)fail('Ideology must belong to the civilization on the selected tile.');
    if(record.field==='ruins'&&record.value&&city)fail('A recorded city cannot be replaced by ruins.');
  }
}
export function putViewRecords(layer,records,turn,lastTurn){
  let next={...layer,edits:[...layer.edits],notes:[...layer.notes]};
  for(const record of records){
    if(record.field==='notes'){next.notes=next.notes.filter(n=>n.tile!==record.tile);if(record.value?.trim())next.notes.push({tile:record.tile,text:record.value.trim()});}
    else{const entry={...record,turn};next.edits=next.edits.filter(r=>layerEditKey(r)!==layerEditKey(entry));next.edits.push(entry);}
  }
  return validateViewLayer(next,{history:layer.history,lastTurn});
}
export function mergeViewLayer(frame,layer){
  const records=layer.edits.filter(e=>e.turn===frame.turn).map(({turn,...record})=>record);
  for(const note of layer.notes)records.push({tile:note.tile,city:null,owner:null,field:'notes',value:note.text,author:'View note',reference:''});
  return mergeDetails(frame,records);
}
export function resetViewTile(layer,tile,turn){return {...layer,edits:layer.edits.filter(e=>e.tile!==tile||e.turn!==turn)};}
export function layerDraftKey(history,userId,viewId){return `cbr.mapViewDraft.v1:${history}:${userId||'guest'}:${viewId||'new'}`;}
export function loadLayerDraft(storage,key,limits){try{const draft=JSON.parse(storage?.getItem(key)||'null');if(draft){if(draft.publicEndTurn!==undefined&&(!Number.isInteger(draft.publicEndTurn)||draft.publicEndTurn>limits.lastTurn))return null;validateViewLayer(draft.layer,limits);if(Number.isInteger(draft.revision)&&draft.revision>=0)return draft;}}catch{}return null;}
