import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {loader} from './test_support/load_ts.mjs';
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'cutkind-stock-')); await fs.mkdir(path.join(temp,'work/fixture'),{recursive:true}); await fs.writeFile(path.join(temp,'work/fixture/timeline.json'),'{}');
const env={PEXELS_API_KEY:'test-secret-not-sent'}; let bad=false,calls=0;
const photo={id:17,url:'https://www.pexels.com/photo/17/',photographer:'Fixture',alt:'Video editing timeline',src:{medium:'https://images.pexels.com/photos/17/medium.jpeg',large2x:'https://images.pexels.com/photos/17/large.jpeg'}};
const fetch=async(url,opts)=>{url=String(url);calls++;
 if(url.startsWith('https://api.pexels.com/v1/')){assert.equal(opts.headers.Authorization,env.PEXELS_API_KEY);return Response.json(url.includes('search?')?{photos:[photo]}:{...photo,src:bad?{...photo.src,large2x:'http://127.0.0.1/private'}:photo.src});}
 assert.ok(url.startsWith('https://images.pexels.com/'));assert.equal(opts.redirect,'error');return new Response(new Uint8Array([255,216,255,217]),{headers:{'content-type':'image/jpeg'}});
};
const {searchPhotos,downloadPhoto}=loader({}, {process:{...process,cwd:()=>temp,env},fetch,AbortSignal,URLSearchParams})('app/_lib/stockPhotos.ts');
try{
 const found=await searchPhotos('video editing','Pexels'); assert.equal(found.photos[0].id,17);
 const {photo:saved}=await downloadPhoto('fixture',17,'Pexels');assert.equal(saved.provider,'Pexels');const credit=JSON.parse(await fs.readFile(path.join(temp,'public',saved.asset+'.json')));assert.equal(credit.photographer,'Fixture'); assert.equal(credit.license,'https://www.pexels.com/legal-pages/license/');
 bad=true;await assert.rejects(downloadPhoto('fixture',17,'Pexels'),/Origen/);
 await assert.rejects(downloadPhoto('../escape',17,'Pexels'),/inválido/);
 const before=calls;delete env.PEXELS_API_KEY;await assert.rejects(searchPhotos('editing','Pexels'),/PEXELS_API_KEY/);assert.equal(calls,before);
 console.log('PASS: búsqueda Pexels, descarga con procedencia, host validado, traversal rechazado y clave ausente sin llamadas. Transporte simulado.');
}finally{await fs.rm(temp,{recursive:true,force:true})}
