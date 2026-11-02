import assert from 'node:assert/strict';
import path from 'node:path';
import { loader, root, plain } from './test_support/load_ts.mjs';
const timeline = { fps: 30, duration_frames: 300, clips: [] };
const plan = { version: 1, style: 'pink-demo-v1', cuts: [], cards: [], backgrounds: [] };
let response = JSON.stringify({ cuts: [], cards: [], backgrounds: [], emphasis_words: [], notes: 'Propuesta sintética' });
let failure;
let calls = 0;
const load = loader({ [path.join(root, 'app/_lib/solEditor')]: {
  requestSolProposal: async (job, fingerprint, request, schema) => {
    calls++;
    assert.equal(job, 'fixture');
    assert.match(fingerprint, /^[a-f0-9]{64}$/);
    assert.ok(request.system.includes('preferencias'));
    assert.equal(schema.type, 'object');
    assert.ok(schema.properties.cards.items.required.includes('text'));
    if (failure) throw failure;
    return response;
  },
}});
const { proposePlan } = load('app/_lib/propose.ts');
const { editorAiFingerprint } = load('app/_lib/editorAi.ts');
assert.notEqual(editorAiFingerprint(timeline, plan), editorAiFingerprint({ ...timeline, source_sha256: 'changed' }, plan));
let result = await proposePlan('fixture', timeline, plan);
assert.equal(result.notes, 'Propuesta sintética');
assert.deepEqual(plain(plan.cards), []);
response = '{broken';
await assert.rejects(proposePlan('fixture', timeline, plan), /JSON válido/);
response = '{"unexpected":true}';
await assert.rejects(proposePlan('fixture', timeline, plan), /formato editorial/);
failure = new Error('Sol account limit');
await assert.rejects(proposePlan('fixture', timeline, plan), /Sol account limit/);
assert.equal(calls, 4, 'A failure must not retry another model or provider');
console.log('PASS: Sol proposal path, explicit schema, private fingerprint changes, JSON validation and no fallback.');
