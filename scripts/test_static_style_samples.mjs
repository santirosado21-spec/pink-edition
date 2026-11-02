import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loader} from './test_support/load_ts.mjs';
const load=loader(),{StaticStyleSample}=load('app/_components/StaticStyleSample.tsx');
const {DEFAULT_PREFERENCES,catalog}=load('src/preferences.ts');
const {editorialFamilies}=load('src/editorialRecipes.ts');
const modes=['captions','emphasis','compare','steps','broll','transition'];
const palette=new Set(['#f7f5ef','#20211f','#deded5','#66695f','#f36b52','#fffefa','#b83e29','#efede6']);
let total=0;
for(const family of editorialFamilies)for(const font of catalog.fonts)for(const mode of modes){
 const value={...DEFAULT_PREFERENCES,editorialFamilyId:family.id,font:font.id,brand_color:'#0055ff',captions:'karaoke'};
 const markup=renderToStaticMarkup(createElement(StaticStyleSample,{value,mode,stage:1}));
 assert.ok(markup.includes('role="img"'));
 assert.ok(!/<(?:video|audio|animate|animateTransform)\b/i.test(markup));
 assert.ok(!markup.includes('#0055ff'),'Export color must never tint questionnaire imagery');
 for(const color of markup.match(/#[0-9a-f]{6,8}\b/gi)??[])assert.ok(palette.has(color.toLowerCase()),'Non-Cutkind color: '+color);
 total++;
}
console.log(`PASS ${total} SVG samples: Cutkind palette only, no audio/video/animation, export color isolated`);
const {ResourceSample}=load('app/_components/ResourceSample.tsx');
for(const font of catalog.fonts)for(const kind of ['compare','steps','video','still','none','overlay','fullscreen','captions','original','color-background','image-background','photo']) {
 const markup=renderToStaticMarkup(createElement(ResourceSample,{kind,value:{...DEFAULT_PREFERENCES,font:font.id,brand_color:'#0055ff'}}));
 assert.ok(!/<(?:video|audio|animate|animateTransform)\b/i.test(markup));
 assert.ok(!markup.includes('#0055ff'));
 for(const color of markup.match(/#[0-9a-f]{6,8}\b/gi)??[])assert.ok(palette.has(color.toLowerCase()),color);
}
console.log('PASS 120 resource images with chosen typography and Cutkind colors');
