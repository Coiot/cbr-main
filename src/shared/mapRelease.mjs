// Shared by the offline exporter, browser worker and release API.
// This format contains only approved history, never raw save metadata.
import {validateStatistics} from './mapStatistics.mjs';
export const MAP_RELEASE_FORMAT = 'cbr-published-map';
export const MAP_PUBLISHER_ID = '88c12d80-cdc8-44cf-a174-a75c63bb5936';
export const MAX_RELEASE_BYTES = 12 * 1024 * 1024;
const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
const fail = message => { throw new Error(message); };
const text = (s, max = 160) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
const exact = (o, keys) => o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).every(k => keys.includes(k));
export const isHistoryId = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value || '');
export const isReleaseId = value => /^[0-9a-f]{64}$/.test(value || '');

export function validateRelease(input) {
  if (!exact(input, ['format','version','history','map','firstTurn','lastTurn','bookmarks','civilizations','events','catalog','availability','statistics']) ||
      input.format !== MAP_RELEASE_FORMAT || input.version !== 1 || !isHistoryId(input.history) ||
      !integer(input.firstTurn, 0, 100000) || !integer(input.lastTurn, input.firstTurn, 100000)) fail('Invalid map release.');
  const map = input.map;
  if (!exact(map, ['id','width','height','fingerprint']) || map.id !== 's5' || map.width !== 180 || map.height !== 94 ||
      !/^fnv1a32:[0-9a-f]{8}:\d+$/.test(map.fingerprint || '')) fail('Incompatible base geography.');
  if (!Array.isArray(input.civilizations) || !input.civilizations.length || input.civilizations.length > 64 ||
      input.civilizations.some(c => !exact(c, ['name','ownerId']) || !text(c.name) || !integer(c.ownerId,0,63)) ||
      new Set(input.civilizations.map(c=>c.ownerId)).size !== input.civilizations.length) fail('Invalid civilization mapping.');
  const owners = new Set([-1,...input.civilizations.map(c=>c.ownerId)]);
  if('statistics' in input)validateStatistics(input.statistics,input);
  if (!exact(input.catalog, ['wonders','religions']) || ['wonders','religions'].some(k =>
    !Array.isArray(input.catalog[k]) || input.catalog[k].length > 512 || input.catalog[k].some(n=>!text(n)) ||
    new Set(input.catalog[k]).size !== input.catalog[k].length)) fail('Invalid release catalog.');
  if (input.availability !== 'historical-events-with-gaps') fail('Invalid availability declaration.');
  if (!Array.isArray(input.bookmarks) || !input.bookmarks.length || input.bookmarks.length > 1000 ||
      input.bookmarks.some(b=>!exact(b,['episode','turn']) || !/^\d+(\.\d+)?$/.test(b.episode) || !integer(b.turn,input.firstTurn,input.lastTurn)) ||
      new Set(input.bookmarks.map(b=>b.episode)).size !== input.bookmarks.length) fail('An episode end turn is required.');
  if (!Array.isArray(input.events) || !input.events.length || input.events.length > 100000) fail('Invalid event history.');
  let previous = -1;
  let references = 0;
  const foundingIds = new Set();
  for (const e of input.events) {
    if (!exact(e, ['turn','kind','owner','tiles','city','name','text']) || !integer(e.turn,input.firstTurn,input.lastTurn) || e.turn < previous ||
        !['claim','found','capture','raze','wonder','holyCity','message'].includes(e.kind) || !owners.has(e.owner) ||
        !Array.isArray(e.tiles) || (!e.tiles.length && e.kind!=='message') || e.tiles.some(i=>!integer(i,0,map.width*map.height-1)) ||
        new Set(e.tiles).size !== e.tiles.length) fail('Invalid or unreleased event.');
    if ((e.kind==='message' || 'text' in e) &&
        (!['message','wonder','holyCity'].includes(e.kind) || !text(e.text,65536))) fail('Invalid event message.');
    previous = e.turn; references += e.tiles.length;
    if (references > 1000000) fail('Too many event coordinates.');
    if (['found','wonder','holyCity'].includes(e.kind)) {
      if (e.tiles.length !== 1 || !text(e.name) || !integer(e.city,1,1000000)) fail('Invalid city event.');
      if (e.kind==='found') {
        if (foundingIds.has(e.city)) fail('Duplicate city lifetime.');
        foundingIds.add(e.city);
      }
      if (e.kind==='wonder' && !input.catalog.wonders.includes(e.name)) fail('Unknown wonder.');
      if (e.kind==='holyCity' && !input.catalog.religions.includes(e.name)) fail('Unknown religion.');
    } else if ('name' in e || 'city' in e) fail('Unexpected event metadata.');
  }
  // Catalogs are deliberately limited to names already observed by the cutoff.
  for (const [kind, key] of [['wonder','wonders'],['holyCity','religions']]) {
    if (input.catalog[key].some(name=>!input.events.some(e=>e.kind===kind && e.name===name))) fail('Catalog contains unreleased information.');
  }
  return input;
}

