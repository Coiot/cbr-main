import { readReplayExtraction } from '../../src/.vuepress/theme/components/community/replay/replayExtraction.mjs';
import { baseIdentity, mapCivilizations } from '../../src/.vuepress/theme/components/community/replay/replayModel.mjs';
import { MAP_RELEASE_FORMAT, auditRelease, createTimeline } from '../../src/shared/mapRelease.mjs';
import {prepareStatistics} from './statistics.mjs';
import {observedEvents} from './observedEvents.mjs';

export function prepareRelease(extraction, base, owners, config, statistics=null) {
  if(config.details||config.detailsFile||config.detailSource)throw new Error('Map releases contain game history only. Maintain editor details in the shared live layer.');
  const replay=readReplayExtraction(extraction,base,owners);
  if(!Number.isInteger(config.endTurn)||config.endTurn<0||config.endTurn>replay.meta.endTurn)throw new Error('Set an explicit safe endTurn within the save.');
  if(config.sourceSha256!==extraction.source.sha256)throw new Error('Review configuration belongs to a different save.');
  const mapping=mapCivilizations(replay.civs,owners);
  const map=baseIdentity(base);delete map.name;
  const release={format:MAP_RELEASE_FORMAT,version:1,history:config.history,map,firstTurn:0,lastTurn:config.endTurn,
    civilizations:mapping.map(({name,ownerId})=>({name,ownerId})),
    bookmarks:config.bookmarks?.filter(b=>b.turn<=config.endTurn).map(({episode,turn})=>({episode:String(episode),turn})),
    events:[],catalog:{wonders:[],religions:[]},availability:'historical-events-with-gaps'};
  const living=new Map(), unclassified=[];
  for(const e of replay.events) {
    if(e.turn>config.endTurn)break;
    const tiles=e.tiles.filter(([x,y])=>x>=0&&y>=0).map(([x,y])=>y*base.width+x);
    const owner=e.civ<0?-1:mapping[e.civ].ownerId;
    const kind={1:'found',2:'claim',3:'capture',4:'raze'}[e.type];
    if(kind) {
      if(!tiles.length)continue;
      if(kind==='found') {
        if(tiles.length!==1)throw new Error('Founding event has multiple locations.');
        const city=e.order+1;
        living.set(tiles[0],city);
        release.events.push({turn:e.turn,kind,owner,tiles,city,name:e.text.replace(/ is founded\.$/,'').trim()});
      } else {
        release.events.push({turn:e.turn,kind,owner,tiles});
        if(kind==='raze')tiles.forEach(i=>living.delete(i));
      }
    } else {
      const completion=/ completes (.+)!$/.exec(e.text);
      const religion=/ (?:has|have) founded the new religion (.+) in the holy city of .+\.$/.exec(e.text);
      const category=completion&&config.completions?.[completion[1]];
      if(completion&&!['wonder','project','other'].includes(category))unclassified.push(completion[1]);
      if((category==='wonder'||religion)&&tiles.length===1) {
        const city=living.get(tiles[0]);
        if(!city)throw new Error(`Unmatched construction/religion at turn ${e.turn}.`);
        const name=religion?religion[1]:completion[1], kind=religion?'holyCity':'wonder';
        release.events.push({turn:e.turn,kind,owner,tiles,city,name,text:e.text});
        const list=religion?release.catalog.religions:release.catalog.wonders;
        if(!list.includes(name))list.push(name);
      } else if(e.text.trim())release.events.push({turn:e.turn,kind:'message',owner,tiles,text:e.text});
    }
  }
  if(statistics){
    release.statistics=prepareStatistics(statistics,extraction,release);
    release.events.push(...observedEvents(statistics,release));
    release.events.sort((a,b)=>a.turn-b.turn);
  }
  const report=auditRelease(release), timeline=createTimeline(release);
  const checkpoints=config.checkpoints||[];
  if(!config.branchVerified)report.issues.push('Confirm the game branch against episode evidence.');
  if(!checkpoints.some(c=>c.turn===config.endTurn))report.issues.push('An independently verified city-count checkpoint is required at the release boundary.');
  for(const checkpoint of checkpoints) {
    if(checkpoint.turn>config.endTurn)continue;
    const frame=timeline.frame(checkpoint.turn), actual={};
    mapping.forEach(c=>actual[c.ownerId]=0);
    frame.cities.forEach(c=>actual[c.owner]++);
    if(!checkpoint.evidence || mapping.some(c=>checkpoint.cityCounts?.[c.ownerId]!==actual[c.ownerId]))
      report.issues.push(`City-count evidence is missing or differs at turn ${checkpoint.turn}.`);
  }
  if(unclassified.length)report.issues.push(`Classify completion messages: ${[...new Set(unclassified)].join(', ')}`);
  report.ok=!report.issues.length;
  return {release,report};
}
