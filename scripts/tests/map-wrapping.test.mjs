import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapWrappingComputed,mapWrappingMethods,wrapValue,nearestWorldX,wrappedViewportRects} from '../../src/.vuepress/theme/components/community/map/mapWrapping.mjs';
import {mapViewportMethods} from '../../src/.vuepress/theme/components/community/map/mapViewport.js';
import {mapInteractionMethods} from '../../src/.vuepress/theme/components/community/map/mapInteraction.js';
import {mapRenderingComputed} from '../../src/.vuepress/theme/components/community/map/mapRendering.js';
import {mapViewMethods} from '../../src/.vuepress/theme/components/community/map/mapView.js';
import {mapNavigationMethods} from '../../src/.vuepress/theme/components/community/map/mapNavigation.js';
import {buildOwnerBorders,buildTileLookup} from '../../src/.vuepress/theme/components/community/map/mapModel.js';

function context(columns=180,rows=94){
  const size=14,width=size*Math.sqrt(3);
  const ctx={horizontalWrap:true,embedded:false,wrapFitted:true,mapConfig:{columns,rows,hexSize:size},
    translate:{x:0,y:0},scale:2,minScale:.1,maxScale:5,viewportSize:{width:900,height:500},
    useTerrainCanvas:false,tiles:[],selectedTile:null,$nextTick:fn=>fn(),updateViewportSize(){}};
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++)ctx.tiles.push({key:`${col},${row}`,col,row,
    x:width/2+col*width+(row%2?0:width/2),y:size+row*size*1.5,owner:0});
  ctx.tileLookup=buildTileLookup(ctx.tiles);
  for(const [name,fn] of Object.entries({...mapViewportMethods,...mapWrappingMethods,...mapInteractionMethods,...mapViewMethods,...mapNavigationMethods}))ctx[name]=fn.bind(ctx);
  for(const [name,fn] of Object.entries({...mapWrappingComputed,...Object.fromEntries(['hexSize','hexWidth','hexHeight','gridWidth','gridHeight','visibleTileWorlds','visibleTiles','miniMapViewport'].map(k=>[k,mapRenderingComputed[k]]))}))Object.defineProperty(ctx,name,{get:()=>fn.call(ctx)});
  return ctx;
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('horizontal camera wraps repeatedly while Fit restores the original padded bounds and empty margins',()=>{
  const c=context();c.hideHoverTooltip=()=>{};c.fitToView();
  const fitted={scale:c.scale,translate:{...c.translate}};assert.deepEqual(c.visibleWorldCopies,[0]);
  close(c.scale,Math.min(900/c.gridWidth,500/c.gridHeight));
  c.activateHorizontalWrap();
  for(const loops of [-100000,-2,-1,0,1,3,100000]){
    c.translate=c.clampTranslate({x:450-(c.worldPeriod*loops+25)*c.scale,y:-1e6},c.scale);
    close((450-c.translate.x)/c.scale,25);assert.ok(c.visibleWorldCopies.length<=4);
    assert.ok(c.translate.y>=Math.min(0,500-c.gridHeight*c.scale));
  }
  c.fitToView();assert.deepEqual({scale:c.scale,translate:c.translate},fitted);assert.deepEqual(c.wrapCopies,[]);
});

test('every repeated hex resolves to the original tile for staggered rows, without changing its coordinates',()=>{
  const c=context(8,6);c.activateHorizontalWrap();
  for(const row of [0,1,4,5])for(const col of [0,7])for(const copy of [-20,-1,0,1,20]){
    const tile=c.tileLookup.get(`${col},${row}`),x=tile.x+copy*c.worldPeriod;
    assert.equal(c.getTileAtPoint(x,tile.y),tile);assert.equal(tile.col,col);assert.equal(tile.row,row);
    assert.equal(c.getTileAtPoint(x+c.hexWidth*.3,tile.y),tile);
  }
  assert.equal(c.getTileAtPoint(0,-1000),null);
  c.wrapFitted=true;assert.equal(c.getTileAtPoint(-2*c.worldPeriod,14),null);
});

