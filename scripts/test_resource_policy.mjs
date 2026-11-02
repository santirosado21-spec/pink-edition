import assert from 'node:assert/strict';
import {loader} from './test_support/load_ts.mjs';
const load=loader();const {checkOneShotBrief}=load('src/oneShotBrief.ts');const {DEFAULT_PREFERENCES}=load('src/preferences.ts');
const brief={version:1,objective:'Explicar la relación entre prisa y estrés',audience:'Adultos interesados en hábitos',preferences:{...DEFAULT_PREFERENCES,topic:'Estrés',graphics:'many',transition:'punch'},musicMood:'calm',musicSource:'licensed-library',brollSource:'licensed-library',resourceNotes:'',confirmed:true};
assert.equal(checkOneShotBrief(brief).length,0,'Legacy briefs retain their strict contract');
assert.ok(checkOneShotBrief({...brief,preferences:{...brief.preferences,graphics:'few'}}).length);
assert.equal(checkOneShotBrief({...brief,resourcePolicy:'relevant-only',preferences:{...brief.preferences,graphics:'few'}}).length,0,'Explicit natural mode permits fewer resources');
assert.ok(checkOneShotBrief({...brief,resourcePolicy:'invented'}).length);
assert.ok(checkOneShotBrief({...brief,unexpected:true}).length);
console.log('PASS explicit resource policy, legacy compatibility and strict validation');
for (const patch of [{support_media:'still'},{support_media:'none'},{emphasis_mode:'none'},{graphic_kinds:[]}]) {
 assert.ok(checkOneShotBrief({...brief,preferences:{...brief.preferences,...patch}}).length);
 assert.equal(checkOneShotBrief({...brief,resourcePolicy:'relevant-only',preferences:{...brief.preferences,...patch}}).length,0);
}
assert.ok(checkOneShotBrief({...brief,resourcePolicy:'relevant-only',preferences:{...brief.preferences,graphic_kinds:'bad'}}).length);
