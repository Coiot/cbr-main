import {frameSummary} from '../replay/replayModel.mjs';

export function timelineSummary(frame,release) {
  return frameSummary(frame,release.civilizations.map(c=>({...c,label:c.name})));
}

// Resolve city names in event order, before later captures or refounding.
export function timelineEvents(release,turn,filter='all') {
  const cities=new Map(),entries=[];
  const names=new Map(release.civilizations.map(c=>[c.ownerId,c.name]));
  const ownerName=id=>names.get(id)||'Unclaimed';
  for(const [order,event] of release.events.entries()) {
    if(event.turn>turn)break;
    const descriptions=[];
    for(const index of event.tiles) {
      const city=cities.get(index),name=city?.name||`City at tile ${index%release.map.width},${release.map.height-1-Math.floor(index/release.map.width)}`;
      if(event.kind==='found') {
        cities.set(index,{name:event.name,owner:event.owner});
        descriptions.push(`${event.name} founded by ${ownerName(event.owner)}`);
      }else if(event.kind==='capture') {
        descriptions.push(city&&city.owner!==event.owner?`${name}: ${ownerName(city.owner)} → ${ownerName(event.owner)}`:`${name}: ownership recorded for ${ownerName(event.owner)}`);
        if(city)city.owner=event.owner;
      }else if(event.kind==='raze') {
        descriptions.push(`${name}: razed`);cities.delete(index);
      }else if(event.kind==='wonder')descriptions.push(`${name}: ${event.name} completed`);
      else if(event.kind==='holyCity')descriptions.push(`${name}: holy city of ${event.name}`);
    }
    const category=['found','capture','raze'].includes(event.kind)?'cities':event.kind==='claim'?'claims':'details';
    if(filter!=='all'&&filter!==category)continue;
    const text=event.kind==='claim'?`${ownerName(event.owner)}: ${event.tiles.length} ${event.tiles.length===1?'tile claim':'tile claims'}`:descriptions.join('; ');
    entries.push({order,turn:event.turn,text});
  }
  return entries.slice(-100).reverse();
}
