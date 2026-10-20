import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toolbarDisclosureMethods, savedViewSection } from '../../src/.vuepress/theme/components/community/map/toolbarDisclosure.mjs';
function toolbar() {
 const log=[], inside={},outside={};
 const menu=name=>({open:false,contains:target=>target===inside,querySelector:()=>({focus:options=>log.push(['focus',name,options])})});
 const ctx={openMenu:'',$refs:{views:menu('views'),more:menu('more')},$emit:(...args)=>log.push(['emit',...args])};
 for(const [key,fn] of Object.entries(toolbarDisclosureMethods))ctx[key]=fn.bind(ctx);
 return {ctx,log,inside,outside};
}
test('opening a toolbar disclosure closes the other and ignores its delayed close event',()=>{
 const {ctx}=toolbar();ctx.$refs.views.open=true;ctx.onDisclosureToggle('views',{currentTarget:ctx.$refs.views});
 ctx.$refs.more.open=true;ctx.onDisclosureToggle('more',{currentTarget:ctx.$refs.more});
 assert.equal(ctx.$refs.views.open,false);assert.equal(ctx.openMenu,'more');
 ctx.onDisclosureToggle('views',{currentTarget:ctx.$refs.views});assert.equal(ctx.openMenu,'more');
 ctx.$refs.more.open=false;ctx.onDisclosureToggle('more',{currentTarget:ctx.$refs.more});assert.equal(ctx.openMenu,'');
});
test('toolbar actions close the disclosure and focus its trigger before opening another surface',()=>{
 const {ctx,log}=toolbar();ctx.openMenu='views';ctx.$refs.views.open=true;
 ctx.runAction('browse-views','following');
 assert.equal(ctx.openMenu,'');assert.equal(ctx.$refs.views.open,false);
 assert.deepEqual(log,[['focus','views',{preventScroll:true}],['emit','browse-views','following']]);
});
test('outside pointer and keyboard focus dismissal do not steal focus or close internal interaction',()=>{
 const {ctx,log,inside,outside}=toolbar();ctx.openMenu='views';ctx.$refs.views.open=true;
 ctx.onOutsidePointer({target:inside});assert.equal(ctx.openMenu,'views');
 ctx.onDisclosureFocusout('views',{relatedTarget:inside});assert.equal(ctx.openMenu,'views');
 ctx.onDisclosureFocusout('views',{relatedTarget:outside});assert.equal(ctx.openMenu,'');assert.deepEqual(log,[]);
 ctx.openMenu='more';ctx.$refs.more.open=true;ctx.onOutsidePointer({target:outside});assert.equal(ctx.openMenu,'');assert.equal(ctx.$refs.more.open,false);
 ctx.openMenu='views';ctx.$refs.views.open=true;ctx.closeMenu(true);assert.equal(log[0][0],'focus');
});
test('view menus accept only the existing browsing sections, leaving no-argument calls unchanged',()=>{
 for(const section of ['explore','following','mine'])assert.equal(savedViewSection(section),section);
 for(const section of [undefined,null,'other',{},['mine']])assert.equal(savedViewSection(section),null);
});
test('Escape closes an open disclosure, but remains available to fullscreen when disclosures are closed',()=>{
 const {ctx,log}=toolbar();let prevented=0,stopped=0;const event={preventDefault(){prevented++;},stopPropagation(){stopped++;}};
 ctx.onDisclosureEscape(event);assert.equal(prevented,0);assert.equal(stopped,0);
 ctx.openMenu='views';ctx.$refs.views.open=true;ctx.onDisclosureEscape(event);
 assert.equal(prevented,1);assert.equal(stopped,1);assert.equal(ctx.openMenu,'');assert.equal(log[0][0],'focus');
});
