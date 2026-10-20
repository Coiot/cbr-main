import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blankCollection, normalizeCollection, collectionScenes, moveScene, sceneKey, collectionLink, buildCollectionAlbums, validCollectionPath } from '../../src/.vuepress/theme/components/collections/collectionModel.mjs';
import { changeCollection, getCollection, listCollections } from '../../src/.vuepress/theme/components/collections/collectionApi.mjs';
const id='00000000-0000-4000-8000-000000000001';
const first={path:'/albums/s5/Episode1/',number:1,note:'First note'},later={path:'/albums/s5/Episode34/',number:2,note:'Later spoiler'};
test('collections normalize only intended fields and reject duplicates, unsafe references and oversized drafts',()=>{
 const draft=normalizeCollection({...blankCollection(),title:'  Japan  ',scenes:[first],user_id:'private',published:false,featured:true});
 assert.deepEqual(draft,{title:'Japan',description:'',scenes:[first],published:false,featured:false});
 for(const change of [{title:''},{title:'x'.repeat(81)},{description:'x'.repeat(601)},{scenes:[first,{...first,number:'1'}]},{scenes:[{...first,path:'https://evil.test/'}]},{scenes:[{...first,number:1.5}]},{scenes:[{...first,note:'x'.repeat(401)}]},{scenes:Array.from({length:101},(_,i)=>({...first,number:i+1}))}])assert.throws(()=>normalizeCollection({title:'Test',...change}));
});
test('curation preserves scene order, filters spoiler notes with scenes, and drops unavailable references',()=>{
 const episodes=[{path:first.path,season:'s5',number:1,title:'First',scenes:[{number:1,title:'Opening'}]},{path:later.path,season:'s5',number:34,title:'Later',scenes:[{number:2,title:'Surprise'}]}];
 const selection=[later,first,{...first,number:999}];
 assert.deepEqual(collectionScenes(episodes,selection).map(s=>s.note),['Later spoiler','First note']);
 const limited=collectionScenes(episodes,selection,'s5','1');assert.equal(limited.length,1);assert.equal(limited[0].note,'First note');assert.equal(JSON.stringify(limited).includes('Later spoiler'),false);
 assert.equal(collectionScenes(episodes,selection,'s4','all').length,0);
 const reordered=moveScene(selection,0,1);assert.deepEqual(reordered.slice(0,2),[first,later]);assert.equal(selection[0],later);
 for(const [from,to] of [[-1,0],[0,99],[0,null],[0,1.5]])assert.equal(moveScene(selection,from,to),selection);
 assert.equal(sceneKey(first),'/albums/s5/Episode1/#scene-1');
});
test('public collection requests never read owner tables; invalid IDs do not query',async()=>{
 const calls=[];const client={rpc:async(name,args)=>{calls.push({name,args});return {data:{entries:[]}};}};
 assert.equal(await getCollection(client,'unsafe'),null);assert.equal(calls.length,0);
 await listCollections(client,{search:'  Japan ',offset:24,showcase:id});
 assert.deepEqual(calls,[{name:'list_scene_collections',args:{p_search:'Japan',p_offset:24,p_showcase:id}}]);
 assert.equal(collectionLink(id,true),`/collections/?id=${id}&edit=1`);assert.equal(collectionLink('bad'),'/collections/');
});
test('atomic additions do not send an old scene array; saves send revision and report conflicts',async()=>{
 const calls=[];const client={rpc:async(name,args)=>{calls.push({name,args});return {data:{id}};}};
 await changeCollection(client,'add',{id,revision:2},{title:'Test'},[first]);
 assert.deepEqual(calls[0].args,{p_action:'add',p_id:id,p_revision:2,p_draft:{title:'Test'},p_scenes:[first]});
 await changeCollection(client,'private',{id,revision:2});assert.equal(calls[1].args.p_action,'private');assert.deepEqual(calls[1].args.p_scenes,[]);
 const failed=code=>({rpc:async()=>({error:{code,message:'database private details'}})});
 await assert.rejects(changeCollection(failed('40001'),'save',{id,revision:1},{title:'Test'}),/changed in another tab/);
 await assert.rejects(changeCollection(failed('42501'),'add',{id},{},[first]),/current supporter access/);
 await assert.rejects(listCollections(failed('XX000')),error=>!error.message.includes('private details'));
});

