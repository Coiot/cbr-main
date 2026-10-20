import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeShowcaseDraft, additionalCompetitors, sceneCards, showcaseLink, isSupportersScene, normalizeShowcasePins, localShowcasePins, showcaseMapLink } from '../../src/.vuepress/theme/components/supporters/showcaseModel.mjs';
import { listDirectory, listFullDirectory, listShowrunners, loadShowcaseAccess, getShowcaseContent, getShowcase, saveShowcase, unpublishShowcase, lookupShowcaseName, deleteShowcase } from '../../src/.vuepress/theme/components/supporters/showcaseApi.mjs';
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
import { showcasePreviewSelections, showcaseSummary, showcasePreviewSections } from '../../src/.vuepress/theme/components/supporters/showcasePreview.mjs';
const scene={path:'/albums/s5/Episode34/',number:5};
test('additional competitors preserve saved choices and keep the favourite separate',()=>{
 assert.deepEqual(additionalCompetitors('Hyksos',['Pomo']),['Pomo']);
 assert.deepEqual(additionalCompetitors('Hyksos',['','Pomo']),['Pomo']);
 assert.deepEqual(additionalCompetitors('Hyksos',['Hyksos','Pomo','Pomo']),['Pomo']);
 assert.deepEqual(additionalCompetitors('Hyksos',[]),[]);
 const saved=normalizeShowcaseDraft({competitors:['','Pomo']});
 assert.deepEqual(additionalCompetitors('Hyksos',saved.competitors),['Pomo']);
});
test('showrunner listing and showcase access use server authorization without client-supplied identity',async()=>{
 const calls=[];
 const client={rpc:async(name,args)=>{calls.push({name,args});return {data:name==='get_my_showcase_access'?{allowed:true,is_showrunner:true,status:'none'}:[{id:a,is_showrunner:true}]};}};
 assert.equal((await listShowrunners(client))[0].is_showrunner,true);
 assert.deepEqual(await loadShowcaseAccess(client),{allowed:true,is_showrunner:true,status:'none'});
 assert.deepEqual(calls,[{name:'list_showrunner_showcases',args:undefined},{name:'get_my_showcase_access',args:undefined}]);
 await assert.rejects(loadShowcaseAccess({rpc:async()=>({error:{code:'42501'}})}),/Supporters could not be loaded/);
});
test('showcase drafts publish only selected fields and reject duplicate or unsafe content references',()=>{
  const draft=normalizeShowcaseDraft({introduction:'  Hello  ',competitors:['Japan','Japan',''],scenes:[scene],map_views:[a,a],published:true,email:'private@cbr.test'});
  assert.deepEqual(draft,{introduction:'Hello',competitors:['Japan'],scenes:[scene],map_views:[a],map_pins:[],published:true});
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
test('full directory loads every server page in order with the same filters',async()=>{
 const entries=Array.from({length:59},(_,i)=>({display_name:`Reader ${i}`}));
 const calls=[];
 const client={rpc:async(name,args)=>{
   calls.push(args);
   return {data:{entries:entries.slice(args.p_offset,args.p_offset+24),total:entries.length,civs:['Japan'],anonymous_count:3}};
 }};
 const result=await listFullDirectory(client,{search:' Reader ',civ:'Japan'});
 assert.deepEqual(result,{entries,total:59,civs:['Japan'],anonymous_count:3});
 assert.deepEqual(calls.map(args=>args.p_offset),[0,24,48]);
 assert.ok(calls.every(args=>args.p_search==='Reader' && args.p_civ==='Japan'));
});
test('full directory handles empty results and does not return a partial list after failure',async()=>{
 const empty={entries:[],total:0,civs:[],anonymous_count:2};
 assert.deepEqual(await listFullDirectory({rpc:async()=>({data:empty})}),empty);
 for(const lastPage of [{error:{code:'503'}},{data:{entries:[],total:25}}]){
   let calls=0;
   const client={rpc:async()=>++calls===1?{data:{entries:Array.from({length:24},()=>({display_name:'Reader'})),total:25}}:lastPage};
   await assert.rejects(listFullDirectory(client),/Supporters could not be loaded/);
   assert.equal(calls,2);
 }
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

test('showcases accept nine additional competitors and reject a tenth',()=>{
 const extras=Array.from({length:9},(_,i)=>`Competitor ${i+1}`);
 assert.deepEqual(normalizeShowcaseDraft({competitors:extras}).competitors,extras);
 assert.deepEqual(additionalCompetitors('Hyksos',['Hyksos',...extras]),extras);
 assert.throws(()=>normalizeShowcaseDraft({competitors:[...extras,'One too many']}),/nine additional/);
});
test('showrunner image previews stay bounded, released and in curated order',()=>{
 const catalog=[{path:'/albums/s5/Episode1/',scene_data_url:'/data/one.json',date:'2020-01-01'},
 {path:'/albums/s5/Episode2/',scene_data_url:'/data/two.json',date:'2099-01-01'},
 {path:'/albums/s5/Episode3/',scene_data_url:'/data/three.json',exclude:true}];
 const selections=[{path:'/albums/s5/Episode2/',number:1},{path:'/albums/s5/Episode3/',number:1},
 {path:'/albums/s5/Episode1/',number:3},{path:'/albums/s5/Episode1',number:3},
 ...[1,2,4,5,6].map(number=>({path:'/albums/s5/Episode1/',number}))];
 const previews=showcasePreviewSelections(catalog,selections,Date.parse('2026-01-01'));
 assert.deepEqual(previews.map(row=>row.number),[3,1,2,4]);
 assert.ok(previews.every(row=>row.album.scene_data_url==='/data/one.json'));
 assert.deepEqual(showcasePreviewSelections(catalog,[]),[]);
});
test('showcase preview summaries omit empty sections and use the visible public content counts',()=>{
 assert.equal(showcaseSummary({scenes:[scene],map_views:[]},0),'1 scene highlight');
 assert.equal(showcaseSummary({scenes:[scene,scene],map_views:[{}]},3),'2 scene highlights · 3 collections · 1 map view');
 assert.equal(showcaseSummary({},0),'');
});

test('map pins are explicitly selected, normalized, and independent of browser storage',()=>{
 const raw=JSON.stringify([{name:' My front ',tileKey:'12,8',cityName:'Test city',ownerName:'Japan',email:'private'},
 {name:'my front',tileKey:'12,8'},{name:'Bad',tileKey:'javascript:bad'}]);
 const choices=localShowcasePins(raw,'s5');
 assert.deepEqual(choices,[{map_id:'s5',name:'My front',tile_key:'12,8',city_name:'Test city',owner_name:'Japan'}]);
 assert.deepEqual(normalizeShowcaseDraft({}).map_pins,[]);
 assert.deepEqual(normalizeShowcaseDraft({map_pins:choices}).map_pins,choices);
 assert.deepEqual(localShowcasePins('invalid','s5'),[]);
 assert.throws(()=>normalizeShowcasePins([...choices,...choices]));
 assert.throws(()=>normalizeShowcasePins([{...choices[0],tile_key:'outside'}]));
 assert.throws(()=>normalizeShowcasePins(Array.from({length:101},(_,i)=>({...choices[0],name:`Pin ${i}`}))));
 assert.deepEqual(showcaseMapLink({...choices[0],snapshot_id:a}),{path:'/community-tile-map/',query:{tile:'12,8',snapshot:a}});
 assert.deepEqual(showcaseMapLink({tile_key:'javascript:bad',snapshot_id:'unsafe'}),{path:'/community-tile-map/',query:{}});
});
test('full public showcase content is fetched by showcase ID without accepting an owner identity',async()=>{
 const calls=[];const data={collections:[{id:b,featured:false}],map_views:Array.from({length:25},()=>({id:b})),map_notes:[],map_pins:[],snapshots:[],comments:[]};
 const client={rpc:async(name,args)=>{calls.push({name,args});return {data};}};
 assert.deepEqual(await getShowcaseContent(client,a),data);
 assert.deepEqual(calls,[{name:'get_showcase_public_content',args:{p_id:a}}]);
 assert.equal(await getShowcaseContent(client,'invalid'),null);assert.equal(calls.length,1);
 await assert.rejects(getShowcaseContent({rpc:async()=>({error:{code:'503'}})},a),/Supporters could not be loaded/);
});
test('showcase summaries include public map views while omitting administrative snapshots',()=>{
 const content={map_views:Array.from({length:5},()=>({})),map_pins:[{}],map_notes:[{},{}],snapshots:[{}],comments:[{}]};
 assert.equal(showcaseSummary({scenes:[scene],map_views:[]},2,content),'1 scene highlight · 2 collections · 5 map views · 1 shared pin · 2 map notes · 1 episode comment');
});
test('compact showcase previews cover every populated section with bounded representative content',()=>{
 const content={
  collections:[{title:'First collection'},{title:'Second collection'},{title:'Third collection'}],
  map_views:[{title:'European front'}],map_pins:[{name:'Border watch'}],
  map_notes:[{note:'A long\n note '.repeat(50)},{note:'Another note'}],
  snapshots:[{episode_label:'Episode 34'},{episode_label:'Episode 33'}],
  comments:[{page_path:'/albums/s5/Episode34/',message:'A memorable\n comeback.'}],
  email:'private@example.test',user_id:a,
 };
 const sections=showcasePreviewSections({scenes:[scene]},content,['A last stand']);
 assert.deepEqual(sections.map(row=>row.key),['scenes','collections','views','pins','notes','comments']);
 assert.deepEqual(sections.map(row=>row.count),[1,3,1,1,2,1]);
 assert.equal(sections[0].detail,'A last stand');
 assert.equal(sections[1].detail,'First collection · Second collection · +1 more');
 assert.equal(sections[2].detail,'European front');
 assert.equal(sections[3].detail,'Border watch');
 assert.ok(sections[4].detail.endsWith('…'));
 assert.equal(sections[5].detail,'Season 5 · Episode 34 — A memorable comeback.');
 assert.ok(sections.every(row=>row.detail.length<=140 && !row.detail.includes('\n')));
 assert.ok(!JSON.stringify(sections).includes('private@example.test'));
});
test('compact previews omit empty contributions and honor the public response over profile fallbacks',()=>{
 assert.deepEqual(showcasePreviewSections({},{}),[]);
 const profile={map_views:[{title:'Old view'}],map_pins:[{name:'Old pin'}]};
 assert.equal(showcasePreviewSections(profile).length,2);
 assert.deepEqual(showcasePreviewSections(profile,{map_views:[],map_pins:[]}),[]);
});
