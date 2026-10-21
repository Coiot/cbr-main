// One mutable editor layer, independent of historical turns and release packages.
export const DETAIL_FORMAT = 'cbr-map-live-details';
export const DETAIL_FIELDS = ['population','religion','wonders','capital','puppeted','occupied','resistance','ideology','improvement','route','units','pillaged','notes','ruins'];
export const CITY_FIELDS = ['population','religion','wonders','capital','puppeted','occupied','resistance'];
const int=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const plain=o=>o&&typeof o==='object'&&!Array.isArray(o);
const exact=(o,keys)=>plain(o)&&Object.keys(o).every(k=>keys.includes(k));
const str=(s,max)=>typeof s==='string'&&s.length<=max;
const fail=s=>{throw new Error(s);};
export function validateDetail(record, {tileCount=16920}={}) {
  if(!exact(record,['tile','city','owner','field','value','author','reference']) ||
    !int(record.tile,0,tileCount-1)||!DETAIL_FIELDS.includes(record.field)||
    !str(record.author,100)||!str(record.reference,200)||
    !(record.city===null||int(record.city,1,1000000))||!(record.owner===null||int(record.owner,0,63)))fail('Invalid live map detail.');
  if(CITY_FIELDS.includes(record.field)&&(record.city===null||record.owner===null))fail('City details require a matching city lifetime and owner.');
  if(!CITY_FIELDS.includes(record.field)&&record.city!==null)fail('Tile details cannot be attached to a city.');
  if(record.field==='ideology'&&record.owner===null)fail('Ideology belongs to a civilization.');
  if(!CITY_FIELDS.includes(record.field)&&record.field!=='ideology'&&record.owner!==null)fail('Tile details are shared across ownership changes.');
  const v=record.value;
  if(record.field==='population'&&!int(v,1,10000))fail('Population must be between 1 and 10,000.');
  if(['religion','ideology','improvement'].includes(record.field)&&!(v===null||str(v,160)))fail('Keep this value under 160 characters.');
  if(record.field==='wonders'&&(!Array.isArray(v)||v.length>100||v.some(n=>!str(n,160)||!n.trim())||new Set(v).size!==v.length))fail('Invalid wonder list.');
  if(['capital','puppeted','occupied','resistance','pillaged','ruins'].includes(record.field)&&typeof v!=='boolean')fail('Choose yes or no.');
  if(record.field==='route'&&![null,'road','railroad'].includes(v))fail('Choose road, railroad, or none.');
  if(record.field==='notes'&&!(v===null||str(v,2000)))fail('Keep notes under 2,000 characters.');
  if(record.field==='units'&&(!Array.isArray(v)||v.length>32||v.some(u=>!exact(u,['type','owner','role'])||!str(u.type,120)||!u.type.trim()||!int(u.owner,0,63)||!['combat','civilian'].includes(u.role))))fail('Invalid unit list.');
  return record;
}
export function validateDetails(input, source, limits={}) {
  if(!exact(input,['format','version','source','records'])||input.format!==DETAIL_FORMAT||input.version!==1||input.source!==source||!Array.isArray(input.records)||input.records.length>100000)fail('This live layer belongs to a different history.');
  const keys=new Set();
  for(const record of input.records){validateDetail(record,limits);const key=detailKey(record);if(keys.has(key))fail('A live layer can only have one value for each detail.');keys.add(key);}
  return input;
}
export const emptyDetails=source=>({format:DETAIL_FORMAT,version:1,source,records:[]});
export function detailKey(r){return ['ideology','capital'].includes(r.field)?`${r.field}:${r.owner}`:`${r.tile}:${r.field}`;}
export function putDetail(layer,record,limits){validateDetail(record,limits);return {...layer,records:[...layer.records.filter(r=>detailKey(r)!==detailKey(record)),JSON.parse(JSON.stringify(record))]};}

export function mergeDetails(frame,records=[]) {
  const cities=frame.cities.map(c=>({...c,worldWonders:[...(c.worldWonders||[])],verifiedWorldWonders:[...(c.verifiedWorldWonders||(c.attribution?.wonders?[]:c.worldWonders)||[])],attribution:{...(c.attribution||{})}}));
  const byTile=new Map(cities.map(c=>[c.index,c])), tiles=new Map();
  // Latest value wins; seeking the timeline never selects another editor layer.
  const current=new Map(records.map(r=>[detailKey(r),r]));
  for(const r of current.values()) {
    const city=byTile.get(r.tile), owner=frame.owners[r.tile], attribution={name:r.author,reference:r.reference};
    if(r.field==='ideology'){for(const c of cities)if(c.owner===r.owner){c.ideology=r.value;c.attribution.ideology=attribution;}continue;}
    if(CITY_FIELDS.includes(r.field)) {
      if(!city||city.id!==r.city||owner!==r.owner)continue;
      const verified=frame.cities.find(c=>c.id===city.id);
      if(r.field==='population'){if(Number.isFinite(verified?.size)&&!verified?.attribution?.population)continue;city.size=r.value;}
      if(r.field==='religion'){if(verified?.religion!==undefined&&!verified?.attribution?.religion)continue;city.religion=r.value||'';}
      if(r.field==='wonders')city.worldWonders=[...new Set([...city.verifiedWorldWonders,...r.value.filter(n=>!cities.some(c=>c.id!==city.id&&c.verifiedWorldWonders.includes(n)))])];
      if(r.field==='capital')city.isCapital=r.value;
      if(['puppeted','occupied','resistance'].includes(r.field))city[{puppeted:'isPuppeted',occupied:'isOccupied',resistance:'isResistance'}[r.field]]=r.value;
      city.attribution[r.field]=attribution;
    } else {
      // A manual ruin never covers a city recorded in game history.
      if(r.field==='ruins'&&city)continue;
      const tile=tiles.get(r.tile)||{index:r.tile,attribution:{}};
      tile[r.field]=JSON.parse(JSON.stringify(r.value));tile.attribution[r.field]=attribution;tiles.set(r.tile,tile);
    }
  }
  for(const r of current.values())if(r.field==='capital'&&r.value) {
    const chosen=byTile.get(r.tile);if(chosen?.id!==r.city||chosen.owner!==r.owner)continue;
    for(const c of cities)if(c.owner===chosen.owner)c.isCapital=c.id===chosen.id;
  }
  return {...frame,cities,details:[...tiles.values()]};
}
