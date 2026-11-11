import assert from 'node:assert/strict';
import path from 'node:path';
import { loader, root, plain } from './test_support/load_ts.mjs';

// Video sintético: una toma de 10 s a 30 fps, 20 palabras de 15 frames.
const FPS = 30;
const words = Array.from({ length: 20 }, (_, index) => ({
  id: `w${index}`, text: `palabra${index}`, source_start_frame: index * 15, source_end_frame: (index + 1) * 15,
}));
words[7].text = '3';
const timeline = { fps: FPS, duration_frames: 300, clips: [{ timeline_in_frame: 0, duration_frames: 300, source_in_frame: 0, words }] };
const plan = {
  version: 1, style: 'pink-demo-v1',
  cuts: [{ id: 'c1', label: 'dos tres', theme: 'stress', anchor_word_id: 'w2', offset_frames: 0, duration_frames: 30, style: 'solid', last_word_id: 'w3' }],
  cards: [{ id: 'k1', label: 'duda', theme: 'base', anchor_word_id: 'w6', offset_frames: 0, duration_frames: 45, kind: 'question', beat: { anchor_word_id: 'w7', offset_frames: 0 }, meaning: 'plantea una duda' }],
  backgrounds: [{ id: 'b1', label: 'fondo', theme: 'base', anchor_word_id: 'w12', offset_frames: 0, duration_frames: 75, motif: 'rings' }],
  zooms: [{ id: 'z1', anchor_word_id: 'w18', offset_frames: 0, duration_frames: 30, scale: 1.2 }],
  emphasis_word_ids: ['w7'],
};

let response;
let failure;
let calls = 0;
let lastRequest;
const load = loader({ [path.join(root, 'app/_lib/solEditor')]: {
  requestSolProposal: async (job, fingerprint, request, schema) => {
    calls++;
    lastRequest = request;
    assert.equal(job, 'fixture');
    assert.match(fingerprint, /^[a-f0-9]{64}$/);
    assert.equal(schema.type, 'object');
    if (failure) throw failure;
    return response;
  },
}});
const { revisePlan } = load('app/_lib/propose.ts');
const { readRevisionDraft, MAX_INSTRUCTION } = load('app/_lib/proposalRequest.ts');

// 1) La petición lleva la instrucción, la edición actual serializada y el sistema de revisión.
response = JSON.stringify({
  cuts: [
    { first_word: 2, last_word: 3, theme: 'stress', label: 'dos tres', style: 'solid' },
    { first_word: 18, last_word: 19, theme: 'base', label: 'cierre', style: 'paper' },
  ],
  cards: [],
  backgrounds: [{ first_word: 12, last_word: 16, theme: 'base', label: 'fondo', motif: 'rings' }],
  emphasis_words: [7],
  notes: 'Quité la tarjeta y añadí un cierre.',
});
const result = await revisePlan('fixture', timeline, plan, 'quita la tarjeta y pon un cierre');
const sent = lastRequest.messages[0].content;
assert.ok(lastRequest.system.includes('edición completa'), 'revision mode in system prompt');
assert.ok(sent.includes('«quita la tarjeta y pon un cierre»'), 'instruction travels verbatim');
assert.ok(sent.includes('"kind":"question"'), 'current edition serialized into the request');
assert.equal(result.plan.cards.length, 0, 'removed element stays removed');
assert.equal(result.plan.cuts.length, 2, 'kept and new cuts present');
assert.equal(result.plan.cuts[0].anchor_word_id, 'w2');
assert.equal(result.plan.cuts[0].duration_frames, 30);
assert.equal(result.plan.backgrounds[0].duration_frames, 75);
assert.deepEqual(result.plan.zooms, plan.zooms, 'zooms pass through untouched');
assert.deepEqual(plain(result.plan.emphasis_word_ids), ['w7']);
assert.equal(result.plan.version, plan.version, 'version is preserved');
assert.equal(result.notes, 'Quité la tarjeta y añadí un cierre.');
assert.equal(result.report.accepted, 3);
assert.equal(result.report.invalid, 0);

