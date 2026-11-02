import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';
import {bundle} from '@remotion/bundler';import {selectComposition,renderStill,renderMedia} from '@remotion/renderer';import {execFileSync} from 'node:child_process';
import {loader} from './test_support/load_ts.mjs';
const {DEFAULT_PREFERENCES,checkPreferences}=loader()('src/preferences.ts');
const {editorialVariant}=loader()('src/editorialRecipes.ts');
assert.ok(checkPreferences({...DEFAULT_PREFERENCES,editorialFamilyId:'bogus'}).length);
assert.throws(()=>editorialVariant({kind:'card',variantId:'not-implemented'},DEFAULT_PREFERENCES));
const catalog=JSON.parse(await fs.readFile('style/editorial-recipes-v1.json','utf8'));
const output=await fs.mkdtemp(path.join(os.tmpdir(),'cutkind-editorial-'));
const serveUrl=await bundle({entryPoint:path.resolve('src/oneShotEntry.tsx'),publicDir:null,outDir:path.join(output,'bundle')});
for(const family of catalog.families){
 const edit={fps:30,width:1280,height:720,frames:180,preferences:{...DEFAULT_PREFERENCES,editorialFamilyId:family.id,font:family.font,graphic_material:family.id==='estampa'?'paper':'solid'},scenes:[],captions:[],beats:family.cards.map((variantId,i)=>({id:`card-${i}`,kind:'card',from:i*90,frames:90,quote:'Cada historia tiene su propio ritmo.',title:'Cada historia tiene su propio ritmo.',labels:[],reason:'Synthetic editorial comparison',variantId})),music:null,musicFrames:1,issues:[],assets:[],checks:{},transitions:[]};
 const inputProps={edit,mediaBase:'http://localhost:3001/api/local-intake/media?session=synthetic'};
 const composition=await selectComposition({serveUrl,id:'OneShot',inputProps});
 for(const frame of [45,135])await renderStill({serveUrl,composition,inputProps,frame,output:path.join(output,`${family.id}-${frame}.png`)});
 if(['umbral','estampa','pulso'].includes(family.id)){
   const file=path.join(output,`${family.id}.mp4`);await renderMedia({serveUrl,composition,inputProps,codec:'h264',outputLocation:file,concurrency:2});
   const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_format','-show_streams','-of','json',file]));assert.equal(Number(probe.format.duration),6);assert.ok(probe.streams.some(s=>s.codec_type==='video'));
 }
}
console.log('PASS: invalid variants rejected, 10 editorial frames, 3 six-second MP4s. Synthetic visual fixtures (no speaker/audio). '+output);
