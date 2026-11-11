import assert from 'node:assert/strict';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loader,root} from './test_support/load_ts.mjs';
const css=new Proxy({}, {get:(_,key)=>String(key)});
const mocks={[path.join(root,'app/_components/EditorialReviewPanel.module.css')]:css};
const load=loader(mocks);
const {EditorialReviewPanel,editorialReviewReason}=load('app/_components/EditorialReviewPanel.tsx');
// Use production exclusion, literal-timing and layout-fallback functions, with synthetic words only.
const edit=JSON.parse(execFileSync('python3',['-c',`
import sys,json
sys.path.insert(0,'scripts')
from editorial_controls import constrain_events
from editorial_timing import grounded_beat
from native_layout import reserve_editorial_layout
prefs={'editorial':{'version':1,'presence':'balanced','readingPace':'calm','emphasisStyle':'overlay','resourceStyle':'diagram','framingStyle':'stable','referenceAspects':[],'captionIntent':'both'},'vibe':'balanced','graphics':'few','graphic_kinds':['steps','compare'],'support_media':'video','emphasis_mode':'overlay'}
brief={'resourcePolicy':'relevant-only','preferences':prefs}
review={'version':1,'proposals':[],'warnings':[],'aestheticApproval':'pending'}
events=[{'proposalId':'p0','kind':'card','sentence':0,'labels':['las personas leen en casa'],'reason':'Explica una idea del discurso'},
 {'proposalId':'p1','kind':'steps','sentence':0,'labels':['las personas','texto inventado'],'reason':'Lista'},
 {'proposalId':'p2','kind':'broll','sentence':0,'anchor':'las personas'},
 {'proposalId':'p3','kind':'card','sentence':0,'labels':['texto inventado']},
 {'proposalId':'p4','kind':'card','sentence':0,'labels':['las personas']}]
text='Ahora las personas leen en casa durante las pausas'
sentence={'text':text,'start':0,'end':300}
words=[{'text':word,'start':i*20,'end':i*20+12} for i,word in enumerate(text.split())]
beats=[]
for event in constrain_events(events,brief,review['proposals']):
 beat,warnings,rejected=grounded_beat(event,sentence,words,55,prefs)
 decision={'id':event['proposalId'],'kind':event['kind'],'sentence':0,'status':'rejected','reason':rejected}
 if beat:
  beat['id']='beat-'+event['proposalId'];beats.append(beat)
  decision.update(status='accepted',reason=event.get('reason'),beatId=beat['id'])
  review['warnings'].extend({**warning,'beatId':beat['id']} for warning in warnings)
 review['proposals'].append(decision)
edit={'editorialVersion':1,'resourcePolicy':'relevant-only','fps':30,'beats':beats,'preferences':prefs,'editorialReview':review}
reserve_editorial_layout(edit,'Face detection missing; reserve layout without claiming a measured free band')
print(json.dumps(edit))
`],{cwd:root,encoding:'utf8'}));
const render=value=>renderToStaticMarkup(createElement(EditorialReviewPanel,{edit:value}));
let html=render(edit);
assert.match(html,/<dt>Propuestos<\/dt><dd>5<\/dd>/);
assert.match(html,/<dt>Aplicados<\/dt><dd>1<\/dd>/);
assert.match(html,/<dt>Descartados<\/dt><dd>4<\/dd>/);
assert.ok(html.includes('Lista de ideas'));
assert.ok(html.includes('Clip de apoyo'));
assert.ok(html.includes('Excluiste este tipo de apoyo'));
assert.ok(html.includes('Algún texto del gráfico no coincidía con tus palabras'));
const warning=edit.editorialReview.warnings.find(item=>item.requiredFrames);
assert.ok(html.includes(`necesita ${(warning.requiredFrames/30).toFixed(1)} s y dispone de ${(warning.frames/30).toFixed(1)} s`));
assert.ok(html.includes('No pudimos medir un espacio libre junto al rostro'));
assert.ok(html.includes('Aprobación estética pendiente'));
assert.ok(html.includes('puede haber cero sin que eso sea un fallo técnico'));
assert.ok(!/<details[^>]*\bopen(?:=|\s|>)/.test(html),'report details stay closed by default');
assert.ok(!/requiredFrames|Reading budget|Face detection|proposal-|beat-p|\.py|frames|overlay/i.test(html),'main product copy hides code and frame jargon');
assert.equal(render({...edit,editorialVersion:undefined}),'','old edits do not gain a panel');
html=render({...edit,beats:[],editorialReview:{...edit.editorialReview,proposals:[],warnings:[]}});
assert.ok(html.includes('conserva tu grabación sin apoyos adicionales'));
assert.ok(html.includes('<dt>Aplicados</dt><dd>0</dd>'));
assert.ok(!render({...edit,resourcePolicy:'showcase'}).includes('puede haber cero'),'showcase requirements are not mislabeled optional');
assert.ok(render({...edit,editorialReview:undefined}).includes('todavía no está disponible'));
html=render({...edit,editorialReview:{...edit.editorialReview,warnings:[{reason:'Reading budget exceeds available interval; literal excerpt retained and speech unchanged',beatId:'removed',requiredFrames:90,frames:30}]}});
assert.ok(html.includes('Propuesta sin aplicar.'));
assert.ok(html.includes('Este apoyo no aparece en la edición actual.'));
assert.ok(editorialReviewReason('No licensed, visually relevant media candidate accepted').includes('licencia comprobada'));
for(const reason of ['work/private/source.mp4','/Users/private/video.mov','Traceback frames=150','Unknown internal engine message']) {
 assert.equal(editorialReviewReason(reason),'Revisa la relación de este apoyo con tus palabras en la vista previa.');
}
// Integration smoke: production execution panel mounts review without changing existing media QC.
let index=0;
const run={state:'exported',stage:'Listo',quality:{state:'pass',audio:{integratedLufs:-17,truePeakDbtp:-2},errors:[],warnings:[]}};
const fullEdit={...edit,scenes:[{id:'source',name:'Toma',from:0,frames:300}],frames:300,width:720,height:1280,issues:[],assets:[],music:'music.wav'};
const values=[['source'],run,fullEdit,'',false];
const {LocalExecutionPanel}=loader({...mocks,react:{useRef:()=>({current:null}),useEffect:()=>{},useState:()=>[values[index++],()=>{}]},
 '@remotion/player':{Player:'Player'},[path.join(root,'src/OneShotVideo')]:{OneShotVideo:'Video'}})('app/_components/LocalExecutionPanel.tsx');
const tree=LocalExecutionPanel({sessionId:'synthetic',sources:[{id:'source',name:'Toma'}],onBusy:()=>{}});
function nodes(node){return !node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...nodes(node.props?.children)];}
assert.ok(nodes(tree).some(node=>typeof node.type==='function' && node.type.name==='EditorialReviewPanel'));
assert.ok(nodes(tree).some(node=>node.props?.['aria-label']==='Revisión técnica del MP4'),'existing media QC remains');
console.log('PASS editorial review UI: production warning/rejection fixture, actual counts, reading seconds, translated fallbacks, legacy/zero behavior, media QC preserved.');