import { createCollectionStore } from '../../src/.vuepress/theme/components/collections/collectionStore.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function storeFixture(){
 let session,reads=0,subscriptions=0,stops=0;const pending=[];const doc=new EventTarget(),win=new EventTarget();
 const client={from:()=>({select(){return this;},eq(){return this;},order(){reads++;const d=deferred();pending.push(d);return d.promise;}}),rpc:async()=>({data:{id,title:'Saved',scenes:[first],revision:2}})};
 const store=createCollectionStore(client,{sync:{refreshSupporter:async()=>({allowed:true,data:{status:'active'}})},subscribe:(_client,callback)=>{subscriptions++;session=callback;return {unsubscribe(){stops++;}};},documentTarget:doc,windowTarget:win});
 return {store,client,pending,doc,win,signIn:user=>session(user?{user:{id:user}}:null),counts:()=>({reads,subscriptions,stops})};
}
test('hundreds of scene controls share account loading and clear private data on sign-out',async()=>{
 const f=storeFixture(),releases=Array.from({length:100},()=>f.store.retain());f.signIn('owner');
 assert.deepEqual(f.counts(),{reads:1,subscriptions:1,stops:0});
 f.pending[0].resolve({data:[{id,title:'Private',scenes:[first]}]});await f.store.refresh();
 assert.equal(f.store.state.memberships.get(sceneKey(first)).has(id),true);
 f.signIn(null);assert.equal(f.store.state.rows.length,0);assert.equal(f.store.state.memberships.size,0);assert.equal(f.store.state.allowed,false);
 releases.forEach(stop=>stop());assert.equal(f.counts().stops,1);
});
test('old account and pre-save reads cannot overwrite current collection state',async()=>{
 const f=storeFixture(),release=f.store.retain();f.signIn('old');const old=f.store.refresh();f.signIn('new');const next=f.store.refresh();
 f.pending[1].resolve({data:[{id,title:'New account',scenes:[],revision:1}]});await next;
 f.pending[0].resolve({data:[{id,title:'Old private data',scenes:[first]}]});await old;assert.equal(f.store.state.rows[0].title,'New account');
 const refresh=f.store.refresh();await f.store.change('add',{id},{},[first]);
 f.pending[2].resolve({data:[{id,title:'Stale read',scenes:[],revision:1}]});await refresh;
 assert.equal(f.store.state.rows[0].title,'Saved');assert.equal(f.store.state.rows[0].revision,2);release();
});
test('late writes cannot disclose a previous account’s collection',async()=>{
 const f=storeFixture(),release=f.store.retain();f.signIn('owner');f.pending[0].resolve({data:[]});await f.store.refresh();
 const response=deferred();f.client.rpc=()=>response.promise;const writing=f.store.change('add',null,{title:'New'},[first]);await Promise.resolve();f.signIn(null);
 response.resolve({data:{id,title:'Private',scenes:[first]}});await assert.rejects(writing,/account changed/);assert.equal(f.store.state.rows.length,0);release();
});

import { hyksosCollection } from '../collections/hyksos.mjs';
import { sceneAlbumLabel, buildEpisodes } from '../../src/.vuepress/theme/components/spotlight/spotlightModel.mjs';
test('collection catalog supports rankings zero, respects releases, and leaves Spotlight episode-only',()=>{
 const catalog=[{path:first.path,title:'Episode',date:'2026-01-01'},
  {path:'/albums/pr/s5pr0/',pr:'S5',title:'Opening rankings',date:'2026-01-01'},
  {path:'/albums/pr/s5pr1/',pr:'S5',title:'Rankings 1',date:'2026-02-01'},
  {path:'/albums/pr/s5pr2/',pr:'S5',exclude:true},
  {path:'/albums/pr/s5pr3/',pr:'S5',date:'2099-01-01'},
  {path:'/albums/pr/s5pr4/',pr:'S5'}];
 const index=catalog.slice(0,-1).map(a=>({path:a.path,scenes:[{number:1,title:'Hyksos'}]}));
 const albums=buildCollectionAlbums(catalog,index,Date.parse('2026-10-19'));
 assert.equal(albums.length,3); assert.equal(buildEpisodes(catalog,index).length,1);
 const selections=[{path:'/albums/pr/s5pr0/',number:1,note:'Opening'}, {path:'/albums/pr/s5pr1/',number:1,note:'Later'}];
 assert.deepEqual(normalizeCollection({title:'PR',scenes:selections}).scenes,selections);
 const cards=collectionScenes(albums,selections,'s5','0'); assert.equal(cards.length,1);
 assert.equal(cards[0].note,'Opening'); assert.equal(cards[0].to,'/albums/pr/s5pr0/#scene-1');
 assert.equal(sceneAlbumLabel(cards[0]),'Power Rankings 0');
 assert.equal(sceneAlbumLabel({path:first.path,episodeNumber:1}),'Episode 1');
 for(const path of ['/albums/pr/not-an-album/','/albums/pr/s5pr1/../../','https://evil.test/','/albums/pr/s5pr-1/']) assert.equal(validCollectionPath(path),false);
});
test('Hyksos seed selects all 33 exact titles in ranking order, including opening predictions',()=>{
 const draft=hyksosCollection('src/albums/pr',Date.parse('2026-10-19'));
 assert.equal(draft.published,true); assert.equal(draft.scenes.length,33);
 assert.deepEqual(draft.scenes.map(s=>s.path),Array.from({length:33},(_,i)=>`/albums/pr/s5pr${i}/`));
 assert.equal(draft.scenes[0].number,6); assert.equal(draft.scenes.at(-1).number,6);
 assert.ok(draft.scenes.every(s=>s.note===''));
});

