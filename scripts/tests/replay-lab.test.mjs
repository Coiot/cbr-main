import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCiv5Replay, MAX_REPLAY_BYTES } from '../../src/.vuepress/theme/components/community/replay/replayParser.mjs';
import { mapCivilizations, reconstructFrame, frameSummary, cityEventLabels, baseIdentity, validateReplayMap, exportReplaySnapshot, readReplaySnapshot } from '../../src/.vuepress/theme/components/community/replay/replayModel.mjs';

const owners = [{name:'Anishinaabe'},{name:'Babylon'}];
const base = {width:3,height:2,mapTiles:Array.from({length:6},()=>({terrainType:0}))};
function fixture({customHeader=false,events=[
  {turn:0,type:1,tiles:[[0,0]],civ:0,text:'First city is founded.'},
  {turn:1,type:2,tiles:[[0,0],[1,0]],civ:0},
  {turn:2,type:3,tiles:[[0,0]],civ:1},
  {turn:3,type:4,tiles:[[0,0]],civ:1},
]}={}) {
  const chunks=[];
  const int=value=>{const b=Buffer.alloc(4);b.writeInt32LE(value);chunks.push(b);};
  const short=value=>{const b=Buffer.alloc(2);b.writeInt16LE(value);chunks.push(b);};
  const bytes=count=>chunks.push(Buffer.alloc(count));
  const string=value=>{const b=Buffer.from(value);int(b.length);chunks.push(b);};
  chunks.push(Buffer.from('CIV5'));int(1);string('1.0.3.279');string('403694');bytes(5);
  for(const s of ['BABYLON','DEITY','ANCIENT','ANCIENT','STANDARD','HUGE','C:\\Maps\\CBRXMapOct62025_V2.Civ5Map'])string(s);
  int(0);int(0);string('');string('');string('BABYLON');bytes(8);string('');
  if(customHeader)string('C:\\Maps\\CBRXMapOct62025_V2.Civ5Map');
  for(const n of [5,0,1,0,2,3,7,9,15,1,2,-1,1])int(n);
  int(0);int(-4000);int(3);string('100 AD');int(0);int(28);
  int(2);for(const civ of owners){bytes(16);for(const s of ['Leader',civ.name,civ.name,'Demonym'])string(s);}
  int(1);string('REPLAYDATASET_CITYCOUNT');int(2);
  for(let p=0;p<2;p++){int(1);int(1);int(3);int(0);}
  int(2);int(events.length);
  for(const event of events){int(event.turn);int(event.type);int(event.tiles.length);for(const [x,y]of event.tiles){short(x);short(y);}int(event.civ);string(event.text||'');}
  int(3);int(2);int(6);for(let i=0;i<6;i++){int(1);int(3);chunks.push(Buffer.from([2,0,255,0]));}
  const result=Buffer.concat(chunks);return result.buffer.slice(result.byteOffset,result.byteOffset+result.byteLength);
}
test('replay parser reads standard and modded headers without fixed offsets',()=>{
  for(const customHeader of [false,true]){
    const replay=parseCiv5Replay(fixture({customHeader}));
    assert.equal(replay.width,3);assert.equal(replay.height,2);assert.equal(replay.events.length,4);
    assert.equal(replay.meta.endTurn,3);assert.equal(replay.meta.mapScript,'CBRXMapOct62025_V2.Civ5Map');
    assert.deepEqual(replay.recordedCityCounts,[0,0]);assert.equal(replay.terrain[0].feature,-1);
    assert.match(replay.sourceFingerprint,/^fnv1a32:/);assert.ok(!JSON.stringify(replay).includes('C:\\Maps'));
  }
});
test('replay parser rejects malformed counts, truncated files, trailing bytes and invalid coordinates',()=>{
  const valid=fixture();
  assert.throws(()=>parseCiv5Replay(valid.slice(0,-1)));
  const trailing=new Uint8Array(valid.byteLength+1);trailing.set(new Uint8Array(valid));assert.throws(()=>parseCiv5Replay(trailing.buffer));
  const corrupted=valid.slice(0);new DataView(corrupted).setInt32(8,0x7fffffff,true);assert.throws(()=>parseCiv5Replay(corrupted));
  assert.throws(()=>parseCiv5Replay(new ArrayBuffer(MAX_REPLAY_BYTES+1)),/50 MB/);
  assert.throws(()=>parseCiv5Replay(fixture({events:[{turn:0,type:1,tiles:[[3,0]],civ:0}]})));
  assert.throws(()=>parseCiv5Replay(fixture({events:[{turn:0,type:2,tiles:[[0,0]],civ:9}]})));
  const message=parseCiv5Replay(fixture({events:[{turn:0,type:0,tiles:[[-1,-1]],civ:-1,text:'Session begins'}]}));
  assert.equal(message.events.length,1);
});
test('replay reconstruction handles founding, claims, capture, razing and reverse seeks',()=>{
  const replay=parseCiv5Replay(fixture()),mapping=mapCivilizations(replay.civs,owners);
  const first=reconstructFrame(replay,mapping,0);assert.equal(first.cities[0].name,'First city');assert.equal(first.cities[0].originalOwner,0);
  assert.deepEqual(Array.from(first.owners),[0,-1,-1,-1,-1,-1]);
  const capture=reconstructFrame(replay,mapping,2);assert.equal(capture.cities[0].owner,1);assert.equal(capture.cities[0].originalOwner,0);
  assert.equal(capture.owners[0],1);assert.equal(capture.owners[1],0);
  assert.equal(reconstructFrame(replay,mapping,3).cities.length,0);
  assert.deepEqual(reconstructFrame(replay,mapping,0),first);
  assert.equal(first.cities[0].owner,0);assert.equal(replay.events[0].civ,0);
  assert.throws(()=>reconstructFrame(replay,mapping,4));
  assert.deepEqual(frameSummary(capture,mapping).map(row=>[row.label,row.cities,row.tiles]),[['Babylon',1,1],['Anishinaabe',0,1]]);
});
test('neutral claims and multiple-city transfers use event order and retain original owners',()=>{
  const replay=parseCiv5Replay(fixture({events:[
    {turn:0,type:1,tiles:[[0,0]],civ:0,text:'Alpha is founded.'},
    {turn:0,type:1,tiles:[[1,0]],civ:0,text:'Beta is founded.'},
    {turn:1,type:3,tiles:[[0,0],[1,0]],civ:1},
    {turn:2,type:2,tiles:[[2,1]],civ:0},
    {turn:3,type:2,tiles:[[2,1]],civ:-1},
  ]}));
  const frame=reconstructFrame(replay,mapCivilizations(replay.civs,owners),3);
  assert.deepEqual(frame.cities.map(c=>[c.owner,c.originalOwner]),[[1,0],[1,0]]);assert.equal(frame.owners[5],-1);
});
test('turn labels describe the end of the selected turn, including its last event and excluding the next turn',()=>{
  const replay=parseCiv5Replay(fixture({events:[
    {turn:0,type:1,tiles:[[0,0]],civ:0,text:'Alpha is founded.'},
    {turn:1,type:3,tiles:[[0,0]],civ:1},
    {turn:1,type:3,tiles:[[0,0]],civ:0},
    {turn:2,type:4,tiles:[[0,0]],civ:0},
  ]})),mapping=mapCivilizations(replay.civs,owners);
  assert.equal(reconstructFrame(replay,mapping,1).cities[0].owner,0);
  assert.equal(reconstructFrame(replay,mapping,1).cities.length,1);
  assert.equal(reconstructFrame(replay,mapping,2).cities.length,0);
});
test('Season 5 roster aliases map names instead of player IDs; incompatible maps fail',()=>{
  assert.deepEqual(mapCivilizations([{name:'The Hansa'},{name:'Bjarmia'},{name:'Babylon'}],[{name:'Bjarmians'},{name:'Babylon'},{name:'Hanseatic League'}]).map(c=>c.ownerId),[2,0,1]);
  assert.throws(()=>mapCivilizations([{name:'Unknown'}],owners),/Cannot match/);
  assert.throws(()=>mapCivilizations([{name:'Babylon'},{name:'Babylon'}],owners),/Cannot match/);
  const replay=parseCiv5Replay(fixture());assert.deepEqual(validateReplayMap(replay,base),[]);
  replay.terrain[0].terrain=1;assert.match(validateReplayMap(replay,base)[0],/1 terrain tiles/);
  assert.throws(()=>validateReplayMap({...replay,width:4},base),/does not use/);
});
test('city event labels identify each city and follow same-turn transfers without leaking later names',()=>{
  const replay=parseCiv5Replay(fixture({events:[
    {turn:0,type:1,tiles:[[0,0]],civ:0,text:'Alpha is founded.'},
    {turn:0,type:1,tiles:[[1,0]],civ:0,text:'Beta is founded.'},
    {turn:1,type:3,tiles:[[0,0],[1,0]],civ:1},
    {turn:1,type:3,tiles:[[0,0]],civ:0},
    {turn:2,type:4,tiles:[[0,0]],civ:0},
    {turn:3,type:1,tiles:[[0,0]],civ:1,text:'New city is founded.'},
    {turn:3,type:3,tiles:[[0,0]],civ:0},
    {turn:3,type:3,tiles:[[2,1]],civ:1},
  ]})),labels=cityEventLabels(replay,mapCivilizations(replay.civs,owners));
  assert.equal(labels.get(2),'Alpha: Anishinaabe → Babylon; Beta: Anishinaabe → Babylon');
  assert.equal(labels.get(3),'Alpha: Babylon → Anishinaabe');
  assert.equal(labels.get(4),'Alpha: razed (Anishinaabe)');
  assert.equal(labels.get(6),'New city: Babylon → Anishinaabe');
  assert.equal(labels.get(7),'City at tile 2,0: ownership recorded for Babylon');
  assert.doesNotMatch(labels.get(2),/New city/);
  assert.equal(replay.events[0].text,'Alpha is founded.');
});
test('local snapshots round trip complete state and exclude private/source paths and fabricated population',()=>{
  const replay=parseCiv5Replay(fixture()),mapping=mapCivilizations(replay.civs,owners),map=baseIdentity(base);
  const frame=reconstructFrame(replay,mapping,2),session={...replay,meta:replay.meta,mapping,warnings:[],email:'private@example.test',sourcePath:'/private/file'};
  const exported=exportReplaySnapshot(session,frame,map),json=JSON.stringify(exported);
  assert.ok(!json.includes('private@example.test'));assert.ok(!json.includes('/private/file'));assert.ok(exported.frame.cities.every(city=>!('size' in city)&&!('population' in city)));
  const restored=readReplaySnapshot(JSON.parse(json),map,owners);assert.deepEqual(restored.frame,frame);assert.equal(restored.kind,'snapshot');
  for(const mutate of [s=>s.version=2,s=>s.map.fingerprint='wrong',s=>s.sourceFingerprint='/private/source',s=>s.civilizations[0].ownerId=1,s=>s.frame.owners.pop(),s=>s.frame.owners[0]=99,s=>s.frame.cities[0].owner=99,s=>s.frame.cities.push(s.frame.cities[0]),s=>s.frame.turn=99]){
    const bad=JSON.parse(json);mutate(bad);assert.throws(()=>readReplaySnapshot(bad,map,owners));
  }
  assert.throws(()=>readReplaySnapshot(exported,map,[...owners].reverse()),/different civilization mapping/);
});

