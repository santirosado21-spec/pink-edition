import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { loader, root } from './test_support/load_ts.mjs';
const { validatePlan } = loader()('app/_lib/jobs.ts');
const timeline = { duration_frames: 90, clips: [{ source_in_frame: 0, timeline_in_frame: 0, words: [{ id: 'w0', source_start_frame: 0 }] }] };
const cc0 = 'https://creativecommons.org/publicdomain/zero/1.0/';
const samples = [
  ['Wikimedia', 42, cc0, true], ['Wikimedia', 42, 'unknown', false], ['Wikimedia', true, cc0, false],
  ['Wikimedia', 42.5, cc0, false], ['Wikimedia', Number.MAX_SAFE_INTEGER + 1, cc0, false],
  ['Pixabay', 42, 'https://pixabay.com/service/license-summary/', true], ['Pixabay', 42, cc0, false],
  ['Pexels', 42, '', true], ['Pexels', -1, '', false],
  ['Openverse', '11111111-1111-4111-8111-111111111111', cc0, true],
  ['Openverse', 'invalid', cc0, false], ['Openverse', '11111111-1111-4111-8111-111111111111', '', false],
];
const fixtures = samples.map(([provider, id, license, valid]) => ({
  valid, timeline, plan: { style: 'pink-demo-v1', version: 1, cuts: [], backgrounds: [], cards: [{
    id: 'photo', kind: 'photo', theme: 'base', anchor_word_id: 'w0', offset_frames: 0, duration_frames: 60,
    beat: { anchor_word_id: 'w0', offset_frames: 0 }, photo: { provider, id, license,
      asset: `work/fixture/photos/${provider.toLowerCase()}-${provider === 'Openverse' ? '11111111-1111-4111-8111-111111111111' : 42}.jpg` },
  }] },
}));
const python = JSON.parse(execFileSync(path.join(root, '.venv/bin/python'), ['-c',
  'import json,sys; sys.path.insert(0,"scripts"); from plan_io import check_plan; print(json.dumps([not check_plan(c["plan"],c["timeline"]) for c in json.load(sys.stdin)]))'],
{ cwd: root, input: JSON.stringify(fixtures), encoding: 'utf8' }));
for (let i = 0; i < fixtures.length; i++) {
  const c = fixtures[i];
  assert.equal((await validatePlan(c.plan, c.timeline)).length === 0, c.valid, `TS ${i}`);
  assert.equal(python[i], c.valid, `Python ${i}`);
}
console.log(`PASS: ${fixtures.length} shared photo cases, TS/Python provider, ID and license parity.`);