import { collectionEntries, createCollectionSceneLoader, entryNumberFromHash, readingMode, retainedEntryIndex } from '../../src/.vuepress/theme/components/collections/collectionReading.mjs';
test('collection entry links retain original positions and notes stay behind spoiler filters',()=>{
 const albums=[{path:first.path,season:'s5',number:1,scenes:[{number:1,title:'Opening'}]},{path:later.path,season:'s5',number:34,scenes:[{number:2,title:'Later'}]}];
 const cards=collectionEntries(albums,[later,first],'s5','1');
 assert.equal(cards.length,1); assert.equal(cards[0].entryNumber,2); assert.equal(cards[0].note,'First note');
 assert.equal(JSON.stringify(cards).includes('Later spoiler'),false);
 assert.equal(retainedEntryIndex(cards,later.path,'#entry-1'),0);
 const all=collectionEntries(albums,[later,first]);
 assert.equal(retainedEntryIndex(all,all[1].id),1); assert.equal(retainedEntryIndex(all,null,'#entry-2'),1);
 for(const hash of ['#entry-0','#entry--1','#entry-1junk','#scene-2'])assert.equal(entryNumberFromHash(hash),null);
 assert.equal(readingMode('horizontal'),'horizontal'); assert.equal(readingMode('overview'),'vertical');
});
test('collection payloads are shared per album and concurrent fetching is bounded',async()=>{
 const requests=[];let running=0,peak=0;
 const loader=createCollectionSceneLoader(album=>{running++;peak=Math.max(peak,running);const response=deferred();requests.push({album,response});return response.promise.finally(()=>running--);},2);
 const albums=Array.from({length:4},(_,i)=>({path:`/albums/s5/Episode${i+1}/`,scene_data_url:`/${i}.json`}));
 const firstLoad=loader.load(albums[0],1),same=loader.load(albums[0],2),others=albums.slice(1).map(a=>loader.load(a,1));
 await new Promise(resolve=>setImmediate(resolve));assert.equal(requests.length,2);
 for(let i=0;i<4;i++){requests[i].response.resolve({scenes:[{scene_number:'01',narration:'One'},{scene_number:'02',narration:'Two'}]});await new Promise(resolve=>setImmediate(resolve));}
 const results=await Promise.all([firstLoad,same,...others]);assert.equal(results[1].narration,'Two');assert.equal(requests.length,4);assert.equal(peak,2);
 await loader.load(albums[0],1);assert.equal(requests.length,4);loader.dispose();
});
test('failed collection album requests can retry; disposal aborts active and queued work',async()=>{
 const album={path:first.path,scene_data_url:'/one.json'};let attempts=0;
 const retry=createCollectionSceneLoader(async()=>{if(!attempts++)throw new Error('Offline');return {scenes:[{scene_number:1,narration:'Restored'}]};});
 await assert.rejects(retry.load(album,1),/Offline/);assert.equal((await retry.load(album,1)).narration,'Restored');retry.dispose();
 let signal;const response=deferred();const loader=createCollectionSceneLoader((_album,s)=>{signal=s;return response.promise;},1);
 const firstLoad=loader.load(album,1),queued=loader.load({...album,path:'/albums/s5/Episode2/'},1);
 const checks=Promise.all([assert.rejects(firstLoad,{name:'AbortError'}),assert.rejects(queued,{name:'AbortError'})]);
 await Promise.resolve();loader.dispose();assert.equal(signal.aborted,true);response.resolve({scenes:[{scene_number:1}]});await checks;
 await assert.rejects(loader.load(album,1),{name:'AbortError'});
});
