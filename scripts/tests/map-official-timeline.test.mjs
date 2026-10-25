import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MAP_PUBLISHER_ID,validateRelease,createTimeline,auditRelease,mergeContributions,validateContribution} from '../../src/shared/mapRelease.mjs';
import {prepareRelease} from '../map-release/prepare.mjs';
import {withCityDestructions} from '../map-release/cityDestructions.mjs';
import {createMapReleaseHandler,digest} from '../../supabase/functions/map-release/handler.mjs';
import {baseIdentity} from '../../src/.vuepress/theme/components/community/replay/replayModel.mjs';
import {mapLoadingMethods} from '../../src/.vuepress/theme/components/community/map/mapLoading.js';
import {mapAccessComputed} from '../../src/.vuepress/theme/components/community/map/mapAccess.js';
import {mapPersistenceMethods} from '../../src/.vuepress/theme/components/community/map/mapPersistence.js';
import {validateDetail,validateDetails,mergeDetails,emptyDetails,putDetail} from '../../src/shared/mapDetails.mjs';
import {mapOverlaysComputed} from '../../src/.vuepress/theme/components/community/map/mapOverlays.js';
import {mapRenderingMethods} from '../../src/.vuepress/theme/components/community/map/mapRendering.js';
import {mapEditingMethods} from '../../src/.vuepress/theme/components/community/map/mapEditing.js';
import {nativeDetailEdits} from '../../src/.vuepress/theme/components/community/map/nativeDetailEdits.mjs';
import {timelineLastTurn,timelineBookmarks,isLoopbackTimeline,defaultEpisodeMarkers} from '../../src/shared/mapTimelineDisplay.mjs';

import {upsertEpisodeMarker,validateEpisodeMarkers,releaseThroughEpisodes} from '../../src/shared/mapEpisodeMarkers.mjs';
import {createMarkerScrubber} from '../../src/.vuepress/theme/components/community/official/markerScrub.mjs';
import {timelineSummary,timelineEvents,timelineEventHistory,filterTimelineEvents,cleanEventText,eventCategories} from '../../src/.vuepress/theme/components/community/official/timelineSummary.mjs';
import {validateStatistics,statisticsAtTurn,statisticsRows,formatStatistic} from '../../src/shared/mapStatistics.mjs';
import {prepareStatistics} from '../map-release/statistics.mjs';
import {observedEvents,SEASON5_EVENT_SOURCE} from '../map-release/observedEvents.mjs';
import {statisticsMethods} from '../../src/.vuepress/theme/components/community/official/statisticsSession.mjs';