test('seam neighbors share borders and partial border rebuilds include the opposite edge',()=>{
  const c=context(8,6),colors={0:'#fff',1:'#000'};
  buildOwnerBorders(c.tiles,8,6,colors,14,null,c.tileLookup,true);
  assert.equal(c.tileLookup.get('0,2').ownerBorderSegments.length,0);
  c.tileLookup.get('0,2').owner=1;
  buildOwnerBorders(c.tiles,8,6,colors,14,new Set(['0,2']),c.tileLookup,true);
  const partial=c.tiles.map(t=>JSON.stringify(t.ownerBorderSegments));
  assert.ok(c.tileLookup.get('7,2').ownerBorderSegments.length>0);
  buildOwnerBorders(c.tiles,8,6,colors,14,null,c.tileLookup,true);
  assert.deepEqual(c.tiles.map(t=>JSON.stringify(t.ownerBorderSegments)),partial);
});

test('SVG culling includes both sides of a seam and keeps a bounded set of canonical tiles',()=>{
  const c=context();c.activateHorizontalWrap();c.translate={x:450,y:-1500};
  const visible=c.visibleTiles;assert.ok(visible.some(t=>t.col===0),'western edge missing');assert.ok(visible.some(t=>t.col===179),'eastern edge missing');
  assert.ok(visible.length<1500,`Too many visible tiles: ${visible.length}`);assert.equal(new Set(visible.map(t=>t.key)).size,visible.length);
  for(const tile of visible)assert.equal(tile,c.tileLookup.get(tile.key));
});

test('keyboard selection crosses the seam, navigation chooses the nearest copy, and vertical selection stays bounded',()=>{
  const c=context(8,6);c.ensureTileInViewport=()=>{};c.selectedTile=c.tileLookup.get('0,0');
  c.selectKeyboardTile('ArrowLeft');assert.equal(c.selectedTile.key,'7,0');
  c.selectKeyboardTile('ArrowRight');assert.equal(c.selectedTile.key,'0,0');
  c.selectKeyboardTile('ArrowUp');assert.equal(c.selectedTile.key,'0,0');
  close(nearestWorldX(c.worldPeriod-10,0,c.worldPeriod),-10);
});

test('minimap splits at the seam and highlights one full world when the viewport is wider',()=>{
  assert.deepEqual(wrappedViewportRects(-10,4,30,20,100),[{x:90,y:4,width:10,height:20},{x:0,y:4,width:20,height:20}]);
  assert.deepEqual(wrappedViewportRects(-10,4,130,20,100),[{x:0,y:4,width:100,height:20}]);
});

test('saved views normalize wrapped centers without changing tile identity or requiring new settings',()=>{
  const c=context();c.activateHorizontalWrap();c.translate={x:450-(c.worldPeriod*17+12)*c.scale,y:0};
  c.selectedTile=c.tileLookup.get('179,20');c.officialSource={source:'timeline:example:645'};
  const settings=c.captureMapViewSettings();close(settings.x,12);assert.equal(settings.tile,'179,20');assert.equal(settings.version,1);
  c.updateViewportSize=()=>{};c.applyMapViewSettings({...settings,x:-c.worldPeriod*20+12});
  close((450-c.translate.x)/c.scale,12);assert.equal(c.selectedTile.key,'179,20');
});

test('embedded maps remain bounded even when wrapping was requested by a parent',()=>{
  const c=context();c.embedded=true;c.activateHorizontalWrap();assert.equal(c.wrapActive,false);
  const p=c.clampTranslate({x:1e6,y:1e6},2);assert.equal(p.x,0);assert.deepEqual(c.visibleWorldCopies,[0]);
  assert.equal(wrapValue(-1,180),179);
});