test('recovered save histories retain their own events through T751 and support reverse seeking',async()=>{
  const { readReplayExtraction, EXTRACTION_FORMAT } = await import('../../src/.vuepress/theme/components/community/replay/replayExtraction.mjs');
  const input={format:EXTRACTION_FORMAT,version:1,source:{turn:751,sha256:'a'.repeat(64),path:'/private/original-save'},
    extraction:{eventMessageVersion:2,eventCount:4,firstRecordedTurn:0,lastRecordedTurn:751},
    civilizations:{entries:owners},warnings:['Recovered city counts need review.'],events:[
      {turn:0,type:1,civ:0,order:0,text:'Alpha is founded.',tiles:[[0,0]]},
      {turn:166,type:3,civ:1,order:1,text:'',tiles:[[0,0]]},
      {turn:750,type:1,civ:0,order:2,text:'Beta is founded.',tiles:[[2,1]]},
      {turn:751,type:0,civ:-1,order:3,text:'Session begins',tiles:[[-1,-1]]},
    ]};
  const replay=readReplayExtraction(input,base,owners),mapping=mapCivilizations(replay.civs,owners);
  assert.equal(replay.recovered,true);assert.equal(replay.meta.endTurn,751);assert.equal(replay.events.length,4);
  assert.equal(reconstructFrame(replay,mapping,751).cities.length,2);
  assert.equal(reconstructFrame(replay,mapping,165).cities[0].owner,0);
  assert.equal(reconstructFrame(replay,mapping,166).cities[0].owner,1);
  assert.equal(reconstructFrame(replay,mapping,0).cities.length,1);
  assert.deepEqual(replay.recordedCityCounts,[]);assert.ok(replay.warnings.some(v=>v.includes('need review')));
  assert.ok(!JSON.stringify(replay).includes('/private/original-save'));
  for(const mutate of [s=>s.version=2,s=>s.source.turn=750,s=>s.source.sha256='bad',s=>s.extraction.eventCount=3,s=>s.extraction.lastRecordedTurn=750,s=>s.events[2].order=0,s=>s.events[1].civ=99,s=>s.events[2].tiles=[[3,0]],s=>s.events[2].tiles=[[-1,-1]],s=>s.civilizations.entries[0].name='Unknown']){
    const bad=structuredClone(input);mutate(bad);assert.throws(()=>readReplayExtraction(bad,base,owners),mutate.toString());
  }
});

test('conflicting city records remain viewable but cannot export an invalid frozen snapshot',async()=>{
  const { replaySnapshotIssue } = await import('../../src/.vuepress/theme/components/community/replay/replayModel.mjs');
  const replay=parseCiv5Replay(fixture({events:[
    {turn:0,type:1,tiles:[[0,0]],civ:0,text:'Alpha is founded.'},
    {turn:1,type:2,tiles:[[0,0]],civ:1},
  ]}));
  const mapping=mapCivilizations(replay.civs,owners),frame=reconstructFrame(replay,mapping,1);
  assert.equal(frame.cities.length,1);assert.equal(frame.cities[0].owner,0);assert.equal(frame.owners[0],1);
  assert.match(frame.warnings[0],/1 recorded city locations disagree/);
  assert.match(replaySnapshotIssue(frame),/still explore the timeline/);
  assert.throws(()=>exportReplaySnapshot({meta:replay.meta,mapping,warnings:[]},frame,baseIdentity(base)),/city records conflict/);
  assert.equal(replaySnapshotIssue(reconstructFrame(replay,mapping,0)),'');
});
