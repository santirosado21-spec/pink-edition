import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loader,plain,root} from './test_support/load_ts.mjs';
const load=loader();
const {INTAKE_PRESETS,quickPreferences,QUICK_OBJECTIVE,QUICK_AUDIENCE}=load('src/intakePresets.ts');
const {checkOneShotBrief}=load('src/oneShotBrief.ts');
const briefs=INTAKE_PRESETS.map(p=>({version:1,objective:QUICK_OBJECTIVE,audience:QUICK_AUDIENCE,preferences:{...quickPreferences(),...p.preferences},musicMood:p.musicMood,musicSource:'licensed-library',brollSource:'licensed-library',resourceNotes:'',resourcePolicy:'relevant-only',confirmed:true}));
for(const brief of briefs) assert.deepEqual(plain(checkOneShotBrief(brief)),[]);
// Cross-language contract: the exact UI presets feed the production Python controls.
const result=JSON.parse(execFileSync('python3',['-c',`
import json,sys
sys.path.insert(0,'scripts')
from editorial_controls import event_limits,constrain_events,director_input
briefs=json.load(sys.stdin)
events=[{'kind':k,'sentence':i} for i in range(5) for k in ['card','compare','steps','broll']]
print(json.dumps([{'limits':event_limits(b),'events':constrain_events(events,b),'context':director_input(b,[],[])} for b in briefs]))
`],{cwd:root,input:JSON.stringify(briefs),encoding:'utf8'}));
assert.deepEqual(result[0].limits,[{card:0,compare:0,steps:0,broll:0,icon:0},360]);
assert.deepEqual(result[0].events,[]);
for(const [index,clipLimit,gap] of [[1,2,240],[2,4,180]]) {
 assert.equal(result[index].limits[0].broll,clipLimit);
 assert.equal(result[index].limits[1],gap);
 assert.equal(result[index].events.filter(e=>e.kind==='broll').length,clipLimit);
 assert.equal(result[index].events.filter(e=>e.kind==='compare').length,1);
}
assert.equal(result[1].context.emphasis,'overlay');assert.equal(result[2].context.emphasis,'fullscreen');
for(const x of result) {
 assert.ok(!('preferences' in x.context));assert.ok(!('musicMood' in x.context));
 assert.equal(x.context.intent.objective,QUICK_OBJECTIVE);
}
const before=Buffer.byteLength(JSON.stringify({brief:briefs[1],implementedReferencePatterns:[],referencePolicy:'Candidatos observados, no gustos aprobados. Respetar siempre las preferencias del brief; no proponer variantes sin renderer.',sentences:[]}));
const after=Buffer.byteLength(JSON.stringify(result[1].context));
assert.ok(after<before);
console.log(`PASS 3 valid UI presets → Python limits/exclusions. Control payload ${before} → ${after} bytes (excludes transcript/references; not a token measurement).`);