const history='00000000-0000-4000-8000-000000000001';
function fixture(){
  return {format:'cbr-published-map',version:1,history,map:{id:'s5',width:180,height:94,fingerprint:'fnv1a32:12345678:123'},
    firstTurn:0,lastTurn:4,civilizations:[{name:'Japan',ownerId:0},{name:'Hyksos',ownerId:1}],
    bookmarks:[{episode:'1',turn:4}],availability:'historical-events-with-gaps',
    catalog:{wonders:['Great Library'],religions:['Pesedjet']},
    events:[
      {turn:0,kind:'found',owner:0,tiles:[20],city:1,name:'Capital'},
      {turn:0,kind:'claim',owner:0,tiles:[19,21]},
      {turn:1,kind:'wonder',owner:0,tiles:[20],city:1,name:'Great Library'},
      {turn:1,kind:'holyCity',owner:0,tiles:[20],city:1,name:'Pesedjet'},
      {turn:2,kind:'capture',owner:1,tiles:[20]},
      {turn:3,kind:'raze',owner:1,tiles:[20]},
      {turn:4,kind:'found',owner:1,tiles:[20],city:7,name:'New city'}
    ]};
}
function statisticsFixture(){return {version:1,firstTurn:0,lastTurn:4,players:[
  {owner:0,values:{score:[1,2,null,4,999],research:[null,'TECH_POTTERY',null,'TECH_WRITING','TECH_FUTURE_RESEARCH']}},
  {owner:1,values:{score:[2,1,null,null,null],research:[null,'TECH_MINING',null,null,null]}}
]};}
test('Season 5 observed events use only consecutive records, preserve attribution and filter by turn',()=>{
  const release=fixture();release.civilizations=[{name:'Japan',ownerId:9},{name:'Hyksos',ownerId:2}];
  const input={sourceSha256:SEASON5_EVENT_SOURCE,players:[{name:'Japan',alive:[1,1,1,0,0],values:{
    goldenAgeTurns:[1,0,1,0,0],research:['TECH_MINING','TECH_WRITING',null,'TECH_POTTERY','TECH_FUTURE'],
    cities:[9,10,null,20,30],population:[99,100,null,200,300],policies:[0,1,2,3,4],nukes:[0,1,2,3,4]
  }}]};
  release.lastTurn=3;
  const events=observedEvents(input,release);
  assert.equal(events.length,5);assert.ok(events.every(e=>e.owner===9&&e.turn<=3));
  assert.equal(events.filter(e=>/Golden Age/.test(e.text)).length,1,'Elimination must not also appear as a Golden Age ending');
  assert.equal(events.filter(e=>/researching/.test(e.text)).length,1,'No research change across a missing observation');
  assert.doesNotMatch(JSON.stringify(events),/FUTURE|POTTERY|polic|nuclear|20 cities|200 total/i);
  const entries=timelineEventHistory({...release,events});
  assert.equal(filterTimelineEvents(entries,1,'milestones').length,1);
  assert.equal(filterTimelineEvents(entries,1,'research').length,1);
  assert.equal(filterTimelineEvents(entries,1,'civilization').length,2);
  assert.equal(filterTimelineEvents(entries,3,'civilization','eliminated').length,1);
  assert.equal(filterTimelineEvents(entries,2,'all','eliminated').length,0);
  assert.deepEqual(observedEvents({...input,sourceSha256:'another-game'},release),[]);
  assert.deepEqual(observedEvents(input,{...release,map:{...release.map,id:'s4'}}),[]);
  // A future sample cannot alter any event already available at an earlier turn.
  const changed=structuredClone(input);changed.players[0].values.research[4]='TECH_SECRET';
  assert.deepEqual(observedEvents(changed,release),events);
});
test('growth milestones are first recorded crossings and do not repeat after losses or bridge gaps',()=>{
  const release=fixture();release.lastTurn=8;
  const events=observedEvents({sourceSha256:SEASON5_EVENT_SOURCE,players:[{name:'Japan',values:{
    cities:[9,10,8,10,null,20,19,20,30],population:[99,100,80,100,null,200,190,200,300]
  }}]},release);
  assert.deepEqual(events.map(e=>e.turn),[1,1,8,8]);
});
test('statistics are exact-turn observations, preserve missing/dead values, and clip all future samples',()=>{
  const release=fixture();release.statistics=statisticsFixture();const original=JSON.stringify(release);
  validateRelease(release);
  const snapshot={history:release.history,...statisticsAtTurn(release,1)};
  assert.deepEqual(snapshot.rows.map(r=>r.values.score),[2,1]);
  assert.doesNotMatch(JSON.stringify(snapshot),/999|FUTURE/);
  assert.deepEqual(statisticsAtTurn(release,2).rows.map(r=>r.values.score),[null,null]);
  assert.equal(statisticsAtTurn(release,3).rows[1].values.score,null,'A dead civilization must not inherit a later or previous value');
  assert.equal(statisticsRows(snapshot,release,1,'score')[0].name,'Japan');
  assert.deepEqual(statisticsRows(snapshot,release,0,'score'),[],'A stale future response is hidden while scrubbing backward');
  assert.deepEqual(statisticsRows({...snapshot,history:'other'},release,1,'score'),[]);
  assert.throws(()=>statisticsAtTurn(release,5),/not published/);
  const clipped=releaseThroughEpisodes(release,[{episode:'1',turn:1}]);
  assert.equal(clipped.statistics.lastTurn,1);assert.deepEqual(clipped.statistics.players[0].values.score,[1,2]);
  assert.doesNotMatch(JSON.stringify(clipped),/FUTURE_RESEARCH|999/);
  assert.equal(JSON.stringify(release),original);
  assert.equal(formatStatistic(null,'score'),'—');assert.equal(formatStatistic(0,'research'),'—');
  assert.equal(formatStatistic('TECH_EE_NATURAL_HISTORY','research'),'Natural History');
});
test('statistics reject future ranges, unknown metrics, invalid values and mismatched source rosters',()=>{
  const release=fixture();
  for(const mutate of [s=>s.lastTurn=751,s=>s.players[0].values.score.push(751),s=>s.players[0].values.secret=[0,0,0,0,0],
    s=>s.players[0].owner=63,s=>s.players[1].owner=0,s=>s.players[0].values.score[0]='private',s=>s.players[0].values.score[0]=Infinity,
    s=>s.players[0].values.research[0]='raw filename',s=>s.filename='private-save']){
    const statistics=statisticsFixture();mutate(statistics);assert.throws(()=>validateStatistics(statistics,release));
  }
  const extraction={source:{sha256:'a'.repeat(64),turn:4}},input={format:'cbr-save-statistics',version:1,sourceSha256:extraction.source.sha256,firstTurn:0,lastTurn:4,
    players:statisticsFixture().players.map(p=>({name:release.civilizations.find(c=>c.ownerId===p.owner).name,values:p.values}))};
  assert.deepEqual(prepareStatistics(input,extraction,release),statisticsFixture());
  assert.throws(()=>prepareStatistics({...input,sourceSha256:'b'.repeat(64)},extraction,release),/exact source/);
  assert.throws(()=>prepareStatistics({...input,players:[input.players[0],input.players[0]]},extraction,release),/statistics player/);
  const withAlive=structuredClone(input);withAlive.players[0].alive=[1,1,1,0,0];
  assert.deepEqual(prepareStatistics(withAlive,extraction,release),statisticsFixture(),'Private survival samples do not enter public statistics');
  withAlive.players[0].alive.push(1);
  assert.throws(()=>prepareStatistics(withAlive,extraction,release),/survival history/);
});
test('statistics UI immediately clears old observations and discards responses superseded by another turn',async()=>{
  const release=fixture();release.statistics=statisticsFixture();
  const context={_alive:true,preview:true,release,releaseId:'',turn:4,snapshot:{old:true},loading:false,error:''};
  await statisticsMethods.load.call(context);
  assert.equal(context.snapshot.turn,4);
  context.turn=1;await statisticsMethods.load.call(context);assert.equal(context.snapshot.turn,1);
  assert.doesNotMatch(JSON.stringify(context.snapshot),/FUTURE|999/);
  context._alive=false;context.turn=0;await statisticsMethods.load.call(context);assert.equal(context.snapshot.turn,1,'Unmounted components make no further requests');
});
test('a delayed future statistics response cannot overwrite a newer earlier-turn selection',async()=>{
  const release=fixture();release.statistics=statisticsFixture();
  const originalFetch=globalThis.fetch,pending=[];
  globalThis.fetch=async(_,options)=>new Promise(resolve=>pending.push({turn:JSON.parse(options.body).turn,resolve}));
  const context={_alive:true,preview:false,release,releaseId:'a'.repeat(64),client:null,turn:4,snapshot:null};
  try{
    const future=statisticsMethods.load.call(context);assert.equal(pending.length,1);
    context.turn=1;const earlier=statisticsMethods.load.call(context);assert.equal(context.snapshot,null);assert.equal(pending.length,2);
    const response=turn=>new Response(JSON.stringify({id:context.releaseId,history:release.history,...statisticsAtTurn(release,turn)}));
    pending[1].resolve(response(1));await earlier;
    pending[0].resolve(response(4));await future;
    assert.equal(context.snapshot.turn,1);assert.doesNotMatch(JSON.stringify(context.snapshot),/FUTURE|999/);
  }finally{globalThis.fetch=originalFetch;}
});
test('Episode 34 display ends at 595 without extending shorter releases or changing source data',()=>{
  const release=fixture();release.lastTurn=596;release.bookmarks=[{episode:'1',turn:4},{episode:'34',turn:594},{episode:'35',turn:596}];
  release.events.push({turn:595,kind:'claim',owner:1,tiles:[19]},{turn:596,kind:'claim',owner:0,tiles:[19]});
  const original=JSON.stringify(release),lastTurn=timelineLastTurn(release.lastTurn,[{episode:'34',turn:595}]);
  assert.equal(lastTurn,595);assert.equal(timelineLastTurn(166),166);assert.equal(timelineLastTurn(4),4);
  assert.deepEqual(timelineBookmarks([{episode:'1',turn:4},{episode:'34',turn:595}],lastTurn),[{episode:'1',turn:4},{episode:'34',turn:595}]);
  assert.deepEqual(timelineBookmarks([{episode:'1',turn:4}],4),[{episode:'1',turn:4}]);
  assert.equal(createTimeline(release).frame(lastTurn).owners[19],1);
  assert.equal(createTimeline(release).frame(596).owners[19],0);
  assert.equal(JSON.stringify(release),original);
});
test('current public defaults preserve Episode 34 and end Episode 35 at 645',()=>{
  assert.deepEqual(defaultEpisodeMarkers,[{episode:'34',turn:595},{episode:'35',turn:645}]);
  assert.equal(timelineLastTurn(751),645);
  assert.equal(timelineLastTurn(600),600);
});
test('confirmed episode endpoints bound every viewer, including former privileged callers',()=>{
  const markers=[{episode:'34',turn:595}];
  assert.equal(timelineLastTurn(751,markers),595);assert.equal(timelineLastTurn(999,markers),595);
  assert.equal(timelineLastTurn(751,markers,true),595,'A legacy privilege flag must not bypass the public endpoint');
  const next=upsertEpisodeMarker(markers,{episode:'35',turn:620});assert.equal(timelineLastTurn(751,next),620);
  assert.throws(()=>upsertEpisodeMarker(next,{episode:'33',turn:621}),/episode order/);
  assert.throws(()=>upsertEpisodeMarker(markers,{episode:'35',turn:752},{lastTurn:751}),/available history/);
  assert.throws(()=>validateEpisodeMarkers([{episode:'34',turn:595},{episode:'34',turn:596}]),/one endpoint/);
  assert.equal(isLoopbackTimeline('localhost'),true);assert.equal(isLoopbackTimeline('localhost.example.com'),false);
});
test('pointer scrubbing holds crossed episode markers briefly and releases to the latest drag position',()=>{
  const scrub=createMarkerScrubber([40,80],{delay:180,tolerance:2});
  assert.equal(scrub.step(10,0).turn,10);
  assert.equal(scrub.step(55,10).turn,40);
  assert.equal(scrub.step(65,100).turn,40);
  assert.equal(scrub.step(65,191).turn,65);
  assert.equal(scrub.step(90,200).turn,80);
  assert.equal(scrub.finish(81),80,'Releasing near a marker settles on it');
  assert.equal(scrub.finish(150),150,'A fast drag must not finish at an unrelated crossed marker');
  const tap=createMarkerScrubber([40,80]);assert.equal(tap.step(70,0).turn,70,'A distant tap must not jump to an unrelated marker');
});
test('episode release slicing removes future events and catalog names while retaining the private source unchanged',()=>{
  const source=fixture(),original=JSON.stringify(source);
  const clipped=releaseThroughEpisodes(source,[{episode:'1',turn:0}]);
  assert.equal(clipped.lastTurn,0);assert.deepEqual(clipped.catalog,{wonders:[],religions:[]});
  assert.ok(clipped.events.every(e=>e.turn===0));assert.equal(JSON.stringify(source),original);
});
test('accepted recovered gaps preserve source facts while still clipping all future data',()=>{
  const source=fixture();source.events.splice(4,0,{turn:1,kind:'claim',owner:1,tiles:[20]});
  source.lastTurn=751;source.bookmarks=[{episode:'34',turn:595}];
  source.events.push({turn:596,kind:'claim',owner:0,tiles:[19]});
  assert.throws(()=>releaseThroughEpisodes(source,source.bookmarks),/Publication blocked/);
  const clipped=releaseThroughEpisodes(source,source.bookmarks,{acceptHistoricalGaps:true});
  assert.equal(clipped.lastTurn,595);assert.ok(clipped.events.every(e=>e.turn<=595));
  assert.equal(auditRelease(clipped).ok,false,'Accepted gaps remain visible in the private audit');
  const malformed=structuredClone(source);malformed.events[0].tiles=[99999];
  assert.throws(()=>releaseThroughEpisodes(malformed,source.bookmarks,{acceptHistoricalGaps:true}),/Invalid/);
});
test('official frames preserve city lifetimes, capture, razing and reverse seeking',()=>{
  const timeline=createTimeline(fixture());
  assert.equal(timeline.frame(2).cities[0].owner,1);
  assert.deepEqual(timeline.frame(2).cities[0].worldWonders,['Great Library']);
  assert.equal(timeline.frame(3).cities.length,0);
  assert.deepEqual(timeline.frame(4).cities[0].worldWonders,[]);
  assert.equal(timeline.frame(0).cities[0].owner,0);
  assert.equal(timeline.frame(0).cities[0].isCapital,true);
  assert.equal(timeline.frame(2).cities[0].isCapital,false,'A captured capital must not become the captor’s capital');
  assert.equal(timeline.frame(3).ruins[0].name,'Capital');
  assert.equal(timeline.frame(4).ruins.length,0,'Refounding clears former city ruins');
  assert.equal(timeline.frame(0).cities[0].size,undefined);
  assert.equal(timeline.frame(1).cities[0].religion,undefined,'holy city does not establish majority religion');
  assert.throws(()=>timeline.frame(5),/not been released/);
  assert.throws(()=>timeline.frame(-1),/not been released/);
  assert.equal(auditRelease(fixture()).ok,true);
});
test('unclaimed city centres become ruins at the turn boundary and stay destroyed until refounded',()=>{
  const release=fixture();release.catalog={wonders:[],religions:[]};
  const events=[
    {turn:0,kind:'found',owner:0,tiles:[20],city:1,name:'Old city'},
    {turn:0,kind:'claim',owner:0,tiles:[21]},
    {turn:1,kind:'capture',owner:1,tiles:[20]},
    {turn:2,kind:'claim',owner:-1,tiles:[20,21]},
    {turn:3,kind:'claim',owner:0,tiles:[20]},
    {turn:4,kind:'found',owner:0,tiles:[20],city:2,name:'New city'}
  ];
  const original=JSON.stringify(events);release.events=withCityDestructions(events);
  assert.equal(JSON.stringify(events),original,'Original records are preserved');
  assert.deepEqual(release.events.filter(e=>e.kind==='raze'),[{turn:2,kind:'raze',owner:1,tiles:[20]}]);
  assert.deepEqual(withCityDestructions(release.events),release.events,'Reconciliation is idempotent');
  const timeline=createTimeline(release);
  assert.equal(timeline.frame(1).cities[0].owner,1);
  assert.deepEqual(timeline.frame(2).ruins,[{index:20,name:'Old city',originalOwner:0,turn:2}]);
  assert.equal(timeline.frame(2).cities.length,0);
  assert.equal(timeline.frame(3).cities.length,0,'Land ownership cannot resurrect the city');
  assert.equal(timeline.frame(3).ruins.length,1);
  assert.equal(timeline.frame(4).ruins.length,0);assert.equal(timeline.frame(4).cities[0].name,'New city');
  assert.equal(timeline.frame(1).cities[0].name,'Old city','Backward seeking restores the earlier city');
  assert.equal(timelineSummary(timeline.frame(2),release).reduce((sum,row)=>sum+row.cities,0),0);
  assert.equal(timelineEvents(release,2,'cities')[0].text,'Old city: destroyed');
  assert.ok(!timelineEvents(release,1).some(e=>e.text.includes('destroyed')));
  assert.equal(auditRelease(release).ok,true);
});
test('same-turn reclaiming, captures and explicit destruction never produce extra ruins',()=>{
  const found={turn:0,kind:'found',owner:0,tiles:[20],city:1,name:'City'};
  const unclaim={turn:1,kind:'claim',owner:-1,tiles:[20]};
  for(const last of [{turn:1,kind:'claim',owner:0,tiles:[20]},
    {turn:1,kind:'capture',owner:1,tiles:[20]},
    {turn:1,kind:'found',owner:1,tiles:[20],city:2,name:'Replacement'}]){
    const events=[found,unclaim,last];assert.deepEqual(withCityDestructions(events),events);
  }
  const explicit=[found,unclaim,{turn:1,kind:'raze',owner:0,tiles:[20]}];
  assert.deepEqual(withCityDestructions(explicit),explicit);
  const unrelated=[found,{...unclaim,tiles:[21]},{turn:2,kind:'claim',owner:1,tiles:[20]}];
  assert.deepEqual(withCityDestructions(unrelated),unrelated,'An owner disagreement alone does not establish destruction');
});
test('release preparation reconciles missing removals without consulting future turns',()=>{
  const sha='a'.repeat(64),events=[
    {turn:0,type:1,tiles:[[1,1]],text:'City is founded.'},
    {turn:1,type:2,tiles:[[1,1]],text:'',civ:-1},
    {turn:2,type:1,tiles:[[1,1]],text:'Future city is founded.'}
  ].map((event,order)=>({civ:0,...event,order}));
  const extraction={format:'cbr-save-replay-extraction',version:1,source:{sha256:sha,turn:2},civilizations:{entries:[{name:'Japan'}]},
    extraction:{eventMessageVersion:2,eventCount:events.length,firstRecordedTurn:0,lastRecordedTurn:2},events};
  const base={width:180,height:94,mapTiles:[]};
  const config={history,sourceSha256:sha,endTurn:1,bookmarks:[{episode:'1',turn:1}]};
  const {release}=prepareRelease(extraction,base,[{name:'Japan'}],config);
  assert.deepEqual(release.events.at(-1),{turn:1,kind:'raze',owner:0,tiles:[181]});
  assert.equal(createTimeline(release).frame(1).cities.length,0);
  assert.doesNotMatch(JSON.stringify(release),/Future city/);
  assert.ok(release.events.every(event=>event.turn<=1));
  const opening=prepareRelease(extraction,base,[{name:'Japan'}],{...config,endTurn:0,bookmarks:[{episode:'1',turn:0}]}).release;
  assert.equal(createTimeline(opening).frame(0).cities.length,1);
});
test('release validator rejects metadata, future events/catalogs, invalid city identities and coordinates',()=>{
  for(const mutate of [
    r=>r.version=2,r=>r.format='raw-save',r=>r.source={turn:751},r=>r.events.push({turn:751,kind:'claim',owner:0,tiles:[1]}),
    r=>r.catalog.wonders.push('Unrevealed Wonder'),r=>r.events[0].tiles=[16920],
    r=>r.events[0].tiles=[20,20],r=>r.events[0].owner=63,
    r=>r.events[6].city=1,r=>r.bookmarks.push({episode:'99',turn:751}),
    r=>r.events[0].filename='secret-save.Civ5Save'
  ]){const release=fixture();mutate(release);assert.throws(()=>validateRelease(release));}
});
test('audit checks intermediate states, not just clean release endpoints',()=>{
  const release=fixture();release.events.splice(4,0,{turn:1,kind:'claim',owner:1,tiles:[20]});
  assert.equal(createTimeline(release).frame(4).warnings.length,0);
  assert.equal(auditRelease(release).ok,false);
});
test('community replay panel ranks cities first and resolves historical city names without future events',()=>{
  const release=fixture();
  const frame={cities:[{owner:0},{owner:0},{owner:1}],owners:new Int16Array([0,1,1,1,1])};
  assert.deepEqual(timelineSummary(frame,release).map(r=>[r.name,r.cities,r.tiles]),[['Japan',2,1],['Hyksos',1,4]]);
  assert.deepEqual(timelineEvents(release,2,'cities').map(e=>e.text),['Capital: Japan → Hyksos','Capital founded by Japan']);
  assert.equal(timelineEvents(release,3,'cities')[0].text,'Capital: destroyed');
  assert.equal(timelineEvents(release,4,'cities')[0].text,'New city founded by Hyksos');
  assert.ok(timelineEvents(release,0).every(e=>e.turn===0));
  assert.doesNotMatch(JSON.stringify(timelineEvents(release,0)),/Great Library|Pesedjet|New city/);
});
test('contributions cannot modify borders, known wonder locations or missing city lifetimes',()=>{
  const release=fixture(),frame=createTimeline(release).frame(1);
  const input={city:1,turn:1,field:'population',value:12,reference:'Episode 1, scene 3',expectedRevision:0};
  assert.equal(validateContribution(release,frame,input),input);
  const opening=createTimeline(release).frame(0);
  for(const [field,value] of [['religion','Pesedjet'],['wonders',['Great Library']]]) {
    assert.throws(()=>validateContribution(release,opening,{...input,turn:0,field,value}),
      /by this turn/,'Later released facts must not be attached to an earlier turn');
  }
  for(const edit of [{city:7},{field:'owner'},{value:0},{value:10001},{expectedRevision:-1},{turn:2},
    {field:'religion',value:'Unrevealed religion'},{field:'wonders',value:['Great Library']}]) {
    assert.throws(()=>validateContribution(release,frame,{...input,...edit}));
  }
  const rows=[{city_id:1,turn:1,field:'population',value:12,revision:2,author_name:'Reader'}];
  assert.equal(mergeContributions(frame,rows).cities[0].size,12);
  assert.equal(mergeContributions({...frame,turn:2},rows).cities[0].size,undefined);
  assert.equal(mergeContributions(createTimeline(release).frame(4),rows).cities[0].size,undefined);
  frame.cities[0].size=14;
  assert.equal(mergeContributions(frame,rows).cities[0].size,14,'verified values win');
  assert.equal(mergeContributions(frame,rows).cities[0].attribution.population,undefined);
});
test('message events preserve map states, are strictly validated, and are clipped at the episode boundary',()=>{
  const release=fixture(),before=createTimeline(release);
  release.events.splice(4,0,{turn:1,kind:'message',owner:-1,tiles:[],text:'Session 2 starts'});
  release.events.push({turn:4,kind:'message',owner:1,tiles:[20],text:'A later announcement'});
  assert.equal(validateRelease(release),release);
  const after=createTimeline(release);
  for(const turn of [4,0,2,1])assert.deepEqual(after.frame(turn),before.frame(turn));
  const bounded=releaseThroughEpisodes(release,[{episode:'1',turn:1}]);
  assert.match(JSON.stringify(bounded),/Session 2 starts/);
  assert.doesNotMatch(JSON.stringify(bounded),/later announcement/);
  for(const change of [{text:''},{text:42},{text:'x'.repeat(65537)},{turn:751},{tiles:[-1]},{owner:63},{name:'Unexpected'}]){
    const bad=structuredClone(release);Object.assign(bad.events[4],change);assert.throws(()=>validateRelease(bad));
  }
  const bad=fixture();bad.events[0].text='Unexpected';assert.throws(()=>validateRelease(bad));
});
test('all recorded message types survive export, including locationless notices and plural religion announcements',()=>{
  const sha='a'.repeat(64),base={width:180,height:94,mapTiles:[]};
  const events=[
    {type:1,tiles:[[1,1]],text:'Kyoto is founded.'},
    {type:0,tiles:[[-1,-1]],text:'Session 1 starts'},
    {type:6,tiles:[],text:'Japan has started worshipping a pantheon of gods.'},
    {type:5,tiles:[[1,1]],text:'The Japanese have founded the new religion Shinto in the holy city of Kyoto.'},
    {type:0,tiles:[[1,1]],text:'Leader completes An Unclassified Completion!'},
    {type:0,tiles:[],text:'An unfamiliar announcement'},
  ].map((e,order)=>({...e,turn:order,civ:0,order}));
  const extraction={format:'cbr-save-replay-extraction',version:1,source:{sha256:sha,turn:5},civilizations:{entries:[{name:'Japan'}]},
    extraction:{eventMessageVersion:2,eventCount:events.length,firstRecordedTurn:0,lastRecordedTurn:5},events};
  const {release,report}=prepareRelease(extraction,base,[{name:'Japan'}],{history,sourceSha256:sha,endTurn:5,bookmarks:[{episode:'1',turn:5}]});
  assert.equal(release.events.length,events.length);
  assert.deepEqual(release.events.slice(1).map(e=>e.text),events.slice(1).map(e=>e.text));
  assert.deepEqual(release.events[1].tiles,[]);
  assert.equal(release.events[3].kind,'holyCity');
  assert.deepEqual(release.catalog.religions,['Shinto']);
  assert.deepEqual(release.catalog.wonders,[]);
  assert.ok(report.issues.some(issue=>issue.includes('An Unclassified Completion')));
});
test('event browsing classifies messages, cleans game markup, and reaches every older match without future text',()=>{
  const release=fixture();
  const messages=[
    ['Leader declares war on Another Leader!','diplomacy'],
    ['Leader has made peace with Another Leader!','diplomacy'],
    ['Japan and Hyksos have signed a Research Agreement!','diplomacy'],
    ['A pantheon belief was chosen','religion'],
    ['Leader completes Sargon’s Palace!','completions'],
    ['The civilization has been destroyed!','other'],
    ['Kyoto was captured by Hyksos!!!','cities'],
    ['Session 2 starts','sessions'],
    ['Unfamiliar text must remain visible','other'],
  ];
  release.events.push(...messages.map(([text])=>({turn:4,kind:'message',owner:-1,tiles:[],text})),
    ...Array.from({length:110},(_,i)=>({turn:4,kind:'message',owner:-1,tiles:[],text:`Notice ${i}`})));
  const entries=timelineEventHistory(release);
  assert.ok(entries.some(e=>e.category==='claims'),'Claims remain in the recorded history');
  assert.ok(!eventCategories.some(([key])=>key==='claims'),'The claims filter is hidden');
  assert.ok(filterTimelineEvents(entries,4).every(e=>e.category!=='claims'),'All events excludes hidden claims');
  assert.equal(filterTimelineEvents(entries,4,'all','tile claim').length,0,'Search also hides claims');
  assert.ok(!eventCategories.some(([key])=>key==='sessions'),'The game sessions filter is hidden');
  assert.ok(filterTimelineEvents(entries,4).every(e=>e.category!=='sessions'),'All events excludes game sessions');
  assert.equal(filterTimelineEvents(entries,4,'all','Session 2').length,0,'Search also hides game sessions');
  for(const [text,category] of messages)assert.equal(entries.find(e=>e.text===text).category,category);
  assert.equal(filterTimelineEvents(entries,4,'diplomacy','leader peace').length,1);
  assert.equal(filterTimelineEvents(entries,4,'all','notice').length,110,'Older matching entries remain reachable');
  assert.equal(filterTimelineEvents(entries,4,'all','notice').slice(100).length,10);
  assert.equal(filterTimelineEvents(entries,3,'all','notice').length,0);
  assert.equal(filterTimelineEvents(entries,4,'all','Turn 4 unfamiliar')[0].text,'Unfamiliar text must remain visible');
  assert.equal(cleanEventText('[COLOR_POSITIVE_TEXT]+1 [ICON_PEACE] Faith[ENDCOLOR][NEWLINE]+2 [ICON_PRODUCTION] from Mines'),'+1 Faith\n+2 Production from Mines');
  assert.equal(cleanEventText('A [ICON_GOLDEN_AGE] Golden Age has begun!'),'A Golden Age has begun!');
  assert.equal(cleanEventText('Controls the most original [ICON_CAPITAL] Capitals.'),'Controls the most original Capitals.');
});
test('Golden Age messages name their recorded civilization and hide notices with no known owner',()=>{
  const release=fixture(),text='A [ICON_GOLDEN_AGE] Golden Age has begun for our Civilization!';
  release.civilizations.reverse(); // Owner IDs, not roster positions, identify the civilization.
  release.events.push(
    {turn:4,kind:'message',owner:0,tiles:[],text},
    {turn:4,kind:'message',owner:1,tiles:[],text},
    {turn:4,kind:'message',owner:-1,tiles:[],text}
  );
  const original=JSON.stringify(release),entries=timelineEventHistory(release);
  assert.deepEqual(filterTimelineEvents(entries,4,'milestones').map(e=>e.text),[
    'Hyksos has started a Golden Age.','Japan has started a Golden Age.'
  ]);
  assert.ok(filterTimelineEvents(entries,4,'all').every(e=>!e.text.includes('our Civilization')));
  assert.equal(filterTimelineEvents(entries,3,'milestones').length,0);
  assert.equal(filterTimelineEvents(entries,4,'milestones','Japan Golden Age').length,1);
  assert.equal(JSON.stringify(release),original,'Attribution is a display change only');
});
test('diplomacy and completions use civilization names without changing construction names or unknown participants',()=>{
  const release=fixture();
  release.civilizations.push({name:'The Onondaga',ownerId:17},{name:'The Susquehannock',ownerId:22},{name:'Bactria',ownerId:25},{name:'The Potiguara',ownerId:30});
  const messages=[
    [22,'Chieftain Old Sheehays declares war on Chieftain Tadodaho!','The Susquehannock declares war on The Onondaga!'],
    [17,'Chieftain Tadodaho has made peace with Old Sheehays Warlord!','The Onondaga has made peace with The Susquehannock!'],
    [17,'King Tadodaho has made peace with Sheik Demetrius!','The Onondaga has made peace with Bactria!'],
    [22,'King Old Sheehays declares war on Filipe Camarão Warlord!','The Susquehannock declares war on The Potiguara!'],
    [0,'A titled leader completes Temple of Toyotomi Hideyoshi!','Japan completes Temple of Toyotomi Hideyoshi!'],
    [-1,'King Tadodaho completes Great Library!','The Onondaga completes Great Library!'],
    [0,'Toyotomi Hideyoshi declares war on King Nobody!','Japan declares war on King Nobody!'],
    [-1,'Leader declares war on Another Leader!','Leader declares war on Another Leader!'],
    [-1,'Japan and Hyksos have signed a Research Agreement!','Japan and Hyksos have signed a Research Agreement!'],
    [0,'Capital (Toyotomi Hideyoshi) was captured by Hyksos!!!','Capital (Toyotomi Hideyoshi) was captured by Hyksos!!!']
  ];
  release.events.push(...messages.map(([owner,text])=>({turn:4,kind:'message',owner,tiles:[],text})));
  const original=JSON.stringify(release),entries=timelineEventHistory(release);
  const actual=new Map(entries.map(e=>[e.order,e.text]));
  messages.forEach(([,text,expected],i)=>assert.equal(actual.get(7+i),expected,text));
  assert.equal(filterTimelineEvents(entries,4,'diplomacy','Bactria').length,1);
  assert.equal(JSON.stringify(release),original);
});
test('exporter clips before parsing detail names and never copies future metadata',()=>{
  const base={width:180,height:94,mapTiles:[]},sha='a'.repeat(64);
  const extraction={format:'cbr-save-replay-extraction',version:1,source:{sha256:sha,turn:751,filename:'future-private'},
    civilizations:{entries:[{name:'Japan'}]},extraction:{eventMessageVersion:2,eventCount:3,firstRecordedTurn:0,lastRecordedTurn:751},
    events:[{turn:0,type:1,civ:0,order:0,tiles:[[1,1]],text:'Kyoto is founded.'},
      {turn:2,type:0,civ:0,order:1,tiles:[[1,1]],text:'Leader completes Manhattan Project!'},
      {turn:751,type:0,civ:0,order:2,tiles:[[1,1]],text:'Leader completes Secret Future Wonder!'}]};
  const config={history,sourceSha256:sha,endTurn:4,bookmarks:[{episode:'1',turn:4},{episode:'99',turn:751}],
    completions:{'Manhattan Project':'project'},branchVerified:true,checkpoints:[{turn:4,evidence:'checked',cityCounts:{0:1}}]};
  const {release,report}=prepareRelease(extraction,base,[{name:'Japan'}],config);
  assert.equal(report.ok,true);assert.equal(release.map.fingerprint,baseIdentity(base).fingerprint);
  assert.doesNotMatch(JSON.stringify(release),/Secret|751|private/);
  assert.equal(release.events[1].text,'Leader completes Manhattan Project!');
  assert.equal(release.events[1].kind,'message','A project announcement must not become a verified world wonder');
  assert.equal(release.details,undefined);assert.equal(release.version,1);
  assert.throws(()=>prepareRelease(extraction,base,[{name:'Japan'}],{...config,details:emptyDetails(history)}),/shared live layer/);
  config.branchVerified=false;assert.equal(prepareRelease(extraction,base,[{name:'Japan'}],config).report.ok,false);
});
test('official mode refuses legacy live loading and writes even when signed in as editor',async()=>{
  const context={officialSource:{},canEdit:true,localEditsEnabled:true,tileSaveQueue:new Map([['x',{}]])};
  assert.equal(mapAccessComputed.editAccessAllowed.call(context),false);
  assert.equal(mapLoadingMethods.usesLiveMap.call(context),false);
  assert.equal(await mapPersistenceMethods.loadTileOverrides.call(context),false);
  mapPersistenceMethods.subscribeToTileOverrides.call(context);
  await mapPersistenceMethods.flushTileSaves.call(context);
  assert.equal(context.tileSaveQueue.size,0);
});

