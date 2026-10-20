import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeShowcaseDraft, sceneCards, showcaseLink, isSupportersScene } from '../../src/.vuepress/theme/components/supporters/showcaseModel.mjs';
import { listDirectory, getShowcase, saveShowcase, unpublishShowcase, lookupShowcaseName, deleteShowcase } from '../../src/.vuepress/theme/components/supporters/showcaseApi.mjs';
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
const scene={path:'/albums/s5/Episode34/',number:5};
test('showcase drafts publish only selected fields and reject duplicate or unsafe content references',()=>{
  const draft=normalizeShowcaseDraft({introduction:'  Hello  ',competitors:['Japan','Japan',''],scenes:[scene],map_views:[a,a],published:true,email:'private@cbr.test'});
  assert.deepEqual(draft,{introduction:'Hello',competitors:['Japan'],scenes:[scene],map_views:[a],published:true});
  for(const change of [{introduction:'x'.repeat(401)},{scenes:[scene,scene]},{scenes:[{...scene,path:'https://outside.test/'}]},{scenes:[{...scene,number:0}]},{map_views:['bad']},{map_views:[a,b,'00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004']}]) assert.throws(()=>normalizeShowcaseDraft(change));
});
test('published scene curation preserves order and hides unknown scenes and later spoilers',()=>{
 const episodes=[{path:'/albums/s5/Episode34/',season:'s5',number:34,title:'Later',scenes:[{number:5,title:'A'},{number:6,title:'B'}]}, {path:'/albums/s5/Episode1/',season:'s5',number:1,title:'First',scenes:[{number:1,title:'C'}]}];
 const selected=[{...scene,number:6},scene,{path:'/albums/s5/Episode1/',number:1},{...scene,number:999}];
 assert.deepEqual(sceneCards(episodes,selected).map(s=>s.title),['B','A','C']);
 assert.deepEqual(sceneCards(episodes,selected,'1','s5').map(s=>s.title),['C']);
 assert.deepEqual(sceneCards(episodes,selected,'all','s4'),[]);
});
test('showcase links and episode credit detection use safe, established routes',()=>{
 assert.equal(showcaseLink(a),`/supporters/profile/?id=${a}`);
 assert.equal(showcaseLink('javascript:bad'),'');
 assert.equal(isSupportersScene({slide_svg:'https://cdn.civbattleroyale.tv/s5ep12.5-supporters.svg?v=2'}),true);
 assert.equal(isSupportersScene({slide_url:'s5ep34-supporters.svg'}),false);
 assert.equal(isSupportersScene({slide_svg:'https://cdn.test/not-supporters.svg'}),false);
});
test('directory requests paginate and filter on the server; malformed profile IDs never query',async()=>{
 const calls=[]; const client={rpc:async(name,args)=>{calls.push({name,args});return {data:{entries:[]}};}};
 await listDirectory(client,{search:'  Reader ',civ:'Japan',offset:24});
 assert.deepEqual(calls,[{name:'list_supporter_directory',args:{p_search:'Reader',p_civ:'Japan',p_offset:24}}]);
 assert.equal(await getShowcase(client,'unsafe'),null); assert.equal(calls.length,1);
 await assert.rejects(listDirectory({rpc:async()=>({error:{message:'secret details'}})}),/Supporters could not/);
});
test('save failures never report success and expired owners can unpublish without editing content',async()=>{
 const updates=[]; const chain={eq(){return this;},select(){return this;},async single(){return {data:{id:a,published:false}};}};
 const client={from(table){assert.equal(table,'supporter_showcases');return {update(payload){updates.push(payload);return chain;}};}};
 await unpublishShowcase(client,b,a); assert.deepEqual(updates,[{published:false}]);
 const failure={from(){return {insert(){return {select(){return {single:async()=>({error:{code:'42501'}})}}}}}}};
 await assert.rejects(saveShowcase(failure,b,{scenes:[scene]},null),/current supporter access/);
 const missing={from:()=>({delete:()=>({eq(){return this;},select:async()=>({data:[]})})})};
 await assert.rejects(deleteShowcase(missing,b,a),/no longer available/);
});
test('visible creator names share one batched lookup and cached results',async()=>{
 const calls=[];const client={rpc:async(name,args)=>{calls.push(args);assert.equal(name,'lookup_supporter_showcases');return {data:[{user_id:a,showcase_id:b}]};}};
 const result=await Promise.all([lookupShowcaseName(client,a),lookupShowcaseName(client,b),lookupShowcaseName(client,a)]);
 assert.deepEqual(result,[b,null,b]);assert.equal(calls.length,1);assert.deepEqual(calls[0].p_user_ids,[a,b]);
 assert.equal(await lookupShowcaseName(client,a),b);assert.equal(calls.length,1);
 assert.equal(await lookupShowcaseName(client,'bad'),null);
});
test('creator lookup drains large pages in bounded batches and recovers after network errors',async()=>{
 const ids=Array.from({length:105},(_,i)=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`);const sizes=[];
 const client={rpc:async(name,args)=>{sizes.push(args.p_user_ids.length);return {data:[]};}};
 const results=await Promise.all(ids.map(id=>lookupShowcaseName(client,id)));
 assert.equal(results.length,105);assert.deepEqual(sizes,[100,5]);
 let calls=0; const flaky={rpc:async()=>++calls===1?{error:{code:'503'}}:{data:[{user_id:a,showcase_id:b}]}};
 assert.equal(await lookupShowcaseName(flaky,a),null);assert.equal(await lookupShowcaseName(flaky,a),b);
});
