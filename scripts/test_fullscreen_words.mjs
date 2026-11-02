import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import {bundle} from '@remotion/bundler';
import {selectComposition,renderStill} from '@remotion/renderer';
import {loader} from './test_support/load_ts.mjs';
const {DEFAULT_PREFERENCES}=loader()('src/preferences.ts');
const output=path.resolve('work/questionnaire-resources');await fs.mkdir(output,{recursive:true});
const build=await fs.mkdtemp(path.join(os.tmpdir(),'cutkind-resource-stills-'));
const serveUrl=await bundle({entryPoint:path.resolve('src/oneShotEntry.tsx'),publicDir:null,outDir:path.join(build,'bundle')});
for(const [name,width,height,font] of [['portrait',720,1280,'documentary'],['landscape',1280,720,'cinema']]) {
 const edit={fps:30,width,height,frames:120,visualLayoutVersion:3,captionLayoutVersion:2,preferences:{...DEFAULT_PREFERENCES,font,editorialFamilyId:'enlace',emphasis_mode:'fullscreen',brand_color:'#f36b52'},scenes:[],captions:['Tu','historia','importa.'].map((text,i)=>({text,startMs:500+i*600,endMs:1100+i*600,timestampMs:null,confidence:null})),beats:[{id:'words',kind:'card',from:15,frames:65,quote:'Tu historia importa.',title:'Tu historia importa.',labels:[],reason:'Synthetic test',overlayTop:0}],music:null,musicFrames:1,issues:[],assets:[],checks:{}};
 const inputProps={edit,mediaBase:'http://localhost:3001/api/local-intake/media?session=synthetic'};
 const composition=await selectComposition({serveUrl,id:'OneShot',inputProps});
 for(const frame of [30,100])await renderStill({serveUrl,composition,inputProps,frame,output:path.join(output,`${name}-${frame}.png`)});
}
console.log('PASS four actual Remotion stills: portrait/landscape inside/outside the fullscreen event. Synthetic content; no voice or motion claim. '+output);
