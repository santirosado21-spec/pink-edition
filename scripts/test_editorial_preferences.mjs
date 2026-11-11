import assert from 'node:assert/strict';
import {loader,plain} from './test_support/load_ts.mjs';
const load=loader();
const {DEFAULT_PREFERENCES,checkPreferences}=load('src/preferences.ts');
const {EDITORIAL_CHOICES,newEditorialDirection,checkEditorialDirection}=load('src/editorialDirection.ts');
const {INTAKE_PRESETS,copyPreferencePatch,initialIntakePreferences,quickPreferences,matchesIntakePreset}=load('src/intakePresets.ts');

assert.equal(Object.hasOwn(DEFAULT_PREFERENCES,'editorial'),false,'global defaults do not migrate old manifests');
assert.deepEqual(plain(checkPreferences(DEFAULT_PREFERENCES)),[]);
const old=plain({...DEFAULT_PREFERENCES,font:'serif',brand_color:'#123456',graphics:'none',support_media:'none'});
const before=JSON.stringify(old);
const restored=initialIntakePreferences(old);
assert.equal(restored.editorial,undefined,'existing profile stays legacy until explicit upgrade');
assert.equal(restored.font,'serif');assert.equal(restored.brand_color,'#123456');
assert.equal(JSON.stringify(old),before,'initialization does not change persisted profile');
assert.deepEqual(plain(checkPreferences(restored)),[]);

for(const bad of [null,[],true,1,'v1',{}, {version:2}, {...newEditorialDirection(),version:'1'}, {...newEditorialDirection(),unknown:true}]) {
  assert.ok(checkEditorialDirection(bad).length,JSON.stringify(bad));
  assert.ok(checkPreferences({...DEFAULT_PREFERENCES,editorial:bad}).length);
}
for(const [key,choices] of Object.entries(EDITORIAL_CHOICES)) {
  if(key==='referenceAspects') continue;
  for(const bad of [undefined,null,[],{},0,'unknown']) assert.ok(checkEditorialDirection({...newEditorialDirection(),[key]:bad}).length,`${key}: ${JSON.stringify(bad)}`);
  for(const choice of choices) assert.deepEqual(plain(checkEditorialDirection({...newEditorialDirection(),[key]:choice})),[]);
}
for(const aspects of [undefined,null,{},'rhythm',['colors'],['rhythm','rhythm'],[null],Array(1),['rhythm','typography','composition','resources','rhythm']]) {
  assert.ok(checkEditorialDirection({...newEditorialDirection(),referenceAspects:aspects}).length,'invalid aspects rejected');
}
assert.deepEqual(plain(checkEditorialDirection(newEditorialDirection({referenceAspects:['rhythm','typography','composition','resources']}))),[]);
assert.ok(checkPreferences({...DEFAULT_PREFERENCES,unknown:true}).length,'unknown outer fields still rejected');

for(const preset of INTAKE_PRESETS) {
  const value={...quickPreferences(),...copyPreferencePatch(preset.preferences)};
  assert.deepEqual(plain(checkPreferences(value)),[]);
  assert.ok(matchesIntakePreset(value,preset,preset.musicMood));
  // JSON field order is not a style change.
  value.editorial=Object.fromEntries(Object.entries(value.editorial).reverse());
  assert.ok(matchesIntakePreset(value,preset,preset.musicMood));
}
const first=quickPreferences();const second=quickPreferences();
first.editorial.referenceAspects.push('resources');first.graphic_kinds.push('question');
assert.deepEqual(plain(second.editorial.referenceAspects),[]);
assert.deepEqual(plain(INTAKE_PRESETS[1].preferences.editorial.referenceAspects),[]);
assert.deepEqual(plain(second.graphic_kinds),['compare','steps']);
const branded={...second,font:'serif',brand_color:'#123456',topic:'Tema propio'};
const reset={...branded,...copyPreferencePatch(INTAKE_PRESETS[1].preferences)};
assert.ok(matchesIntakePreset(reset,INTAKE_PRESETS[1],'none'));
assert.equal(reset.brand_color,'#123456');assert.equal(reset.topic,'Tema propio');
const resumed=initialIntakePreferences(first);
resumed.editorial.referenceAspects.push('rhythm');
assert.deepEqual(plain(first.editorial.referenceAspects),['resources'],'resumed draft owns its nested reference array');
assert.equal(INTAKE_PRESETS[2].preferences.emphasis_mode,'fullscreen');
assert.equal(INTAKE_PRESETS[2].preferences.editorial.emphasisStyle,'fullscreen','Impacto explicitly promises fullscreen');
console.log('PASS editorial preferences: legacy compatibility, strict version/enums/arrays, preset reset and isolated drafts.');
