// Known metrics only. Raw saves, mod storage and notification buffers never form
// part of the public statistics response.
const metric=(key,label,group,unit='')=>({key,label,group,unit});
export const mapStatisticsMetrics=[
  metric('score','Score','Civilization','points'),
  metric('cities','Cities','Civilization','cities'),
  metric('population','City population','Civilization','citizens'),
  metric('demographicPopulation','Demographic population','Civilization','people'),
  metric('land','Owned tiles','Civilization','tiles'),
  metric('wonders','World wonders','Civilization','wonders'),
  metric('policies','Policies','Civilization','policies'),
  metric('military','Military strength','Military','rating'),
  metric('nukes','Nuclear weapons','Military','units'),
  metric('workers','Workers','Military','units'),
  metric('science','Science per turn','Science','science / turn'),
  metric('technologies','Technologies known','Science','technologies'),
  metric('research','Current research','Science'),
  metric('treasury','Treasury','Economy','gold'),
  metric('netGold','Net gold per turn','Economy','gold / turn'),
  metric('grossGold','Gross gold per turn','Economy','gold / turn'),
  metric('production','Production per turn','Economy','production / turn'),
  metric('food','Food per turn','Economy','food / turn'),
  metric('tradeRoutes','International trade routes','Economy','routes'),
  metric('cityConnectionGold','City connection income','Economy','gold / turn'),
  metric('tradeRouteGold','Trade route income','Economy','gold / turn'),
  metric('diplomacyGold','Diplomatic deal income','Economy','gold / turn'),
  metric('unitMaintenance','Unit maintenance','Economy','gold / turn'),
  metric('buildingMaintenance','Building maintenance','Economy','gold / turn'),
  metric('improvementMaintenance','Improvement maintenance','Economy','gold / turn'),
  metric('improvedTiles','Improved tiles','Economy','tiles'),
  metric('workedTiles','Worked tiles','Economy','tiles'),
  metric('excessHappiness','Excess happiness','Happiness','happiness'),
  metric('happiness','Total happiness','Happiness','happiness'),
  metric('unhappiness','Unhappiness','Happiness','unhappiness'),
  metric('goldenAgeTurns','Golden Age turns remaining','Happiness','turns'),
  metric('culture','Culture per turn','Culture','culture / turn'),
  metric('storedCulture','Stored culture','Culture','culture'),
  metric('greatWorks','Great works','Culture','works'),
  metric('tourism','Tourism per turn','Culture','tourism / turn'),
  metric('influential','Influential civilizations','Culture','civilizations'),
  ...['unknown','exotic','familiar','popular','dominant'].map(level=>metric(`tourism_${level}`,`Tourism: ${level}`,'Culture','civilizations')),
  metric('faith','Stored faith','Religion','faith'),
  metric('faithPerTurn','Faith per turn','Religion','faith / turn')
];
export const mapStatisticsKeys=mapStatisticsMetrics.map(m=>m.key);
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k));
export function validateStatistics(statistics,release) {
  const size=release.lastTurn-release.firstTurn+1,owners=new Set(release.civilizations.map(c=>c.ownerId));
  if(!exact(statistics,['version','firstTurn','lastTurn','players'])||statistics.version!==1||statistics.firstTurn!==release.firstTurn||statistics.lastTurn!==release.lastTurn||
    size>10000||!Array.isArray(statistics.players)||!statistics.players.length||statistics.players.length>owners.size)throw new Error('Invalid map statistics.');
  const seen=new Set();let samples=0;
  for(const player of statistics.players) {
    if(!exact(player,['owner','values'])||!owners.has(player.owner)||seen.has(player.owner)||!exact(player.values,mapStatisticsKeys)||!Object.keys(player.values).length)throw new Error('Invalid statistics player.');
    seen.add(player.owner);
    for(const [key,values] of Object.entries(player.values)) {
      if(!Array.isArray(values)||values.length!==size)throw new Error('Invalid or unreleased statistics range.');
      samples+=values.length;if(samples>3000000)throw new Error('Too many statistics samples.');
      if(values.some(v=>v!==null&&(key==='research'?!(integer(v,0,0)||typeof v==='string'&&/^TECH_[A-Z0-9_]{1,100}$/.test(v)):typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e15)))throw new Error('Invalid statistics value.');
    }
  }
  return statistics;
}
export function statisticsThroughTurn(statistics,release,lastTurn) {
  validateStatistics(statistics,release);
  if(!integer(lastTurn,release.firstTurn,release.lastTurn))throw new Error('Invalid statistics boundary.');
  const count=lastTurn-release.firstTurn+1;
  return {...statistics,lastTurn,players:statistics.players.map(p=>({owner:p.owner,values:Object.fromEntries(Object.entries(p.values).map(([k,v])=>[k,v.slice(0,count)]))}))};
}
export function statisticsAtTurn(release,turn) {
  if(!integer(turn,release.firstTurn,release.lastTurn))throw new Error('This statistics turn is not published.');
  if(!release.statistics)return {turn,available:false,rows:[]};
  const index=turn-release.firstTurn;
  return {turn,available:true,rows:release.statistics.players.map(p=>({owner:p.owner,values:Object.fromEntries(Object.entries(p.values).map(([key,values])=>[key,values[index]]))}))};
}
export function formatStatistic(value,key) {
  if(value===null||value===undefined||key==='research'&&value===0)return '—';
  if(key==='research')return value.replace(/^TECH_(?:EE_)?/,'').toLowerCase().split('_').map(s=>s[0]?.toUpperCase()+s.slice(1)).join(' ');
  return new Intl.NumberFormat('en',{maximumFractionDigits:2}).format(value);
}

export function statisticsRows(snapshot,release,turn,key) {
  if(!mapStatisticsKeys.includes(key)||!snapshot?.available||snapshot.turn!==turn||snapshot.history!==release.history)return [];
  const values=new Map(snapshot.rows.map(r=>[r.owner,r.values[key]]));
  return release.civilizations.map(c=>({...c,value:values.get(c.ownerId)??null})).sort((a,b)=>{
    if(a.value===null||b.value===null)return Number(a.value===null)-Number(b.value===null)||a.name.localeCompare(b.name);
    return (typeof a.value==='number'&&typeof b.value==='number'?b.value-a.value:String(a.value).localeCompare(String(b.value)))||a.name.localeCompare(b.name);
  });
}
