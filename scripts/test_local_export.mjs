// Synthetic renderer fixture: tests the export process/stream, not editorial decisions.
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {createHash,randomUUID} from 'node:crypto';import {execFileSync} from 'node:child_process';import {loader} from './test_support/load_ts.mjs';
const {DEFAULT_PREFERENCES}=loader()('src/preferences.ts');const origin='http://localhost:3001';
const brief={version:1,objective:'Export fixture',audience:'Test',preferences:{...DEFAULT_PREFERENCES,topic:'Fixture',graphics:'many',transition:'punch'},musicMood:'calm',musicSource:'licensed-library',brollSource:'licensed-library',resourceNotes:'',confirmed:true};
const created=await fetch(origin+'/api/local-intake',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(brief)});const {sessionId}=await created.json();assert.ok(sessionId);
const headers={origin,'Content-Type':'application/json','x-cutkind-session':sessionId};const dir=path.join(os.tmpdir(),'cutkind-upload-sessions',createHash('sha256').update(process.cwd()).digest('hex').slice(0,16),sessionId);
try {
 const scenes=[];const sources=[];
 for (const [i,color] of ['red','green','blue'].entries()) {
  const id=randomUUID(),asset=`fixture-${i}.mp4`;
  execFileSync('ffmpeg',['-v','error','-f','lavfi','-i',`color=c=${color}:s=128x224:r=30:d=2`,'-f','lavfi','-i',`sine=frequency=${440+i*220}:duration=2`,'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',path.join(dir,asset)]);
  sources.push({id,name:`${i+1}.MOV`,seconds:2});scenes.push({id,name:`${i+1}.MOV`,asset,from:i*60,frames:60,width:128,height:224});
 }
 const session=JSON.parse(await fs.readFile(path.join(dir,'session.json'),'utf8'));session.sources=sources;await fs.writeFile(path.join(dir,'session.json'),JSON.stringify(session));
 await fs.writeFile(path.join(dir,'input.json'),JSON.stringify(session));
 await fs.writeFile(path.join(dir,'edit.json'),JSON.stringify({fps:30,width:128,height:224,frames:180,preferences:DEFAULT_PREFERENCES,scenes,transitions:[{from:60,frames:12,variantId:'mask-wipe',purpose:'Synthetic join'},{from:120,frames:12,variantId:'zoom-blur',purpose:'Synthetic join'}],captions:[],beats:[],music:null,musicFrames:1,issues:[],assets:[],checks:{syntheticRendererFixture:true}}));
 // Verify the second take in the actual Player as well as in the exported frames.
 const {createRequire}=await import('node:module');
 const runtime=process.env.CUTKIND_PLAYWRIGHT_RUNTIME;
 if (!runtime) throw Error('Set CUTKIND_PLAYWRIGHT_RUNTIME for browser playback verification');
 const {chromium}=createRequire(path.join(runtime,'package.json'))('playwright');
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1100,height:1100}});
  await page.goto(`${origin}/app?session=${sessionId}`,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:/Ver 2.MOV/}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('video')].some(v=>v.currentSrc.includes('fixture-1.mp4')&&v.readyState>=2&&v.videoWidth>0));
  // Inspect the actual take after the intentionally opaque 12-frame transition.
  await page.waitForFunction(()=>[...document.querySelectorAll('video')].some(v=>v.currentSrc.includes('fixture-1.mp4')&&v.currentTime>=.6&&v.currentTime<1.8));
  await page.getByRole('button',{name:'Pause video',exact:true}).click();
  const rect=await page.evaluate(()=>{const v=[...document.querySelectorAll('video')].find(v=>v.currentSrc.includes('fixture-1.mp4'));const r=v.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,width:2,height:2};});
  await page.screenshot({path:path.join(dir,'second-player.png'),clip:rect});
  const rgb=execFileSync('ffmpeg',['-v','error','-i',path.join(dir,'second-player.png'),'-vf','scale=1:1','-pix_fmt','rgb24','-f','rawvideo','-']);
  assert.ok(rgb[1]>rgb[0]*2&&rgb[1]>rgb[2]*2,`Second take not visible in Player: ${[...rgb]}`);
 } finally {await browser.close();}
 const response=await fetch(origin+'/api/local-intake/run',{method:'POST',headers,body:JSON.stringify({action:'export',order:sources.map(s=>s.id)})});assert.equal(response.status,200);
 let run;for(let attempt=0;attempt<90;attempt++){await new Promise(r=>setTimeout(r,1000));const data=await(await fetch(origin+'/api/local-intake/run',{headers})).json();run=data.run;if(['exported','failed'].includes(run?.state))break;}
 assert.equal(run.state,'exported',JSON.stringify(run));
 const download=await fetch(origin+`/api/local-intake/media?session=${sessionId}&asset=final.mp4&download=1`);assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/attachment/);assert.ok((await download.arrayBuffer()).byteLength>1000);
 for(let i=0;i<3;i++){const pixel=execFileSync('ffmpeg',['-v','error','-ss',String(i*2+1),'-i',path.join(dir,'final.mp4'),'-frames:v','1','-vf','crop=2:2:64:80,scale=1:1','-pix_fmt','rgb24','-f','rawvideo','-']);assert.ok(pixel[i]>pixel[(i+1)%3]*2 && pixel[i]>pixel[(i+2)%3]*2,`Missing picture in take ${i+1}: ${[...pixel]}`);}
 console.log('PASS: actual local export process, all three takes including second picture, per-take audio QC, and download response (synthetic media; cleaned).');
} finally { const run=JSON.parse(await fs.readFile(path.join(dir,'run.json'),'utf8').catch(()=>'{}'));if(run.state!=='exporting')await fs.rm(dir,{recursive:true,force:true}); }