// HTTP tests exercise authorization and release selection rather than mocking the handler.
async function server(release=fixture()){
  const id=await digest(release),draft=fixture();draft.lastTurn=5;draft.bookmarks=[{episode:'2',turn:5}];
  draft.events.push({turn:5,kind:'wonder',owner:1,tiles:[20],city:7,name:'Secret Future Wonder'});draft.catalog.wonders.push('Secret Future Wonder');
  const draftId=await digest(draft);
  const state={active:id,source:draftId,editorAllowed:false,detailRows:[],rows:[
    {id,history,first_turn:0,last_turn:4,bookmarks:release.bookmarks,published_at:'2026-01-01'},
    {id:draftId,history,first_turn:0,last_turn:5,bookmarks:draft.bookmarks,published_at:null}
  ],reads:[],writes:[],objects:new Map([[id,release],[draftId,draft]])};
  const db={
    auth:{getUser:async token=>({data:{user:token==='coiot'?{id:MAP_PUBLISHER_ID}:token==='reader'?{id:'reader',user_metadata:{username:'Coiot'}}:null},error:null})},
    storage:{from:()=>({download:async path=>{state.reads.push(path);return {data:new Blob([JSON.stringify(state.objects.get(path.replace('.json','')))]),error:null};},upload:async(path,blob)=>{state.objects.set(path.replace('.json',''),JSON.parse(await blob.text()));return {data:null,error:null};}})},
    from(table){
      const filters=[];let operation='read';let payload;
      const query={
        select(){return query;},eq(k,v){filters.push([k,v]);return query;},lte(k,v){filters.push([k,v,'lte']);return query;},gte(k,v){filters.push([k,v,'gte']);return query;},or(v){filters.push(['__or',v]);return query;},order(){return query;},range(){return query;},limit(){return query;},
        insert(p){operation='insert';payload=p;return query;},
        then(resolve){
          let data=table==='map_release_control'?[{map_id:'s5',active_release:state.active,source_release:state.source,enabled:!!state.active}]:
            table==='map_releases'?state.rows:table==='map_tile_details'?state.detailRows:[];
          data=data.filter(row=>filters.every(([k,v,op])=>k==='__or'?(row.to_turn>=Number(v.split(',')[0].split('.').at(-1))||row.field==='capital'):op==='lte'?row[k]<=v:op==='gte'?row[k]>=v:row[k]===v));
          if(operation==='insert'){state.writes.push(payload);if(table==='map_releases')state.rows.push({...payload,published_at:null});}
          return Promise.resolve({data,error:null}).then(resolve);
        },
        async single(){const result=await query;return {...result,data:result.data[0]};},
        async maybeSingle(){return query.single();}
      };return query;
    },
    rpc:async(name,args)=>{if(name==='can_edit_map_details')return {data:state.editorAllowed,error:null};state.writes.push({name,args});if(name==='set_map_timeline_source')state.source=args.p_source;if(name==='publish_map_episode'){if(state.active!==args.p_expected||state.source!==args.p_source)return {error:{message:'The timeline changed.'}};state.active=args.p_release;state.rows.find(r=>r.id===state.active).published_at='2026-10-20';}return {data:null,error:null};}
  };
  const handler=createMapReleaseHandler(db);
  const call=async(body,token='')=>{
    const response=await handler(new Request('https://example.test',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify(body)}));
    return {status:response.status,body:await response.json()};
  };
  return {state,call,id,draftId};
}
test('anonymous readers cannot retrieve drafts, forge Coiot, or publish by claiming localhost',async()=>{
  const {call,state,draftId}=await server();
  assert.equal((await call({action:'release',id:draftId})).status,404);
  assert.equal(state.reads.length,0);
  for(const action of ['draft','stage','publish','admin','timeline-admin','set-episode','history','hide','restore']){
    assert.equal((await call({action,id:draftId,localhost:true},'reader')).status,403);
    assert.equal((await call({action,id:draftId})).status,401);
  }
  assert.equal(state.writes.length,0);
  assert.equal((await call({action:'draft',id:draftId},'coiot')).status,200);
});
test('event-aware clients receive messages while existing clients retain their compatible bounded schema',async()=>{
  const release=fixture();release.events[2].text='Leader completes Great Library!';
  release.events.push({turn:4,kind:'message',owner:-1,tiles:[],text:'Session 2 starts'});
  const {call,draftId}=await server(release);
  for(const [action,token] of [['release',''],['timeline-admin','coiot']]){
    const legacy=await call({action},token),rich=await call({action,includeMessages:true},token);
    assert.equal(legacy.status,200);assert.equal(rich.status,200);
    assert.ok(legacy.body.release.events.every(e=>e.kind!=='message'&&!('text' in e)));
    assert.deepEqual(rich.body.release,release);
    assert.equal(validateRelease(legacy.body.release).lastTurn,4);
    assert.doesNotMatch(JSON.stringify(rich.body.release),/Secret Future Wonder/);
  }
  assert.equal((await call({action:'release',id:draftId,includeMessages:true})).status,404);
});
test('public statistics return only the requested published turn and never include the full history',async()=>{
  const release=fixture();release.statistics=statisticsFixture();
  const {call,state,id,draftId}=await server(release);
  for(const includeMessages of [false,true]){
    const publicRelease=await call({action:'release',includeMessages});assert.equal(publicRelease.status,200);
    assert.equal(publicRelease.body.release.statistics,undefined);
    assert.doesNotMatch(JSON.stringify(publicRelease.body),/FUTURE_RESEARCH|999/);
  }
  const admin=await call({action:'timeline-admin',includeMessages:true},'coiot');assert.equal(admin.body.release.statistics,undefined);
  const early=await call({action:'statistics',id,turn:1});assert.equal(early.status,200);
  assert.equal(early.body.turn,1);assert.equal(early.body.history,release.history);assert.equal(early.body.available,true);
  assert.deepEqual(early.body.rows[0].values,{score:2,research:'TECH_POTTERY'});
  assert.doesNotMatch(JSON.stringify(early.body),/FUTURE_RESEARCH|999/);
  const missing=await call({action:'statistics',turn:2});assert.equal(missing.body.rows[0].values.score,null);
  for(const turn of [5,751,-1,1.5,'1',null])assert.equal((await call({action:'statistics',turn,localhost:true},'coiot')).status,400);
  assert.equal((await call({action:'statistics',id:draftId,turn:1})).status,404);
  const row=state.rows.find(r=>r.id===id);row.last_turn=2;
  assert.equal((await call({action:'statistics',id,turn:4})).status,400,'The live published ceiling also bounds previously cached data');
});
test('Coiot receives only published history and publishing a past marker does not reveal later events',async()=>{
  const {call,state,id,draftId}=await server();
  const admin=await call({action:'timeline-admin'},'coiot');assert.equal(admin.status,200);assert.equal(admin.body.release.lastTurn,4);assert.equal(admin.body.sourceId,draftId);assert.doesNotMatch(JSON.stringify(admin.body.release),/Secret Future Wonder/);assert.ok(!state.reads.includes(`${draftId}.json`));
  const before=await call({action:'release',id});assert.doesNotMatch(JSON.stringify(before.body),/Secret Future Wonder/);
  const update=await call({action:'set-episode',sourceId:draftId,expected:id,marker:{episode:'0',turn:0}},'coiot');
  assert.equal(update.status,200);assert.equal(update.body.active.last_turn,4);
  const after=await call({action:'release',id:state.active});assert.equal(after.body.release.lastTurn,4);assert.doesNotMatch(JSON.stringify(after.body),/Secret Future Wonder/);
  assert.equal((await call({action:'release',id:draftId})).status,404);
});
test('an explicit new episode endpoint advances the public release and stale or out-of-source writes are rejected',async()=>{
  const {call,state,id,draftId}=await server();
  const input={action:'set-episode',sourceId:draftId,expected:id,marker:{episode:'2',turn:5}};
  assert.equal((await call({...input,marker:{episode:'2',turn:6}},'coiot')).status,400);
  assert.equal((await call({...input,expected:null},'coiot')).status,400);
  assert.equal((await call({...input,sourceId:id},'coiot')).status,400);
  assert.equal((await call(input,'coiot')).status,200);
  const published=await call({action:'release',id:state.active});assert.equal(published.body.release.lastTurn,5);
  assert.match(JSON.stringify(published.body),/Secret Future Wonder/);
  assert.equal((await call(input,'coiot')).status,400,'A second browser cannot overwrite a newer publication');
});
test('only source approval permits recovered gaps and the full source cannot be directly published',async()=>{
  const {call,state,id,draftId}=await server();
  const source=state.objects.get(draftId);source.events.splice(4,0,{turn:1,kind:'claim',owner:1,tiles:[20]});
  const sourceId=await digest(source);state.objects.set(sourceId,source);state.source=sourceId;
  const row={...state.rows[1],id:sourceId,event_gaps_accepted:false};state.rows.push(row);
  const endpoint={action:'set-episode',sourceId,expected:id,marker:{episode:'2',turn:5}};
  assert.equal((await call({...endpoint,acceptHistoricalGaps:true},'coiot')).status,400,'Request flags cannot override stored source approval');
  row.event_gaps_accepted=true;
  assert.equal((await call(endpoint,'coiot')).status,200);
  const privateSource=fixture();privateSource.lastTurn=751;privateSource.bookmarks=[{episode:'34',turn:595}];
  const privateId=await digest(privateSource);state.objects.set(privateId,privateSource);state.rows.push({id:privateId,event_gaps_accepted:true});
  const published=await call({action:'publish',id:privateId,endTurn:751,confirm:true,expected:state.active},'coiot');
  assert.equal(published.status,400);assert.match(published.body.error,/full private source/);
});
test('public API validates turn range and denies previously published releases above rolled-back cap',async()=>{
  const {call,state,id,draftId}=await server();
  assert.equal((await call({action:'release',id})).status,200);
  assert.equal((await call({action:'contributions',id,turn:751})).status,400);
  assert.equal((await call({action:'search',id,turn:751})).status,400);
  const search=await call({action:'search',id,turn:0});
  assert.equal(search.status,200);assert.equal(search.body.payload[0].payload.city.name,'Capital');
  assert.doesNotMatch(JSON.stringify(search.body),/New city/);
  state.rows[1].published_at='2026-02-01';
  assert.equal((await call({action:'release',id:draftId})).status,404);
  state.active=null;assert.equal((await call({action:'release',id})).status,404);
});
test('retired turn-specific contribution API cannot create another public layer',async()=>{
  const {call,id,state}=await server();
  const input={action:'contribute',id,turn:1,contribution:{city:1,turn:1,field:'population',value:12,reference:'',expectedRevision:0}};
  assert.equal((await call(input)).status,401);
  assert.equal((await call(input,'reader')).status,410);
  assert.equal((await call({action:'contributions',id,turn:1})).status,410);
  assert.equal(state.writes.length,0);
});

