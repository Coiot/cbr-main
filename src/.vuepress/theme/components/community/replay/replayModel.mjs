import { fingerprintBytes } from './replayParser.mjs';
export const SNAPSHOT_FORMAT = 'cbr-local-replay-snapshot';
export const UNAVAILABLE = 'Per-city population, unit positions, improvements, routes, city religions, and wonders are not recorded here.';
const normalized = value => String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]/g, '');
const aliases = { bjarmia: 'bjarmians', hansa: 'hanseaticleague' };
export function mapCivilizations(civs, owners) {
  const used = new Set();
  return civs.map(civ => {
    const key = normalized(civ.name), target = aliases[key] || key;
    const matches = owners.flatMap((owner, index) => normalized(owner.name) === target ? [index] : []);
    if (matches.length !== 1 || used.has(matches[0])) throw new Error(`Cannot match civilization “${civ.name}” to Season 5. This lab currently supports the Season 5 roster.`);
    used.add(matches[0]);
    return { name: civ.name, label: owners[matches[0]].name, ownerId: matches[0] };
  });
}
export function baseIdentity(base) {
  return { id: 's5', name: 'CBRXMapOct62025_V2.civ5map', width: base.width, height: base.height,
    fingerprint: fingerprintBytes(new TextEncoder().encode(JSON.stringify(base.mapTiles))) };
}
export function validateReplayMap(replay, base) {
  if (replay.width !== base.width || replay.height !== base.height || replay.meta.mapScript.toLowerCase() !== 'cbrxmapoct62025_v2.civ5map') throw new Error('This replay does not use the current Season 5 map (180 × 94).');
  const differences = replay.terrain.reduce((sum, tile, index) => sum + Number(tile.terrain !== base.mapTiles[index].terrainType), 0);
  return differences ? [`${differences} terrain tiles differ from the base map. This lab keeps the original Season 5 geography.`] : [];
}
export function reconstructFrame(replay, mapping, turn) {
  if (!Number.isInteger(turn) || turn < replay.meta.startTurn || turn > replay.meta.endTurn) throw new Error('Choose a turn within this replay.');
  const owners = new Int16Array(replay.width * replay.height).fill(-1), cities = new Map(), warnings = new Set(), foundedOwners=new Set(), ruins=new Map();
  for (const event of replay.events) {
    if (event.turn > turn) break;
    const owner = event.civ < 0 ? -1 : mapping[event.civ].ownerId;
    for (const [x, y] of event.tiles) {
      if (x < 0 || y < 0) continue;
      const index = y * replay.width + x;
      if (event.type === 2) owners[index] = owner;
      if (event.type === 1) {
        const originalCapital=owner>=0&&!foundedOwners.has(owner);foundedOwners.add(owner);ruins.delete(index);
        cities.set(index, { id: event.order + 1, index, name: event.text.replace(/ is founded\.$/, '').trim() || 'Unnamed city', owner, originalOwner: owner,isOriginalCapital:originalCapital,isCapital:originalCapital });
        owners[index] = owner;
      }
      if (event.type === 3) {
        const city = cities.get(index);
        if (city) { if(city.owner!==owner)city.isCapital=false;city.owner = owner; owners[index] = owner; }
        else warnings.add(`A city transfer at ${x},${y} has no recorded founding.`);
      }
      if (event.type === 4) {const c=cities.get(index);if(c)ruins.set(index,{index,name:c.name,originalOwner:c.originalOwner,turn:event.turn});cities.delete(index);}
    }
  }
  const cityList = [...cities.values()];
  const conflicts = cityList.filter(city => owners[city.index] !== city.owner).length;
  if (conflicts) warnings.add(`${conflicts} recorded city locations disagree with the latest tile ownership. These city records need review.`);
  return { turn, owners, cities: cityList, ruins:[...ruins.values()], warnings: [...warnings] };
}
export function frameSummary(frame, mapping) {
  const rows = mapping.map(civ => ({ ...civ, cities: 0, tiles: 0 }));
  const lookup = new Map(rows.map(row => [row.ownerId, row]));
  for (const owner of frame.owners) { const row = lookup.get(owner); if (row) row.tiles++; }
  for (const city of frame.cities) { const row = lookup.get(city.owner); if (row) row.cities++; }
  return rows.sort((a, b) => b.cities - a.cities || b.tiles - a.tiles || a.label.localeCompare(b.label));
}
// Resolve names at the event itself, before later captures, razing or refounding.
export function cityEventLabels(replay, mapping) {
  const cities=new Map(),labels=new Map();
  const ownerName=civ=>civ<0?'Unclaimed':mapping[civ]?.label||'Unknown civilization';
  for(const event of replay.events) {
    if(![1,3,4].includes(event.type))continue;
    const descriptions=[];
    for(const [x,y] of event.tiles) {
      if(x<0||y<0)continue;
      const key=y*replay.width+x,city=cities.get(key);
      const name=city?.name||`City at tile ${x},${replay.height-1-y}`;
      if(event.type===1)cities.set(key,{name:event.text.replace(/ is founded\.$/,'').trim()||`City at tile ${x},${replay.height-1-y}`,civ:event.civ});
      if(event.type===3) {
        descriptions.push(city&&city.civ!==event.civ?`${name}: ${ownerName(city.civ)} → ${ownerName(event.civ)}`:`${name}: ownership recorded for ${ownerName(event.civ)}`);
        if(city)city.civ=event.civ;
      }
      if(event.type===4){descriptions.push(`${name}: razed (${ownerName(event.civ)})`);cities.delete(key);}
    }
    if(descriptions.length)labels.set(event.order,descriptions.join('; '));
  }
  return labels;
}
export function exportReplaySnapshot(session, frame, map) {
  const issue = replaySnapshotIssue(frame);
  if (issue) throw new Error(issue);
  return { format: SNAPSHOT_FORMAT, version: 1, map, sourceFingerprint: session.sourceFingerprint,
    meta: { startTurn: session.meta.startTurn, endTurn: session.meta.endTurn }, civilizations: session.mapping.map(({ name, ownerId }) => ({ name, ownerId })),
    frame: { turn: frame.turn, owners: Array.from(frame.owners), cities: frame.cities.map(({ id, index, name, owner, originalOwner,isCapital,isOriginalCapital }) => ({ id, index, name, owner, originalOwner,...(typeof isCapital==='boolean'?{isCapital}:{}),...(typeof isOriginalCapital==='boolean'?{isOriginalCapital}:{}) })),ruins:frame.ruins||[] },
    warnings: [...session.warnings, ...frame.warnings], unavailable: UNAVAILABLE };
}
export function replaySnapshotIssue(frame) {
  return frame?.cities.some(city => frame.owners[city.index] !== city.owner)
    ? 'Snapshot download is unavailable for this turn because some city records conflict with tile ownership. You can still explore the timeline.'
    : '';
}
export function readReplaySnapshot(input, map, ownerList) {
  if (input?.format !== SNAPSHOT_FORMAT || input.version !== 1 || input.map?.id !== map.id || input.map?.fingerprint !== map.fingerprint || input.map?.width !== map.width || input.map?.height !== map.height) throw new Error('This is not a compatible local replay snapshot.');
  if (typeof input.sourceFingerprint !== 'string' || !/^fnv1a32:[0-9a-f]{8}:\d{1,8}$/.test(input.sourceFingerprint)) throw new Error('Invalid snapshot source fingerprint.');
  if (!Array.isArray(input.civilizations) || !input.civilizations.length || input.civilizations.length > 256 || input.civilizations.some(c => typeof c?.name !== 'string' || c.name.length > 256)) throw new Error('Invalid snapshot civilizations.');
  const mapping = mapCivilizations(input.civilizations, ownerList), allowed = new Set([-1, ...mapping.map(c => c.ownerId)]);
  if (input.civilizations.some((civ,index) => civ.ownerId !== mapping[index].ownerId)) throw new Error('This snapshot uses a different civilization mapping. Re-export it from the original replay.');
  const frame = input.frame, count = map.width * map.height;
  if (!Number.isInteger(input.meta?.startTurn) || !Number.isInteger(input.meta?.endTurn) || input.meta.startTurn < 0 || input.meta.endTurn > 100000 || !Number.isInteger(frame?.turn) || frame.turn < input.meta.startTurn || frame.turn > input.meta.endTurn || !Array.isArray(frame.owners) || frame.owners.length !== count || frame.owners.some(v => !allowed.has(v)) || !Array.isArray(frame.cities) || frame.cities.length > count) throw new Error('Invalid snapshot state.');
  const indices = new Set(), ids = new Set();
  const cities = frame.cities.map(city => {
    if (!Number.isSafeInteger(city.id) || city.id < 1 || ids.has(city.id) || !Number.isInteger(city.index) || city.index < 0 || city.index >= count || indices.has(city.index) || typeof city.name !== 'string' || !city.name.trim() || city.name.length > 512 || !allowed.has(city.owner) || !allowed.has(city.originalOwner) || frame.owners[city.index] !== city.owner) throw new Error('Invalid snapshot city.');
    indices.add(city.index); ids.add(city.id);
    if(['isCapital','isOriginalCapital'].some(k=>city[k]!==undefined&&typeof city[k]!=='boolean'))throw new Error('Invalid capital marker.');
    return { id: city.id, index: city.index, name: city.name, owner: city.owner, originalOwner: city.originalOwner,...(typeof city.isCapital==='boolean'?{isCapital:city.isCapital}:{}),...(typeof city.isOriginalCapital==='boolean'?{isOriginalCapital:city.isOriginalCapital}:{}) };
  });
  const ruins=frame.ruins||[];
  if(!Array.isArray(ruins)||ruins.length>count||ruins.some(r=>!Number.isInteger(r.index)||r.index<0||r.index>=count||indices.has(r.index)||typeof r.name!=='string'||r.name.length>512||!allowed.has(r.originalOwner)||!Number.isInteger(r.turn)||r.turn<0||r.turn>frame.turn))throw new Error('Invalid ruined city record.');
  const warnings = Array.isArray(input.warnings) ? input.warnings.filter(v => typeof v === 'string').slice(0, 100).map(v => v.slice(0, 512)) : [];
  return { kind: 'snapshot', mapping, meta: { startTurn: input.meta.startTurn, endTurn: input.meta.endTurn },
    sourceFingerprint: input.sourceFingerprint, warnings,
    frame: { turn: frame.turn, owners: new Int16Array(frame.owners), cities,ruins, warnings: [] } };
}