// 2) Ida y vuelta: devolver la edición tal como se envió reproduce los mismos eventos.
const echoed = JSON.parse(sent.match(/Esta es la edición actual completa, en el formato que debes devolver:\n(\{.*\})\n\nEl creador pide/s)[1]);
response = JSON.stringify({ ...echoed, notes: 'Sin cambios.' });
const roundtrip = await revisePlan('fixture', timeline, plan, 'déjalo igual');
assert.equal(roundtrip.plan.cuts.length, 1);
assert.equal(roundtrip.plan.cuts[0].anchor_word_id, 'w2');
assert.equal(roundtrip.plan.cuts[0].duration_frames, 30);
assert.equal(roundtrip.plan.cuts[0].style, 'solid');
assert.equal(roundtrip.plan.cards.length, 1);
assert.equal(roundtrip.plan.cards[0].kind, 'question');
assert.equal(roundtrip.plan.cards[0].beat.anchor_word_id, 'w7');
assert.equal(roundtrip.plan.backgrounds[0].duration_frames, 75);
assert.deepEqual(plain(roundtrip.plan.emphasis_word_ids), ['w7']);

// 3) Las reglas editoriales también gobiernan la revisión: cifra no dicha no entra.
response = JSON.stringify({
  cuts: [], backgrounds: [], emphasis_words: [],
  cards: [{ first_word: 9, last_word: 11, theme: 'base', label: 'cifra', kind: 'counter', beat_word: 10, meaning: 'la cifra dicha', text: '42' }],
  notes: 'Añadí el contador.',
});
const guarded = await revisePlan('fixture', timeline, plan, 'añade un contador con 42');
assert.equal(guarded.plan.cards.length, 0, 'counter without a literal figure is rejected');
assert.ok(guarded.report.invalid > 0);

// 4) Un ancla que ya no existe en la transcripción frena antes de llamar al modelo.
const stale = { ...plan, cuts: [{ ...plan.cuts[0], anchor_word_id: 'gone' }] };
const before = calls;
await assert.rejects(revisePlan('fixture', timeline, stale, 'quita la tarjeta'), /no coincide con la transcripción/);
assert.equal(calls, before, 'no model call when the draft no longer matches the transcript');

// 5) Respuestas rotas del modelo se reportan sin reintentar otro proveedor.
response = '{broken';
await assert.rejects(revisePlan('fixture', timeline, plan, 'quita la tarjeta'), /JSON válido/);
response = '{"unexpected":true}';
await assert.rejects(revisePlan('fixture', timeline, plan, 'quita la tarjeta'), /formato editorial/);
failure = new Error('Sol account limit');
await assert.rejects(revisePlan('fixture', timeline, plan, 'quita la tarjeta'), /Sol account limit/);
failure = undefined;

// 6) La entrada de la ruta: instrucción obligatoria, recortada y acotada; borrador obligatorio.
const request = (body) => new Request('http://localhost/api/jobs/fixture/revise', { method: 'POST', body: JSON.stringify(body) });
const ok = await readRevisionDraft(request({ plan, instruction: '  quita la tarjeta  ' }));
assert.equal(ok.instruction, 'quita la tarjeta');
assert.equal(ok.plan.version, 1);
await assert.rejects(readRevisionDraft(request({ plan })), /Escribe qué quieres cambiar/);
await assert.rejects(readRevisionDraft(request({ plan, instruction: '   ' })), /Escribe qué quieres cambiar/);
await assert.rejects(readRevisionDraft(request({ plan, instruction: 'x'.repeat(MAX_INSTRUCTION + 1) })), new RegExp(`hasta ${MAX_INSTRUCTION}`));
await assert.rejects(readRevisionDraft(request({ instruction: 'quita' })), /Falta el borrador/);
await assert.rejects(readRevisionDraft(new Request('http://localhost/api/jobs/fixture/revise', { method: 'POST', body: '' })), /Falta el borrador/);

console.log('PASS: revisión por instrucción (petición, ida y vuelta sin deriva, reglas editoriales, ancla obsoleta, errores sin reintento y validación de entrada).');
