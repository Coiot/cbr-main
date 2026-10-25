// Some scripted removals omit CITY_DESTROYED but do record the city centre
// becoming unclaimed. Reconcile only that explicit evidence, at end of turn:
// a temporary unclaim followed by a capture/claim must not destroy the city.
export function withCityDestructions(events) {
  const result=[],cities=new Map(),owners=new Map(),unclaimed=new Set();
  let turn;
  const finishTurn=()=>{
    for(const index of unclaimed) {
      const city=cities.get(index);
      if(city&&owners.get(index)===-1) {
        result.push({turn,kind:'raze',owner:city.owner,tiles:[index]});
        cities.delete(index);
      }
    }
    unclaimed.clear();
  };
  for(const event of events) {
    if(event.turn!==turn){finishTurn();turn=event.turn;}
    result.push(event);
    for(const index of event.tiles) {
      if(event.kind==='claim') {
        owners.set(index,event.owner);
        if(event.owner===-1&&cities.has(index))unclaimed.add(index);
      } else if(event.kind==='found') {
        cities.set(index,{owner:event.owner});owners.set(index,event.owner);
      } else if(event.kind==='capture'&&cities.has(index)) {
        cities.set(index,{owner:event.owner});owners.set(index,event.owner);
      } else if(event.kind==='raze')cities.delete(index);
    }
  }
  finishTurn();
  return result;
}
