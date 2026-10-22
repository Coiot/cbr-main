import {validateStatistics,statisticsThroughTurn} from '../../src/shared/mapStatistics.mjs';

export function prepareStatistics(input,extraction,release) {
  if(!input||Object.keys(input).some(k=>!['format','version','sourceSha256','firstTurn','lastTurn','players'].includes(k))||
    input.format!=='cbr-save-statistics'||input.version!==1||input.sourceSha256!==extraction.source.sha256||
    input.firstTurn!==0||input.lastTurn!==extraction.source.turn||!Array.isArray(input.players)||input.players.length!==release.civilizations.length)
    throw new Error('Statistics must match the exact source save and civilization roster.');
  const owners=new Map(release.civilizations.map(c=>[c.name,c.ownerId]));
  const statistics={version:1,firstTurn:0,lastTurn:input.lastTurn,players:input.players.map(p=>{
    if(!p||Object.keys(p).some(k=>!['name','values','alive'].includes(k))||!owners.has(p.name))throw new Error('Unknown statistics civilization.');
    if('alive' in p&&(!Array.isArray(p.alive)||p.alive.length!==input.lastTurn+1||p.alive.some(v=>v!==null&&v!==0&&v!==1)))throw new Error('Invalid civilization survival history.');
    return {owner:owners.get(p.name),values:p.values};
  })};
  const full={...release,lastTurn:input.lastTurn};
  validateStatistics(statistics,full);
  return statisticsThroughTurn(statistics,full,release.lastTurn);
}
