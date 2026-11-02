import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {loader} from './test_support/load_ts.mjs';
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'cutkind-commons-'));
await fs.mkdir(path.join(temp, 'work/fixture'), {recursive:true});
await fs.writeFile(path.join(temp, 'work/fixture/timeline.json'), '{}');
let mode = 'ok', calls = 0;
const page = {pageid: 31, ns: 6, index: 1, title: 'File:Microphone.jpg', imageinfo: [{
  url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Microphone.jpg',
  thumburl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Microphone.jpg/1280px-Microphone.jpg',
  mime: 'image/jpeg', extmetadata: {Artist: {value: '<a href="/user">Photographer</a>'}, LicenseShortName: {value:'CC0'}, LicenseUrl: {value:'http://creativecommons.org/publicdomain/zero/1.0/deed.en'}}
}]};
const fetch = async (input, options) => {
  const url = new URL(input); calls++;
  assert.equal(options.headers?.Authorization, undefined);
  assert.equal(options.redirect, 'error');
  assert.equal(url.searchParams.has('key'), false);
  if(url.hostname === 'commons.wikimedia.org') {
    if(mode === 'quota') return new Response('limited',{status:429});
    const value = structuredClone(page);
    if(mode === 'license') value.imageinfo[0].extmetadata.LicenseShortName.value = 'CC BY-SA 4.0';
    if(mode === 'host') value.imageinfo[0].url = 'http://127.0.0.1/private';
    if(mode === 'svg') value.imageinfo[0].mime = 'image/svg+xml';
    if(mode === 'missing') return Response.json({query:{pages:{31:{pageid:31,ns:6}}}});
    return Response.json({query:{pages:{31:value}}});
  }
  assert.equal(url.hostname, 'thumb.wikimedia.org');
  return new Response(new Uint8Array([255,216,255,217]), {headers:{'content-type':'image/jpeg'}});
};
const load = loader({}, {process:{...process,env:{},cwd:()=>temp},fetch,AbortSignal,URLSearchParams});
const {searchPhotos, downloadPhoto} = load('app/_lib/stockPhotos.ts');
try {
  assert.equal(load('app/_lib/stockProvider.ts').stockProviderStatus().provider, 'Wikimedia');
  assert.equal(load('app/_lib/stockProvider.ts').stockProviderStatus().ready, true);
  const found = await searchPhotos('microphone','Wikimedia');
  assert.equal(found.photos[0].photographer,'Photographer');
  const saved = (await downloadPhoto('fixture',31,'Wikimedia')).photo;
  assert.equal(saved.asset,'work/fixture/photos/wikimedia-31.jpg');
  assert.equal(JSON.parse(await fs.readFile(path.join(temp,'public',saved.asset+'.json'))).license,'https://creativecommons.org/publicdomain/zero/1.0/');
  for(const state of ['license','host','svg','missing']) {
    mode = state;
    assert.equal((await searchPhotos('mic','Wikimedia')).photos.length,0);
    await assert.rejects(downloadPhoto('fixture',31,'Wikimedia'),/CC0/);
  }
  mode='quota'; await assert.rejects(searchPhotos('mic','Wikimedia'),/cuota/);
  const before=calls; await assert.rejects(downloadPhoto('../escape',31,'Wikimedia'),/inválido/); assert.equal(calls,before);
  const real=loader(), {validatePlan}=real('app/_lib/jobs.ts');
  const timeline={duration_frames:180,clips:[{id:'c',timeline_in_frame:0,source_in_frame:0,duration_frames:180,words:[{id:'w0',text:'Micrófono',source_start_frame:0,source_end_frame:150}]}]};
  const plan={version:1,style:'pink-demo-v1',cuts:[],backgrounds:[],cards:[{id:'p',kind:'photo',photo:saved,label:'Micrófono',theme:'base',anchor_word_id:'w0',offset_frames:0,duration_frames:150,beat:{anchor_word_id:'w0',offset_frames:0}}]};
  assert.equal((await validatePlan(plan,timeline)).length,0);
  plan.cards[0].photo.license='unknown'; assert.ok((await validatePlan(plan,timeline)).length);
  console.log('PASS Commons: sin credenciales, búsqueda, descarga/autor/licencia, cambio de licencia, origen privado, SVG, recurso ausente, cuota, traversal y validación del plan. Transporte simulado.');
} finally {await fs.rm(temp,{recursive:true,force:true});}
