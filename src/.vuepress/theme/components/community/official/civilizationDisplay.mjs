import {getEdition} from '../../../../data/editions.js';
import {OWNER_COLOR_MAP,normalizeOwnerKey} from '../../../../data/civColors.mjs';

const roster=[...getEdition('s5').competitors,{name:'Babylon'}];
export const civilizationName=name=>String(name||'').trim().replace(/^the\s+/i,'');

// Published owner IDs use the website roster. Save labels can include articles,
// accents or aliases such as Bjarmia, so resolve colours from the roster ID.
export function civilizationStyle(ownerId) {
  const colors=OWNER_COLOR_MAP[normalizeOwnerKey(roster[ownerId]?.name)]||{primary:'#51452f',secondary:'#f4c35e'};
  return {backgroundColor:colors.primary,borderColor:colors.secondary};
}
