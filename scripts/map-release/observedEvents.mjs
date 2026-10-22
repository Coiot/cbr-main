import {formatStatistic} from '../../src/shared/mapStatistics.mjs';

// This is the verified Season 5 game branch. A new save requires an explicit
// branch review before its statistics can generate events for this map.
export const SEASON5_EVENT_SOURCE='1a4660efcf90eba12c9ef660ca62fa4f0d66ebc5b16969055a6655fec3099185';

// Called only after prepareStatistics validates source, roster and series.
// Plain message events keep older clients compatible and use the same release
// clipping and selected-turn filtering as the original game messages.
export function observedEvents(input,release) {
  if(release.map.id!=='s5'||input.sourceSha256!==SEASON5_EVENT_SOURCE)return [];
  const events=[],owners=new Map(release.civilizations.map(c=>[c.name,c.ownerId]));
  for(const player of input.players) {
    const {name,values,alive}=player,owner=owners.get(name);
    const emit=(turn,text)=>events.push({turn,kind:'message',owner,tiles:[],text:`Observed: ${name} ${text}`});
    const peaks={cities:0,population:0};
    for(let turn=0;turn<=release.lastTurn;turn++) {
      const previous=turn-1;
      if(turn>1&&alive?.[previous]===1&&alive[turn]===0)emit(turn,'is recorded as eliminated.');
      if(turn>0&&alive?.[previous]===1&&alive[turn]===1&&values.goldenAgeTurns?.[previous]>0&&values.goldenAgeTurns[turn]===0)
        emit(turn,'has ended a Golden Age.');
      const research=values.research?.[turn],before=values.research?.[previous];
      if(turn>0&&before!=null&&typeof research==='string'&&research!==before)
        emit(turn,`is researching ${formatStatistic(research,'research')}.`);
      for(const [key,step,label] of [['cities',10,'cities'],['population',100,'total city population']]) {
        const current=values[key]?.[turn],prior=values[key]?.[previous];
        if(!Number.isFinite(current))continue;
        const milestone=Math.floor(current/step)*step;
        if(turn>0&&Number.isFinite(prior)&&milestone>=step&&milestone>peaks[key]&&prior<milestone)
          emit(turn,`has reached ${milestone.toLocaleString('en')} ${label}.`);
        // Remember observed peaks even across gaps, but never date a crossing
        // from samples on opposite sides of a missing turn.
        peaks[key]=Math.max(peaks[key],current);
      }
    }
  }
  return events.sort((a,b)=>a.turn-b.turn);
}
