import {validateDetail} from '../../../../../shared/mapDetails.mjs';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const unit=u=>u?{type:u.type,owner:u.owner}:null;
// Adapt the existing Edit controls to the shared live layer, never legacy overrides.
export function nativeDetailEdits(tile,frame) {
  const [x,y]=tile.key.split(',').map(Number),index=(93-y)*180+x;
  const city=frame.cities.find(c=>c.index===index),details=frame.details?.find(d=>d.index===index)||{};
  if((tile.owner??-1)!==frame.owners[index]||!!tile.city!==!!city||
    (city&&(tile.city.id!==city.id||tile.city.name!==city.name||tile.originalOwner!==city.originalOwner)))throw new Error('City placement, names, founders and borders follow the game history.');
  const records=[];
  const add=(field,value,previous,cityScoped=false)=>{if(equal(value,previous))return;
    const record={tile:index,city:cityScoped?city.id:null,owner:cityScoped?city.owner:field==='ideology'?tile.owner:null,
      field,value,author:'Local editor',reference:''};
    validateDetail(record);records.push(record);
  };
  if(city){
    add('wonders',tile.city.worldWonders||[],city.worldWonders||[],true);
    for(const [field,key] of [['capital','isCapital'],['puppeted','isPuppeted'],['occupied','isOccupied'],['resistance','isResistance']])add(field,!!tile.city[key],!!city[key],true);
  }
  add('improvement',tile.improvement||null,details.improvement||null);
  add('route',tile.route||null,details.route||null);
  add('pillaged',!!tile.pillaged,!!details.pillaged);
  const ruins=!city&&(details.ruins??(frame.ruins?.some(r=>r.index===index)&&!details.improvement)??false);
  add('ruins',!!tile.ruins,!!ruins);
  add('notes',tile.notes||null,details.notes||null);
  if(Number.isInteger(tile.owner))add('ideology',tile.ideology||null,frame.cities.find(c=>c.owner===tile.owner)?.ideology||null);
  const units=JSON.parse(JSON.stringify(details.units||[]));let changed=false;
  for(const role of ['combat','civilian']) {
    const i=units.findIndex(u=>u.role===role),before=i<0?null:units[i],next=tile[`${role}Unit`];
    if(equal(unit(before),unit(next)))continue;changed=true;
    if(i>=0)units.splice(i,1,...(next?[{...unit(next),role}]:[]));else if(next)units.push({...unit(next),role});
  }
  if(changed)add('units',units,details.units||[]);
  return records;
}