export function createTimeline(release) {
  validateRelease(release);
  const cache = new Map();
  function clone(state) {
    return { turn: state.turn, cursor: state.cursor, owners: state.owners.slice(),
      cities: new Map([...state.cities].map(([i,c])=>[i,{...c, worldWonders:[...c.worldWonders], holyReligions:[...c.holyReligions]}])),
      foundedOwners: new Set(state.foundedOwners), ruins: new Map(state.ruins),
      issues: [...state.issues] };
  }
  const empty = {turn:release.firstTurn-1,cursor:0,owners:new Int16Array(release.map.width*release.map.height).fill(-1),cities:new Map(),foundedOwners:new Set(),ruins:new Map(),issues:[]};
  function frame(turn) {
    if (!integer(turn,release.firstTurn,release.lastTurn)) fail('This turn has not been released.');
    const key = [...cache.keys()].filter(t=>t<=turn).sort((a,b)=>b-a)[0];
    const state = clone(key===undefined ? empty : cache.get(key));
    for (;state.cursor<release.events.length;state.cursor++) {
      const e=release.events[state.cursor]; if(e.turn>turn)break;
      for(const index of e.tiles) {
        const city=state.cities.get(index);
        if(e.kind==='claim')state.owners[index]=e.owner;
        if(e.kind==='found') {
          if(city)state.issues.push(`Duplicate founding at tile ${index}, turn ${e.turn}.`);
          const originalCapital=!state.foundedOwners.has(e.owner)&&e.owner>=0;
          state.foundedOwners.add(e.owner);state.ruins.delete(index);
          state.cities.set(index,{id:e.city,index,name:e.name,owner:e.owner,originalOwner:e.owner,isOriginalCapital:originalCapital,isCapital:originalCapital,worldWonders:[],holyReligions:[]});
          state.owners[index]=e.owner;
        }
        if(e.kind==='capture') {
          if(!city)state.issues.push(`Capture without founding at tile ${index}, turn ${e.turn}.`);
          else {if(city.owner!==e.owner)city.isCapital=false;city.owner=e.owner;state.owners[index]=e.owner;}
        }
        if(e.kind==='raze') {if(city)state.ruins.set(index,{index,name:city.name,originalOwner:city.originalOwner,turn:e.turn});state.cities.delete(index);}
        if(e.kind==='wonder'||e.kind==='holyCity') {
          if(!city || city.id!==e.city)state.issues.push(`Unmatched city detail at turn ${e.turn}.`);
          else {
            const list=e.kind==='wonder'?city.worldWonders:city.holyReligions;
            if(!list.includes(e.name))list.push(e.name);
          }
        }
      }
    }
    state.turn=turn;
    if(turn%25===0 || turn===release.lastTurn) {
      cache.set(turn,clone(state)); if(cache.size>40)cache.delete(cache.keys().next().value);
    }
    const issues=[...state.issues];
    for(const c of state.cities.values())if(c.owner!==state.owners[c.index])issues.push(`City/tile owner conflict at tile ${c.index}, turn ${turn}.`);
    return {turn,owners:state.owners,cities:[...state.cities.values()],ruins:[...state.ruins.values()],warnings:issues};
  }
  return {frame};
}

export function auditRelease(release) {
  const timeline=createTimeline(release), issues=[];
  // Check every distinct end-of-turn state; transient same-turn ordering is not a discrepancy.
  const turns=[...new Set([...release.events.map(e=>e.turn),release.lastTurn])];
  for(const turn of turns)for(const issue of timeline.frame(turn).warnings)if(issues.length<100)issues.push(issue);
  return {ok:!issues.length, issues:[...new Set(issues)], checkedTurns:turns.length,
    cities:timeline.frame(release.lastTurn).cities.length};
}

export function mergeContributions(frame, rows) {
  const cities=frame.cities.map(city=>({...city,worldWonders:[...city.worldWonders],attribution:{}}));
  const lookup=new Map(cities.map(city=>[city.id,city]));
  for(const row of rows) {
    const city=lookup.get(row.city_id);
    if(!city || row.turn!==frame.turn || row.hidden)continue;
    if(row.field==='population' && !Number.isFinite(city.size))city.size=row.value;
    else if(row.field==='religion' && city.religion===undefined)city.religion=row.value;
    else if(row.field==='wonders')city.worldWonders=[...new Set([...city.worldWonders,...row.value])];
    else continue;
    city.attribution[row.field]={name:row.author_name || 'CBR reader',revision:row.revision,reference:row.reference || ''};
  }
  return {...frame,cities};
}

export function validateContribution(release, frame, input) {
  if(!exact(input,['city','turn','field','value','reference','expectedRevision']) || input.turn!==frame.turn ||
    !integer(input.expectedRevision,0,1000000))fail('Invalid contribution.');
  const city=frame.cities.find(c=>c.id===input.city);
  if(!city)fail('This city does not exist at the selected turn.');
  if(typeof input.reference!=='string'||input.reference.length>200)fail('Keep the reference under 200 characters.');
  if(input.field==='population') {
    if(Number.isFinite(city.size)||!integer(input.value,1,10000))fail('Enter a missing population between 1 and 10,000.');
  } else if(input.field==='religion') {
    if(city.religion!==undefined || (input.value!==''&&!release.events.some(e=>e.kind==='holyCity'&&e.turn<=frame.turn&&e.name===input.value)))fail('Choose a religion founded by this turn.');
  } else if(input.field==='wonders') {
    if(!Array.isArray(input.value)||input.value.length>100||new Set(input.value).size!==input.value.length||
      input.value.some(n=>!release.events.some(e=>e.kind==='wonder'&&e.turn<=frame.turn&&e.name===n)||city.worldWonders.includes(n)))fail('Choose additional wonders recorded by this turn.');
    // A known wonder in another extant city is not a gap a reader can overwrite.
    if(input.value.some(n=>frame.cities.some(c=>c.worldWonders.includes(n))))fail('A verified location already exists for this wonder.');
  } else fail('Only missing city details can be contributed.');
  return input;
}
