import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import { loader,root,plain } from './test_support/load_ts.mjs';
const style=JSON.parse(await fs.readFile(path.join(root,'style/pink-demo-v1.json')));
const real=loader();
const {DEFAULT_PREFERENCES}=real('src/preferences.ts');
const {safeCardTop,protectedHead}=real('src/visualSafety.ts');
const timeline={fps:30,duration_frames:300,clips:[{id:'one',source_in_frame:0,timeline_in_frame:0,duration_frames:300,head:{top:250,bottom:900,left:250,right:800},face:{top:250,bottom:900,left:250,right:800},words:['Editar','videos','requiere','mucho','trabajo','manual.'].map((text,i)=>({id:`w${i}`,text,source_start_frame:i*30,source_end_frame:(i+1)*30}))}]};
const plan={version:1,style:'pink-demo-v1',cuts:[],cards:[],backgrounds:[],preferences:{...DEFAULT_PREFERENCES,graphics:'many'},zooms:[]};
let direction={summary:'Explica el trabajo que requiere editar videos manualmente.',beats:[{quote:'Editar videos requiere mucho trabajo',purpose:'Mostrar la actividad de edición de video mientras se explica su esfuerzo.',visual:'stock_photo',query:'video editing timeline',expected_image:'Una pantalla con timeline de edición de video.'}]};
let matches=true,searches=0,downloads=0,checks=0,available=true;
const env={PEXELS_API_KEY:'fixture-not-sent',EDITOR_STOCK_PROVIDER:'pexels'};
const mockExec=(_cmd,_args,_opts,callback)=>callback(null,Buffer.from('jpeg-fixture'),Buffer.alloc(0));
mockExec[promisify.custom]=async()=>({stdout:Buffer.from('jpeg-fixture'),stderr:Buffer.alloc(0)});
const fakePhoto={provider:'Pexels',id:42,asset:'work/fixture/photos/pexels-42.jpg',alt:'Video editing workstation',photographer:'Fixture',url:'https://www.pexels.com/photo/42/',license:'https://www.pexels.com/legal-pages/license/'};
const load=loader({
 [path.join(root,'app/_lib/solEditor')]:{requestSolProposal:async (_id,_hash,req)=>JSON.stringify(req.messages[0].images?{matches,visible_evidence:'Pantalla con pistas de video y una línea de tiempo.',reason:'La acción coincide con la frase.'}:direction)},
 [path.join(root,'app/_lib/stockPhotos')]:{searchPhotos:async q=>{searches++;assert.equal(q,'video editing timeline');return {photos:available?[{id:42}]:[]};},downloadPhoto:async(_job,_id,provider)=>{downloads++;return {photo:{...fakePhoto,provider,asset:`work/fixture/photos/${provider.toLowerCase()}-42.jpg`}};}},
 'node:child_process':{execFile:mockExec},
},{process:{...process,env}});
const {proposeContextualPlan,locateQuote}=load('app/_lib/contextualProposal.ts');
const {flatWords}=real('app/_lib/proposalPlan.ts');
const run=()=>proposeContextualPlan('fixture',timeline,plan,'fingerprint');
assert.deepEqual(plain(locateQuote(flatWords(timeline),'Editar videos requiere mucho trabajo')), [0,4]);
assert.equal(locateQuote([...flatWords(timeline),...flatWords(timeline)],'Editar videos'),null); checks++;
let result=await run(); assert.equal(result.report.accepted,1); assert.equal(result.plan.cards[0].photo.id,42); assert.equal(plan.cards.length,0); assert.ok(result.plan.cards[0].top > 1400); assert.equal(result.plan.backgrounds.length,0); assert.equal(searches,1); checks++;
matches=false; result=await run(); assert.equal(result.report.accepted,0); assert.equal(result.report.assets[0].status,'no_suitable_image'); checks++;
matches=true; delete env.PEXELS_API_KEY; const before=searches; result=await run(); assert.equal(searches,before); assert.equal(result.report.assets[0].status,'missing_configuration'); assert.equal(result.report.accepted,0); checks++;
env.PEXELS_API_KEY='fixture';
const original=direction;
direction={...original,beats:[{...original.beats[0],quote:'Una frase inventada'}]}; assert.equal((await run()).report.invalid,1); assert.equal(searches,before); checks++;
direction={...original,beats:[{...original.beats[0],visual:'needs_original'}]}; result=await run(); assert.equal(result.report.accepted,0); assert.match(result.report.reasons.join(' '),/captura real/); assert.equal(searches,before); checks++;
direction=original;
result=await proposeContextualPlan('fixture',timeline,{...plan,preferences:{...plan.preferences,graphics:'none'}},'hash'); assert.equal(result.report.accepted,0); assert.equal(searches,before); checks++;
result=await proposeContextualPlan('fixture',{...timeline,clips:[{...timeline.clips[0],face:null}]},plan,'hash'); assert.equal(result.report.accepted,0); assert.equal(searches,before); checks++;
const initial=await run(); result=await proposeContextualPlan('fixture',timeline,initial.plan,'hash'); assert.equal(result.report.accepted,0); assert.deepEqual(plain(result.plan.cards),plain(initial.plan.cards)); checks++;
env.EDITOR_STOCK_PROVIDER='pixabay'; env.PIXABAY_API_KEY='fixture-pixabay';
result=await run(); assert.equal(result.report.accepted,1); assert.equal(result.plan.cards[0].photo.provider,'Pixabay'); assert.equal(result.report.assets[0].provider,'Pixabay'); checks++;
env.EDITOR_STOCK_PROVIDER='wikimedia'; delete env.PIXABAY_API_KEY; delete env.PEXELS_API_KEY;
result=await run(); assert.equal(result.report.accepted,1); assert.equal(result.report.assets[0].provider,'Wikimedia'); checks++;
available=false; result=await run(); assert.equal(result.report.accepted,0); assert.equal(result.report.assets[0].status,'no_results'); checks++;

// Posición segura en zooms extremos y entradas, no sólo en un fotograma estático.
for(const scale of [1,1.15,1.35]) for(const top of [0,150,300,650]){
 const t={...timeline,clips:[{...timeline.clips[0],head:{top,bottom:top+500,left:100,right:950},face:{top,bottom:top+500,left:100,right:950}}]};
 const p={...plan,take_transition:'punch',zooms:scale===1?[]:[{id:'z',anchor_word_id:'w0',offset_frames:0,duration_frames:300,scale}]};
 const y=safeCardTop(t,p,style,0,180,300), head=protectedHead(t,p,style,0,180);
 if(y!==null){assert.ok(y+style.graphics.height+style.graphics.enter_offset+40<=style.height-80); assert.ok(y-40>=head.bottom || y+style.graphics.height+style.graphics.enter_offset+40<=head.top); assert.ok(y-40>=style.captions.top+style.captions.line_height*style.captions.max_lines+40 || y+style.graphics.height+style.graphics.enter_offset+40<=style.captions.top-40);}
} checks++;
assert.equal(safeCardTop({clips:[{...timeline.clips[0],face:null}]},plan,style,0,180,300),null); checks++;
console.log(`PASS: ${checks} grupos: citas exactas/ambiguas, búsqueda semántica, rechazo visual, clave ausente, preferencias, originales, preservación y cara/captions en 12 encuadres.`);
