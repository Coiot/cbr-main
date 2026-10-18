// Local CPU benchmark on the checked-in map. This does not measure browser paint or network time.
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { reactive } from 'vue';
import { mergeMapState, buildTiles, buildTileLookup, buildOwnerBorders } from '../../src/.vuepress/theme/components/community/map/mapModel.js';
import { ownerPalette } from '../../src/.vuepress/data/communityTileMap.js';
const baseText=readFileSync('src/.vuepress/public/community/CBRXMapOct62025_V2.base.json','utf8');
const stateText=readFileSync('src/.vuepress/public/community/CBRXMapOct62025_V2.state.json','utf8');
const times={parse:[],merge:[],tiles:[],reactiveBorders:[],plainBorders:[]};
for(let i=0;i<12;i++) {
 const t0=performance.now(); const base=JSON.parse(baseText), state=JSON.parse(stateText); const t1=performance.now();
 const merged=mergeMapState(base,state); const t2=performance.now();
 const {tiles}=buildTiles(merged,14,ownerPalette); const t3=performance.now();
 const plainStart=performance.now(); buildOwnerBorders(tiles,180,94,{},14,null,buildTileLookup(tiles)); const plainEnd=performance.now();
 const wrapped=reactive(tiles); buildOwnerBorders(wrapped,180,94,{},14,null,buildTileLookup(wrapped)); const t4=performance.now();
 if(i>1) { times.parse.push(t1-t0); times.merge.push(t2-t1); times.tiles.push(t3-t2); times.reactiveBorders.push(t4-plainEnd); times.plainBorders.push(plainEnd-plainStart); }
}
for(const [key,values] of Object.entries(times)) console.log(key,values.sort((a,b)=>a-b)[Math.floor(values.length/2)].toFixed(2)+'ms');
