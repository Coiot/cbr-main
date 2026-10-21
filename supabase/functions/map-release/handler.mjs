import { MAP_PUBLISHER_ID, MAX_RELEASE_BYTES, isReleaseId, validateRelease, auditRelease,
  createTimeline } from '../../../src/shared/mapRelease.mjs';
import {validateDetail,CITY_FIELDS} from '../../../src/shared/mapDetails.mjs';
import {upsertEpisodeMarker,validateEpisodeMarkers,releaseThroughEpisodes} from '../../../src/shared/mapEpisodeMarkers.mjs';
const BUCKET='map-release-drafts';
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const check=result=>{if(result.error)throw new Error(result.error.message);return result.data;};
export async function digest(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function createMapReleaseHandler(db,{detailsEnabled=true}={}) {
  const cache=new Map();
  async function read(id) {
    if(!isReleaseId(id))throw new Error('Invalid release identity.');
    if(cache.has(id))return cache.get(id);
    const blob=check(await db.storage.from(BUCKET).download(`${id}.json`));
    if(blob.size>MAX_RELEASE_BYTES)throw new Error('Release exceeds the size limit.');
    const release=validateRelease(JSON.parse(await blob.text()));
    if(await digest(release)!==id)throw new Error('Release integrity check failed.');
    const item={release,timeline:createTimeline(release)};
    cache.set(id,item);if(cache.size>3)cache.delete(cache.keys().next().value);
    return item;
  }
  async function active() {
    const control=check(await db.from('map_release_control').select('active_release,enabled').eq('map_id','s5').single());
    if(!control.enabled)return null;
    return check(await db.from('map_releases').select('id,history,first_turn,last_turn,bookmarks,published_at').eq('id',control.active_release).single());
  }
  async function gapAcceptance(id) {
    return check(await db.from('map_releases').select('event_gaps_accepted').eq('id',id).single())?.event_gaps_accepted===true;
  }
  async function storeRelease(release,acceptHistoricalGaps=false) {
    if(new TextEncoder().encode(JSON.stringify(release)).length>MAX_RELEASE_BYTES)throw new Error('Release too large.');
    const id=await digest(release);
    const exists=check(await db.from('map_releases').select('id').eq('id',id).maybeSingle());
    if(!exists){check(await db.storage.from(BUCKET).upload(`${id}.json`,new Blob([JSON.stringify(release)],{type:'application/json'}),{upsert:false,contentType:'application/json'}));
      check(await db.from('map_releases').insert({id,history:release.history,first_turn:release.firstTurn,last_turn:release.lastTurn,bookmarks:release.bookmarks,event_gaps_accepted:acceptHistoricalGaps}));}
    return id;
  }
  return async request=>{
    if(request.method==='OPTIONS')return new Response('',{headers});
    if(request.method!=='POST')return response({error:'Use POST.'},405);
    try {
      if(Number(request.headers.get('content-length'))>MAX_RELEASE_BYTES+65536)return response({error:'Request too large.'},413);
      // Bound streamed bodies too; Content-Length is not trusted.
      const reader=request.body?.getReader();let size=0;const chunks=[];
      if(!reader)throw new Error('Missing request.');
      for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>MAX_RELEASE_BYTES+65536){await reader.cancel();return response({error:'Request too large.'},413);}chunks.push(value);}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      const input=JSON.parse(new TextDecoder().decode(bytes)), action=input.action;
      const editorAction=['edit-detail','detail-access'].includes(action);
      if(!detailsEnabled&&['edit-detail','detail-access','details'].includes(action))return response({error:'The editor detail layer is not enabled.'},410);
      const protectedAction=editorAction||['stage','draft','publish','admin','timeline-admin','set-episode','history','hide','restore','contribute'].includes(action);
      let user=null;
      if(protectedAction) {
        const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
        const result=await db.auth.getUser(token);user=result.data?.user;
        if(result.error||!user)return response({error:'Sign in to continue.'},401);
        if(action!=='contribute'&&!editorAction&&user.id!==MAP_PUBLISHER_ID)return response({error:'Only Coiot can manage releases.'},403);
      }
      if(editorAction){const allowed=check(await db.rpc('can_edit_map_details',{p_actor:user.id}))===true;
        if(action==='detail-access')return response({allowed});
        if(!allowed)return response({error:'Map editor access is required.'},403);
      }
      if(action==='manifest')return response({active:await active()});
      if(action==='admin')return response({active:await active(),releases:check(await db.from('map_releases').select('*').order('created_at',{ascending:false}).limit(100))});
      if(action==='timeline-admin'||action==='set-episode') {
        const control=check(await db.from('map_release_control').select('source_release,active_release,enabled').eq('map_id','s5').single());
        const current=await active(),sourceId=control.source_release||current?.id;
        if(!sourceId)throw new Error('Stage a checked game history before adding episode endpoints.');
        if(action==='timeline-admin') {
          if(!current)return response({error:'No episode has been published.'},404);
          return response({active:current,sourceId,release:(await read(current.id)).release});
        }
        const {release:source}=await read(sourceId);
        if(input.sourceId!==sourceId||(input.expected||null)!==(current?.id||null))throw new Error('The timeline changed. Reload before publishing an endpoint.');
        const markers=upsertEpisodeMarker(current?.bookmarks||[],input.marker,{firstTurn:source.firstTurn,lastTurn:source.lastTurn});
        const acceptHistoricalGaps=await gapAcceptance(sourceId);
        const release=releaseThroughEpisodes(source,markers,{acceptHistoricalGaps}),id=await storeRelease(release,acceptHistoricalGaps);
        check(await db.rpc('publish_map_episode',{p_actor:user.id,p_source:sourceId,p_release:id,p_expected:current?.id||null}));
        return response({active:await active()});
      }
      if(action==='stage') {
        const release=validateRelease(input.release),audit=auditRelease(release),id=await digest(release);
        const acceptHistoricalGaps=input.acceptHistoricalGaps===true;
        if((!acceptHistoricalGaps&&(!audit.ok||input.validation?.ok!==true||input.validation?.issues?.length)) || input.validation?.releaseId!==id ||
          !Array.isArray(input.validation.issues))throw new Error('Resolve all local validation issues before staging, or explicitly accept recovered event gaps as Coiot.');
        const encoded=JSON.stringify(release);if(new TextEncoder().encode(encoded).length>MAX_RELEASE_BYTES)throw new Error('Release too large.');
        await storeRelease(release,acceptHistoricalGaps);
        check(await db.rpc('set_map_timeline_source',{p_actor:user.id,p_source:id}));
        return response({id});
      }
      if(action==='draft')return response({release:(await read(input.id)).release});
      if(action==='publish') {
        const {release}=await read(input.id);
        if(!auditRelease(release).ok&&!await gapAcceptance(input.id))throw new Error('Release failed validation.');
        if(validateEpisodeMarkers(release.bookmarks,{firstTurn:release.firstTurn,lastTurn:release.lastTurn}).at(-1).turn!==release.lastTurn)throw new Error('Publish an episode endpoint, not the full private source.');
        if(input.endTurn!==release.lastTurn || input.confirm!==true)throw new Error('Review and confirm the exact release end turn.');
        check(await db.rpc('publish_map_release',{p_actor:user.id,p_release:input.id,p_expected:input.expected||null}));
        return response({active:await active()});
      }
      const current=await active();
      if(!current)return response({error:'The official timeline is not published.'},404);
      const id=input.id||current.id;
      const row=check(await db.from('map_releases').select('*').eq('id',id).maybeSingle());
      if(!row?.published_at || row.history!==current.history || row.last_turn>current.last_turn)return response({error:'This release is not available.'},404);
      const {release,timeline}=await read(id);
      if(action==='release')return response({id,release});
      if(action==='search'&&input.turn===undefined)input.turn=current.last_turn;
      if(!Number.isInteger(input.turn)||input.turn<release.firstTurn||input.turn>Math.min(current.last_turn,release.lastTurn))throw new Error('This turn is not published.');
      if(action==='search') {
        if(input.history&&input.history!==release.history)throw new Error('Different game history.');
        const frame=timeline.frame(input.turn);
        return response({id:`timeline:${release.history}:${input.turn}`,episode_label:`Turn ${input.turn}`,
          payload:frame.cities.map(c=>({tile_key:`${c.index%release.map.width},${release.map.height-1-Math.floor(c.index/release.map.width)}`,payload:{owner:c.owner,city:{id:c.id,name:c.name,owner:c.owner}}}))});
      }
      if(action==='details') {
        const rows=[];
        for(let start=0;start<100000;start+=1000){const page=check(await db.from('map_tile_details').select('record,revision').eq('history',release.history)
          .lte('observed_turn',current.last_turn).order('detail_key').range(start,start+999));
          for(const row of page){validateDetail(row.record);rows.push(row);}if(page.length<1000)break;
        }
        return response({rows});
      }
      if(action==='edit-detail') {
        const latest=await read(current.id),record=input.record;
        validateDetail(record);
        if(!Number.isInteger(input.expectedRevision)||input.expectedRevision<0)throw new Error('Invalid edit revision.');
        const frame=latest.timeline.frame(input.turn);
        if(CITY_FIELDS.includes(record.field)) {
          const city=frame.cities.find(c=>c.index===record.tile);
          if(city?.id!==record.city||city.owner!==record.owner)throw new Error('This city or owner does not match the game history.');
        }
        if(record.field==='ideology'&&frame.owners[record.tile]!==record.owner)throw new Error('Select a tile belonging to this civilization.');
        if(record.field==='ruins'&&record.value&&frame.cities.some(c=>c.index===record.tile))throw new Error('A city currently occupies this tile.');
        check(await db.rpc('write_map_tile_detail',{p_actor:user.id,p_history:release.history,p_turn:input.turn,p_record:record,p_expected:input.expectedRevision}));
        return response({ok:true});
      }
      if(['contributions','contribute','history','hide','restore'].includes(action))return response({error:'Turn-specific contributions have been retired. Use the live map editor.'},410);
      return response({error:'Unknown operation.'},400);
    }catch(error){return response({error:error.message||'Map request failed.'},400);}
  };
}
