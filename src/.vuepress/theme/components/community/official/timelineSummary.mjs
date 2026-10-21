import {frameSummary} from '../replay/replayModel.mjs';

export function timelineSummary(frame,release) {
  return frameSummary(frame,release.civilizations.map(c=>({...c,label:c.name})));
}

export const eventCategories=[
  ['all','All events'],['cities','Cities'],['diplomacy','Diplomacy'],
  ['religion','Religion and beliefs'],['completions','Completions'],
  ['milestones','Golden Ages'],
  ['other','Other messages']
];

export function cleanEventText(text) {
  return text.replace(/\[(?:COLOR_[A-Z_]+|ENDCOLOR)\]/g,'')
    .replace(/\[NEWLINE\]/g,'\n')
    .replace(/\[ICON_([A-Z_]+)\]/g,(_,token)=>{
      const label=({PEACE:'Faith',RESEARCH:'Science',GOLDEN_AGE:'Golden Age',STRENGTH:'Strength'})[token]
        ||token.toLowerCase().replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
      // Most messages already spell out the icon's name immediately after it.
      return `{${label}}`;
    })
    .replace(/\{([^}]+)\}\s*(\1s?)\b/gi,'$2')
    .replace(/\{([^}]+)\}/g,'$1').replace(/[ \t]+/g,' ').trim();
}

function eventCategory(event,text) {
  if(['found','capture','raze'].includes(event.kind))return 'cities';
  if(event.kind==='claim')return 'claims';
  if(event.kind==='wonder'||/\bcompletes\b/i.test(text))return 'completions';
  if(event.kind==='holyCity'||/\breligion|\bpantheon|\bbelief|\bprophet/i.test(text))return 'religion';
  if(/\bdeclares war|\bmade peace|\bpeace treaty|\bresearch agreement|\bdeclaration of friendship|\bdefensive pact/i.test(text))return 'diplomacy';
  if(/\bcaptured by|\brazed|\bliberat(?:ed|ion)|\b(?:lost|regained) their original capital/i.test(text))return 'cities';
  if(/^Session \d+ starts\b/i.test(text))return 'sessions';
  if(/\bgolden age\b/i.test(text))return 'milestones';
  return 'other';
}

// Resolve city names once in event order, before later captures or refounding.
export function timelineEventHistory(release) {
  const cities=new Map(),entries=[];
  const names=new Map(release.civilizations.map(c=>[c.ownerId,c.name]));
  const ownerName=id=>names.get(id)||'Unclaimed';
  for(const [order,event] of release.events.entries()) {
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
    let text=event.text?cleanEventText(event.text):event.kind==='claim'?`${ownerName(event.owner)}: ${event.tiles.length} ${event.tiles.length===1?'tile claim':'tile claims'}`:descriptions.join('; ');
    if(event.kind==='message' && /^A Golden Age has begun for our Civilization!$/i.test(text)) {
      const civilization=names.get(event.owner);
      if(!civilization)continue;
      text=`${civilization} has started a Golden Age.`;
    }
    entries.push({order,turn:event.turn,text,category:eventCategory(event,text),kind:event.kind});
  }
  return entries.reverse();
}

export function filterTimelineEvents(entries,turn,filter='all',query='') {
  const terms=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter(event=>event.turn<=turn && !['claims','sessions'].includes(event.category) &&
    (filter==='all'||event.category===filter||(filter==='details'&&['wonder','holyCity'].includes(event.kind))) &&
    terms.every(term=>`turn ${event.turn} ${event.text}`.toLocaleLowerCase().includes(term)));
}

export function timelineEvents(release,turn,filter='all') {
  return filterTimelineEvents(timelineEventHistory(release),turn,filter).slice(0,100);
}