const detail=(field,value,extra={})=>({tile:20,city:['population','religion','wonders','capital','puppeted','occupied','resistance'].includes(field)?1:null,owner:['population','religion','wonders','capital','puppeted','occupied','resistance'].includes(field)?0:null,field,value,author:'Editor',reference:'',...extra});
test('one live layer is shared across turns and editing replaces the existing value',()=>{
  const timeline=createTimeline(fixture());let layer=emptyDetails(history);
  for(const r of [detail('population',14),detail('improvement','IMPROVEMENT_CITADEL'),detail('units',[{type:'UNIT_WORKER',owner:0,role:'civilian'}])])layer=putDetail(layer,r);
  for(const turn of [0,1]){const frame=mergeDetails(timeline.frame(turn),layer.records);assert.equal(frame.cities[0].size,14);assert.equal(frame.details[0].improvement,'IMPROVEMENT_CITADEL');assert.equal(frame.details[0].units.length,1);}
  layer=putDetail(layer,detail('improvement',null));assert.equal(layer.records.filter(r=>r.field==='improvement').length,1);
  for(const turn of [0,1,2,3,4])assert.equal(mergeDetails(timeline.frame(turn),layer.records).details[0].improvement,null);
  assert.equal(validateDetails(layer,history),layer);assert.throws(()=>validateDetails(layer,'wrong'));
  const duplicate={...layer,records:[...layer.records,detail('population',20)]};assert.throws(()=>validateDetails(duplicate,history),/one value/);
});
test('live details cannot replace game structure or leak city metadata after capture or refounding',()=>{
  const timeline=createTimeline(fixture()),records=[detail('population',14),detail('capital',true),detail('improvement','IMPROVEMENT_CITADEL')];
  const captured=mergeDetails(timeline.frame(2),records);assert.equal(captured.cities[0].size,undefined);assert.equal(captured.cities[0].isCapital,false);assert.equal(captured.details[0].improvement,'IMPROVEMENT_CITADEL');
  assert.equal(mergeDetails(timeline.frame(4),records).cities[0].size,undefined);
  const verified=timeline.frame(1);verified.cities[0].size=15;assert.equal(mergeDetails(verified,records).cities[0].size,15);
  for(const field of ['owner','terrain','city','name','river'])assert.throws(()=>validateDetail(detail(field,1)));
  for(const extra of [{fromTurn:1},{toTurn:4}])assert.throws(()=>validateDetail({...detail('notes','Test'),...extra}),/live map detail/);
  assert.throws(()=>validateDetails({format:'cbr-legacy-map-payload',payload:[]},history));
});
test('manual ruins never cover a recorded city and updates are not tied to a turn',()=>{
  const timeline=createTimeline(fixture()),records=[detail('ruins',true)];
  assert.equal(mergeDetails(timeline.frame(1),records).details.length,0);
  assert.equal(mergeDetails(timeline.frame(3),records).details[0].ruins,true);
  assert.equal(mergeDetails(timeline.frame(4),records).details.length,0);
});
test('live capital relocation selects one capital for the matching civilization',()=>{
  const r=fixture();r.events.splice(1,0,{turn:0,kind:'found',owner:0,tiles:[30],city:2,name:'Second'});
  const t=createTimeline(r),records=[detail('capital',true,{tile:30,city:2,owner:0})];
  for(const turn of [0,1]){const merged=mergeDetails(t.frame(turn),records);assert.equal(merged.cities.find(c=>c.id===1).isCapital,false);assert.equal(merged.cities.find(c=>c.id===2).isCapital,true);}
  let layer=putDetail(emptyDetails(history),records[0]);layer=putDetail(layer,detail('capital',true));
  assert.equal(layer.records.length,1);assert.equal(mergeDetails(t.frame(1),layer.records).cities.find(c=>c.id===1).isCapital,true);
});
test('ideology has one live value per civilization and wonders preserve recorded constructions',()=>{
  const r=fixture();r.events.splice(1,0,{turn:0,kind:'found',owner:0,tiles:[30],city:2,name:'Second'});
  const frame=createTimeline(r).frame(1),record=detail('ideology','Freedom',{city:null,owner:0});
  let layer=putDetail(emptyDetails(history),record);layer=putDetail(layer,{...record,tile:30,value:'Order'});assert.equal(layer.records.length,1);
  const merged=mergeDetails(frame,[...layer.records,detail('wonders',['Temple'])]);
  assert.ok(merged.cities.every(c=>c.ideology==='Order'));assert.deepEqual(merged.cities[0].worldWonders,['Great Library','Temple']);
  assert.deepEqual(mergeDetails(merged,[detail('wonders',[])]).cities[0].worldWonders,['Great Library']);
});
test('release packages cannot embed mutable editor layers or legacy hybrid imports',()=>{
  const r=fixture();r.details=emptyDetails(history);assert.throws(()=>validateRelease(r));
  r.version=2;assert.throws(()=>validateRelease(r));
});
test('editor API verifies access, city identity, published turns and rejects dated or structural edits',async()=>{
  const {call,state,id}=await server();const input={action:'edit-detail',id,turn:1,record:detail('population',14),expectedRevision:0};
  assert.equal((await call(input)).status,401);assert.equal((await call(input,'reader')).status,403);
  assert.equal(state.writes.length,0);state.editorAllowed=true;
  for(const record of [{...input.record,field:'owner'},{...input.record,fromTurn:1},{...input.record,city:7},{...input.record,owner:1}])assert.equal((await call({...input,record},'reader')).status,400);
  assert.equal((await call({...input,turn:751},'reader')).status,400);
  assert.equal((await call(input,'reader')).status,200);assert.equal(state.writes[0].name,'write_map_tile_detail');
  assert.equal(state.writes[0].args.p_actor,'reader');assert.equal(state.writes[0].args.p_turn,1);
});
test('live detail reads are shared across turns while rollback hides edits made beyond the published cap',async()=>{
  const {call,state,id}=await server();state.detailRows=[{history,observed_turn:1,record:detail('improvement','IMPROVEMENT_CITADEL'),revision:1},{history,observed_turn:751,record:detail('notes','Secret future'),revision:1}];
  const opening=await call({action:'details',id,turn:0}),later=await call({action:'details',id,turn:4});
  assert.equal(opening.status,200);assert.deepEqual(opening.body,later.body);assert.equal(opening.body.rows.length,1);
  assert.doesNotMatch(JSON.stringify(opening.body),/Secret|fromTurn|toTurn|751/);
  assert.equal((await call({action:'details',id,turn:751})).status,400);
});
test('population overlays colour complete observations and leave unknown civilizations uncoloured',()=>{
  const context={officialSource:{},isPopulationOverlayActive:true,babylonOwnerId:null,ownerLabel:id=>`Civ ${id}`,ownerIdForCity:t=>t.city?.owner,
    tiles:[{owner:0,terrainId:'grass',city:{owner:0,size:9}},{owner:0,terrainId:'grass',city:{owner:0}},{owner:1,terrainId:'grass',city:{owner:1,size:7}}]};
  assert.deepEqual(mapOverlaysComputed.recordedPopulationCoverage.call(context),{known:2,total:3});
  context.populationOverlayMetrics=mapOverlaysComputed.populationOverlayMetrics.call(context);
  assert.equal(context.populationOverlayMetrics.totalPopulation,16);assert.equal(context.populationOverlayMetrics.averageDensity,null);
  assert.deepEqual(context.populationOverlayMetrics.owners.map(o=>o.owner),[1]);
  context.populationDensityByOwner=mapOverlaysComputed.populationDensityByOwner.call(context);
  context.isWaterTile=()=>false;context.overlayDensityColor=()=> '#fff';
  assert.equal(mapRenderingMethods.populationOverlayStyle.call(context,context.tiles[0]).fillOpacity,0);
  assert.ok(mapRenderingMethods.populationOverlayStyle.call(context,context.tiles[2]).fillOpacity>0);
  context.tiles[1].city.size=5;assert.equal(mapOverlaysComputed.populationOverlayMetrics.call(context).owners.length,2);
});
test('religion overlays use recorded capital majorities, never holy-city status or missing values',()=>{
  const context={officialSource:{},isOverlayTabActive:true,overlayView:'religion',religionOverlayPresetByKey:{},ownerIdForCity:t=>t.city?.owner,
    tiles:[{owner:0,city:{owner:0,isCapital:true,holyReligions:['Shinto']}},{owner:1,city:{owner:1,isCapital:true,religion:'Shinto',name:'Capital'}}]};
  assert.equal(mapOverlaysComputed.isReligionOverlayActive.call(context),true);
  const result=mapOverlaysComputed.religionOverlayByOwner.call(context);assert.equal(result[0],undefined);assert.equal(result[1].religion,'Shinto');
});
function nativeTile(frame){const city=JSON.parse(JSON.stringify(frame.cities[0]));return {key:'20,93',owner:city.owner,originalOwner:city.originalOwner,city,improvement:null,route:null,pillaged:false,ruins:false,notes:null,combatUnit:null,civilianUnit:null};}
test('historical editors cannot change population or religion even through old controls',()=>{
  const frame=createTimeline(fixture()).frame(1),tile=nativeTile(frame),emitted=[];
  const context={officialSource:{frame},detailEditing:true,selectedTile:tile,editCityValue:14,editCityReligion:'Other',ensureEditAccess:()=>true,useTerrainCanvas:false,
    queueTileSave:t=>mapPersistenceMethods.queueTileSave.call(context,t),$emit:(event,records)=>emitted.push({event,records}),invalidateTooltipCache:()=>{}};
  mapEditingMethods.applyCityEdit.call(context);mapEditingMethods.applyCityReligionEdit.call(context);
  assert.equal(tile.city.size,undefined);assert.equal(tile.city.religion,undefined);assert.deepEqual(emitted,[]);
});
test('native historical editing refuses owner, founder, city placement and rename changes',()=>{
  const frame=createTimeline(fixture()).frame(1),tile=nativeTile(frame),before=JSON.stringify(tile);
  const context={officialSource:{frame},selectedTile:tile,ensureEditAccess:()=>true,editOwnerName:'Hyksos',editCityName:'Wrong',editOriginalOwnerName:'Hyksos'};
  for(const name of ['applyOwnerEdit','clearOwnerEdit','applyOriginalOwnerEdit','clearOriginalOwnerEdit','applyCityNameEdit','clearCityNameEdit','clearCityEdit','toggleOwnerBrush'])mapEditingMethods[name].call(context);
  assert.equal(JSON.stringify(tile),before);
  for(const mutate of [t=>t.owner=1,t=>t.city=null,t=>t.city.name='Wrong',t=>t.originalOwner=1]){const changed=nativeTile(frame);mutate(changed);assert.throws(()=>nativeDetailEdits(changed,frame),/history/);}
  assert.equal(mapAccessComputed.editAccessAllowed.call({officialSource:{},detailEditing:true}),true);
  assert.equal(mapAccessComputed.editAccessAllowed.call({officialSource:{},detailEditing:false,canEdit:true}),false);
});
test('native unit edits preserve additional stacked units and city status controls round-trip',()=>{
  const frame=createTimeline(fixture()).frame(1);frame.details=[{index:20,units:[{type:'UNIT_INFANTRY',owner:0,role:'combat'},{type:'UNIT_ARCHER',owner:0,role:'combat'},{type:'UNIT_WORKER',owner:0,role:'civilian'}]}];
  const tile=nativeTile(frame);tile.combatUnit={type:'UNIT_RIFLEMAN',owner:0};tile.civilianUnit={type:'UNIT_WORKER',owner:0};tile.city.isPuppeted=true;
  const records=nativeDetailEdits(tile,frame),units=records.find(r=>r.field==='units').value;
  assert.equal(units.length,3);assert.equal(units[1].type,'UNIT_ARCHER');assert.equal(units[2].type,'UNIT_WORKER');
  assert.equal(mergeDetails(frame,records).cities[0].isPuppeted,true);
  assert.equal(mapRenderingMethods.describeCity({name:'Capital'}),'Capital');
  assert.equal(mapRenderingMethods.describeCity({name:'Capital',size:12,isCapital:true}),'Capital • Capital');
});
