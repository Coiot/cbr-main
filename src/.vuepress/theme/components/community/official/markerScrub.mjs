// Pointer-only magnetism. Keyboard, select and numeric input never use this state.
export function createMarkerScrubber(markers,{delay=180,tolerance=2}={}) {
  const turns=[...new Set(markers)].sort((a,b)=>a-b);
  let previous=null,hold=null,ignored=null;
  return {
    finish(raw){return hold&&Math.abs(raw-hold.turn)<=tolerance*2?hold.turn:raw;},
    step(raw,now) {
      if(hold){previous=raw;if(now<hold.until)return {turn:hold.turn,until:hold.until};ignored=hold.turn;hold=null;return {turn:raw};}
      if(ignored!==null&&Math.abs(raw-ignored)>tolerance*2)ignored=null;
      const crossed=previous===null?[]:turns.filter(t=>t!==ignored&&(raw>previous?t>previous&&t<=raw:t<previous&&t>=raw));
      if(raw<previous)crossed.reverse();
      const near=turns.filter(t=>t!==ignored&&Math.abs(t-raw)<=tolerance).sort((a,b)=>Math.abs(a-raw)-Math.abs(b-raw));
      const marker=crossed[0]??near[0];previous=raw;
      if(marker!==undefined){hold={turn:marker,until:now+delay};return {...hold};}
      return {turn:raw};
    }
  };
}
