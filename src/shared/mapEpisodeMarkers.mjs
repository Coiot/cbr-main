import {validateRelease,auditRelease} from './mapRelease.mjs';
import {statisticsThroughTurn} from './mapStatistics.mjs';
const validEpisode=value=>typeof value==='string'&&/^(0|[1-9]\d{0,3})(\.\d{1,2})?$/.test(value)&&Number(value)<=1000;
export function validateEpisodeMarkers(markers,{firstTurn=0,lastTurn=100000}={}) {
  if(!Array.isArray(markers)||!markers.length||markers.length>1000)throw new Error('Add at least one episode endpoint.');
  const episodes=new Set();
  const rows=markers.map(m=>{
    if(!m||Object.keys(m).some(k=>!['episode','turn'].includes(k))||!validEpisode(m.episode)||!Number.isInteger(m.turn)||m.turn<firstTurn||m.turn>lastTurn)throw new Error('Choose an episode number and an end turn within the available history.');
    const episode=String(Number(m.episode));if(episodes.has(episode))throw new Error('Each episode can only have one endpoint.');episodes.add(episode);
    return {episode,turn:m.turn};
  }).sort((a,b)=>Number(a.episode)-Number(b.episode));
  if(rows.some((m,i)=>i>0&&m.turn<rows[i-1].turn))throw new Error('Episode end turns must follow episode order.');
  return rows;
}
export function upsertEpisodeMarker(markers,marker,limits={}) {
  const next=validateEpisodeMarkers([marker],limits)[0];
  return validateEpisodeMarkers([...markers.filter(m=>String(Number(m.episode))!==next.episode),next]);
}
export function releaseThroughEpisodes(source,markers,{acceptHistoricalGaps=false}={}) {
  validateRelease(source);
  const bookmarks=validateEpisodeMarkers(markers,{firstTurn:source.firstTurn,lastTurn:source.lastTurn});
  const lastTurn=bookmarks.at(-1).turn;
  const events=source.events.filter(e=>e.turn<=lastTurn).map(e=>({...e,tiles:[...e.tiles]}));
  const release={...source,lastTurn,bookmarks,events,catalog:{
    wonders:[...new Set(events.filter(e=>e.kind==='wonder').map(e=>e.name))],
    religions:[...new Set(events.filter(e=>e.kind==='holyCity').map(e=>e.name))]
  }};
  if(source.statistics)release.statistics=statisticsThroughTurn(source.statistics,source,lastTurn);
  validateRelease(release);
  const audit=auditRelease(release);if(!audit.ok&&!acceptHistoricalGaps)throw new Error(`Publication blocked: ${audit.issues[0]}`);
  return release;
}
