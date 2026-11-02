import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {bundle} from '@remotion/bundler';
import {selectComposition,renderStill} from '@remotion/renderer';
const require=createRequire(path.join(process.env.CUTKIND_PLAYWRIGHT_RUNTIME,'package.json'));
const {chromium}=require('playwright');
const catalog=JSON.parse(await fs.readFile('style/catalog-v1.json','utf8'));
const origin='http://localhost:3001',output=await fs.mkdtemp(path.join(os.tmpdir(),'cutkind-font-check-'));
const browser=await chromium.launch({headless:true});let session,preferences;
try {
 const page=await browser.newPage({viewport:{width:1100,height:1100}});
 await page.goto(origin+'/app',{waitUntil:'networkidle'});
 await page.getByLabel('¿Qué debe entender o sentir quien vea el video?').fill('Prueba de tipografías');
 await page.getByLabel('¿A quién va dirigido?').fill('Creadores');
 await page.getByLabel('Tema del video',{exact:true}).fill('Diseño');
 await page.getByRole('button',{name:'Siguiente →',exact:true}).click();
 await page.getByRole('radio',{name:'Cine íntimo',exact:true}).waitFor();
 await page.getByRole('button',{name:'Pulso',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Pulso',exact:true}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Ver opciones anteriores',exact:true}).click();
 for(const font of catalog.fonts){
  await page.getByRole('radio',{name:font.title,exact:true}).click();
  assert.equal(await page.locator('[data-selected-font]').getAttribute('data-selected-font'),font.id);
  assert.equal(await page.evaluate(f=>document.fonts.check(`${f.fontStyle ?? 'normal'} ${f.weight} 30px "CutkindVideo${f.id}"`),font),true);
  const response=await fetch(origin+'/api/editor-font/'+font.id);
  assert.equal(response.status,200);assert.equal(response.headers.get('access-control-allow-origin'),'*');assert.ok((await response.arrayBuffer()).byteLength>10000);
 }
 await page.getByRole('radio',{name:'Cine íntimo',exact:true}).click();
 await page.screenshot({path:path.join(output,'questionnaire.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});
 await page.getByRole('button',{name:'Siguiente →',exact:true}).click();
 await page.getByRole('combobox',{name:'Carácter de la música',exact:true}).selectOption('documentary');
 await page.getByRole('combobox',{name:'Origen de la música',exact:true}).selectOption('licensed-library');
 await page.getByRole('combobox',{name:'Origen de los B-rolls',exact:true}).selectOption('licensed-library');
 await page.getByRole('button',{name:'Siguiente →',exact:true}).click();
 const confirmed=page.waitForResponse(r=>r.url().endsWith('/api/local-intake')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Confirmar encargo',exact:true}).click();const response=await confirmed;const body=await response.json();assert.equal(response.status(),200,JSON.stringify(body));session=body.sessionId;
 const state=await (await fetch(origin+'/api/local-intake/run',{headers:{'x-cutkind-session':session}})).json();
 preferences=state.session.brief.preferences;assert.equal(preferences.font,'cinema');assert.equal(preferences.editorialFamilyId,'pulso');
 assert.equal((await fetch(origin+'/api/editor-font/unknown')).status,404);
} finally {
 if(session)await fetch(origin+'/api/local-intake',{method:'DELETE',headers:{Origin:origin,'x-cutkind-session':session}});
 await browser.close();
}
const serveUrl=await bundle({entryPoint:path.resolve('src/oneShotEntry.tsx'),publicDir:null,outDir:path.join(output,'bundle')});
for(const font of catalog.fonts){
 const edit={fps:30,width:720,height:1280,frames:120,preferences:{...preferences,font:font.id},scenes:[],captions:[{text:'Edición con carácter, México y mañana.',startMs:0,endMs:4000,timestampMs:null,confidence:null}],beats:[{id:'card',kind:'card',from:0,frames:120,quote:'Cada historia tiene su propio ritmo.',title:'Cada historia tiene su propio ritmo.',labels:[],reason:'Test'}],music:null,musicFrames:1,issues:[],assets:[],checks:{}};
 const inputProps={edit,mediaBase:origin+'/api/local-intake/media?session=synthetic'};
 const composition=await selectComposition({serveUrl,id:'OneShot',inputProps});
 await renderStill({serveUrl,composition,inputProps,frame:30,output:path.join(output,font.id+'.png')});
}
console.log('PASS: ten loaded fonts, mobile layout, saved brief selection and ten Remotion renders. Evidence: '+output);
