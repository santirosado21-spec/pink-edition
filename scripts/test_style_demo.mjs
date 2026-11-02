import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {loader} from './test_support/load_ts.mjs';
const load=loader(),{styleDemo,demoModes}=load('src/styleDemo.ts');
const {DEFAULT_PREFERENCES,catalog,checkPreferences}=load('src/preferences.ts');
const {editorialFamilies}=load('src/editorialRecipes.ts');
for(const family of editorialFamilies)for(const font of catalog.fonts)for(const mode of demoModes){
 const prefs={...DEFAULT_PREFERENCES,editorialFamilyId:family.id,font:font.id,captions:'karaoke'};
 const edit=styleDemo(prefs,mode.id);
 assert.equal(checkPreferences(edit.preferences).length,0);
 assert.equal(edit.preferences.font,font.id,'Do not substitute the chosen font');
 assert.equal(edit.preferences.editorialFamilyId,family.id);
 assert.equal(edit.captions.length>0,true);
 assert.ok(edit.captions.every(c=>c.startMs>=0&&c.endMs<=edit.frames/edit.fps*1000));
 assert.equal(edit.scenes.reduce((sum,s)=>sum+s.frames,0),edit.frames);
 for(const scene of edit.scenes)assert.ok(fs.existsSync('public/style-demos/'+scene.asset));
 for(const beat of edit.beats){assert.ok(beat.from+beat.frames<=edit.frames);if(beat.asset)assert.ok(fs.existsSync('public/style-demos/'+beat.asset));}
 if(mode.id==='transition')assert.equal(edit.transitions[0].variantId,family.transition);
 if(mode.id==='broll')assert.equal(edit.beats[0].mediaType,family.id==='estampa'?'image':'video');
}
for(const asset of ['scene-a.mp4','scene-b.mp4']){
 const result=spawnSync('ffprobe',['-v','error','-show_format','-of','json','public/style-demos/'+asset],{encoding:'utf8'});
 assert.equal(result.status,0);assert.ok(Number(JSON.parse(result.stdout).format.duration)>=8,'Demo media must not end before its displayed interval');
}
console.log('PASS 300 family/font/effect combinations, literal preferences, caption bounds and media duration');
