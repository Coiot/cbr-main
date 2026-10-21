// Showrunner-only CLI. Credentials and the unbounded history never reach the site.
import {readFileSync} from 'node:fs';
import {parseArgs} from 'node:util';
import {randomUUID} from 'node:crypto';
import dotenv from 'dotenv';
import {createClient} from '@supabase/supabase-js';
import {getEdition} from '../../src/.vuepress/data/editions.js';
import {prepareRelease} from './prepare.mjs';
import {MAP_PUBLISHER_ID} from '../../src/shared/mapRelease.mjs';
import {releaseThroughEpisodes} from '../../src/shared/mapEpisodeMarkers.mjs';
import {digest} from '../../supabase/functions/map-release/handler.mjs';
import config from '../../src/shared/publicConfig.json' with {type:'json'};

try {
  const {values}=parseArgs({options:{file:{type:'string'},episode:{type:'string'},'end-turn':{type:'string'},'accept-event-gaps':{type:'boolean'},apply:{type:'boolean'}}});
  const endTurn=Number(values['end-turn']);
  if(!values.file||!values.episode||!values['end-turn']||!Number.isInteger(endTurn)||endTurn<0)throw new Error('Use --file recovered-history.json --episode NUMBER --end-turn NUMBER [--accept-event-gaps] [--apply].');
  const env={...dotenv.parse(readFileSync(new URL('../../.env.supporters',import.meta.url))),...process.env};
  if(env.SUPABASE_URL!==config.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Configure the matching private Supabase service credentials in .env.supporters.');
  const db=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const check=result=>{if(result.error)throw new Error(result.error.message);return result.data;};
  const control=check(await db.from('map_release_control').select('active_release,source_release').eq('map_id','s5').single());
  const existingId=control.active_release||control.source_release;
  const previous=existingId?check(await db.from('map_releases').select('history,bookmarks').eq('id',existingId).single()):null;
  const input=JSON.parse(readFileSync(values.file,'utf8'));
  const base=JSON.parse(readFileSync(new URL('../../src/.vuepress/public/community/CBRXMapOct62025_V2.base.json',import.meta.url)));
  const markers=[...(previous?.bookmarks||[]).filter(m=>m.episode!==values.episode),{episode:values.episode,turn:endTurn}];
  const {release:source,report}=prepareRelease(input,base,[...getEdition('s5').competitors,{name:'Babylon'}],{
    history:previous?.history||randomUUID(),sourceSha256:input.source.sha256,endTurn:input.source.turn,bookmarks:markers,branchVerified:false,completions:{},checkpoints:[]
  });
  const acceptHistoricalGaps=values['accept-event-gaps']===true;
  if(!report.ok&&!acceptHistoricalGaps)throw new Error('Recovered history has review gaps. Inspect it before explicitly using --accept-event-gaps.');
  const bounded=releaseThroughEpisodes(source,markers,{acceptHistoricalGaps});
  if(bounded.lastTurn!==endTurn)throw new Error('The supplied episode is not the latest endpoint. No publication was changed.');
  console.log(JSON.stringify({apply:!!values.apply,sourceTurn:source.lastTurn,publicTurns:[bounded.firstTurn,bounded.lastTurn],reviewIssues:report.issues.length,eventGapsAccepted:acceptHistoricalGaps}));
  if(values.apply){
    const store=async release=>{
      const id=await digest(release);
      const exists=check(await db.from('map_releases').select('id').eq('id',id).maybeSingle());
      if(!exists){
        check(await db.storage.from('map-release-drafts').upload(`${id}.json`,new Blob([JSON.stringify(release)],{type:'application/json'}),{contentType:'application/json',upsert:false}));
        check(await db.from('map_releases').insert({id,history:release.history,first_turn:release.firstTurn,last_turn:release.lastTurn,bookmarks:release.bookmarks,event_gaps_accepted:acceptHistoricalGaps}));
      }
      return id;
    };
    const sourceId=await store(source),id=await store(bounded);
    check(await db.rpc('set_map_timeline_source',{p_actor:MAP_PUBLISHER_ID,p_source:sourceId}));
    check(await db.rpc('publish_map_episode',{p_actor:MAP_PUBLISHER_ID,p_source:sourceId,p_release:id,p_expected:control.active_release}));
    console.log(JSON.stringify({published:id,privateSource:sourceId,publicEndTurn:bounded.lastTurn}));
  }
}catch(error){console.error(error.message);process.exitCode=1;}
