import {emptyViewLayer,validateViewLayer,validateLayerFrames} from '../../../src/shared/mapViewLayers.mjs';
import {normalizeMapViewSettings} from '../../../src/.vuepress/theme/components/community/map/savedViewSettings.mjs';
const actions=['layer-access','layer-read','layer-save','note-summary','tile-notes','note-write','note-hide'];
export const isLayerAction=action=>actions.includes(action);
export const layerWriteAction=action=>['layer-access','layer-save','note-write','note-hide'].includes(action);
const uuid=value=>typeof value==='string'&&/^[0-9a-f-]{36}$/i.test(value);
export function createLayerHandler({db,active,read,check,response}){
  return async(input,user)=>{
    const current=await active();if(!current)return response({error:'The map is not published.'},404);
    const {release,timeline}=await read(current.id);
    const access=async()=>check(await db.rpc('can_manage_map_layers',{p_actor:user?.id||null}))===true;
    if(input.action==='layer-access')return response({allowed:await access(),moderator:check(await db.rpc('is_map_layer_moderator',{p_actor:user.id}))===true});
    if(input.action==='layer-read'){
      if(!uuid(input.viewId))throw new Error('Invalid view identity.');
      const view=check(await db.from('map_saved_views').select('*').eq('id',input.viewId).maybeSingle());
      if(!view||view.map_id!=='s5'||view.is_hidden||view.visibility!=='public'&&view.user_id!==user?.id)return response({error:'This view is unavailable.'},404);
      const row=check(await db.from('map_view_layers').select('*').eq('view_id',view.id).maybeSingle());
      const withheld=row&&(row.history!==current.history||row.public_end_turn>current.last_turn);
      const layer=!row||withheld?emptyViewLayer(current.history):validateViewLayer(row.layer,{history:current.history,lastTurn:current.last_turn});
      return response({layer,revision:row?.revision||0,withheld:!!withheld,message:withheld?'This view’s edits are hidden because they were saved beyond the current public endpoint.':''});
    }
    if(input.action==='layer-save'){
      if(!await access())return response({error:'Current supporter or map administrator access is required to save a view.'},403);
      const settings=normalizeMapViewSettings(input.draft?.settings),title=String(input.draft?.title||'').trim(),description=String(input.draft?.description||'').trim(),visibility=input.draft?.visibility;
      if(!settings||!title||title.length>80||description.length>300||!['public','private'].includes(visibility)||['population','religion'].includes(settings.overlay))throw new Error('Check the view title, visibility and display settings.');
      if(!settings.snapshot)settings.snapshot=`timeline:${current.history}:${current.last_turn}`;
      const source=/^timeline:([0-9a-f-]{36}):(\d+)$/.exec(settings.snapshot);
      if(!source||source[1]!==current.history||Number(source[2])>current.last_turn)throw new Error('Choose a published timeline turn.');
      if(settings.compare){const match=/^timeline:([0-9a-f-]{36}):(\d+)$/.exec(settings.compare);if(!match||match[1]!==current.history||Number(match[2])>current.last_turn)throw new Error('The comparison turn has not been published.');}
      if(input.viewId!==null&&!uuid(input.viewId)||!Number.isInteger(input.expectedRevision)||input.expectedRevision<0)throw new Error('Invalid view revision.');
      validateViewLayer(input.layer,{history:current.history,lastTurn:current.last_turn});validateLayerFrames(input.layer,timeline);
      const profile=check(await db.from('profiles').select('username').eq('id',user.id).maybeSingle());
      const layer={...input.layer,edits:input.layer.edits.map(record=>({...record,author:profile?.username?.trim().slice(0,100)||'CBR reader'}))};
      const rows=check(await db.rpc('save_map_view_layer',{p_actor:user.id,p_id:input.viewId,p_expected:input.expectedRevision,p_title:title,p_description:description,p_visibility:visibility,p_settings:settings,p_layer:layer,p_history:current.history,p_cap:current.last_turn}));
      return response({view:Array.isArray(rows)?rows[0]:rows});
    }
    if(input.action==='note-summary'){
      const rows=check(await db.rpc('map_note_counts',{p_history:current.history}));return response({rows:rows||[]});
    }
    if(!Number.isInteger(input.tile)||input.tile<0||input.tile>=release.map.width*release.map.height)throw new Error('Invalid tile coordinate.');
    if(input.action==='tile-notes'){
      const offset=input.offset??0;if(!Number.isInteger(offset)||offset<0||offset>100000)throw new Error('Invalid note page.');
      const rows=check(await db.rpc('read_map_tile_notes',{p_history:current.history,p_tile:input.tile,p_actor:user?.id||null,p_offset:offset}));return response({rows:rows||[]});
    }
    if(input.action==='note-write'){
      if(typeof input.text!=='string'||input.text.length>2000||!Number.isInteger(input.expectedRevision)||input.expectedRevision<0)throw new Error('Keep your note under 2,000 characters.');
      check(await db.rpc('write_map_tile_note',{p_actor:user.id,p_history:current.history,p_tile:input.tile,p_text:input.text.trim(),p_expected:input.expectedRevision,p_cap:current.last_turn}));return response({ok:true});
    }
    if(input.action==='note-hide'){
      if(!uuid(input.author)||!Number.isInteger(input.expectedRevision)||input.expectedRevision<0||typeof input.hidden!=='boolean')throw new Error('Invalid note moderation request.');
      check(await db.rpc('moderate_map_tile_note',{p_actor:user.id,p_history:current.history,p_tile:input.tile,p_author:input.author,p_hidden:input.hidden,p_expected:input.expectedRevision}));return response({ok:true});
    }
  };
}
