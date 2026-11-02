import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {loader} from './test_support/load_ts.mjs';

const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'cutkind-pixabay-'));
await fs.mkdir(path.join(temp, 'work/fixture'), {recursive: true});
await fs.writeFile(path.join(temp, 'work/fixture/timeline.json'), '{}');
const env = {PIXABAY_API_KEY: 'fixture-secret', PEXELS_API_KEY: 'other-key', EDITOR_STOCK_PROVIDER: 'pixabay'};
let calls = 0, mode = 'ok';
const item = {id: 31, pageURL: 'https://pixabay.com/photos/editing-31/', user: 'Fixture', tags: 'video, editing', webformatURL: 'https://cdn.pixabay.com/photo/preview.jpg', largeImageURL: 'https://pixabay.com/get/fixture.jpg'};
const fetch = async (input, options) => {
  const url = new URL(input); calls++;
  assert.equal(options.redirect, 'error');
  if (url.hostname === 'pixabay.com' && url.pathname === '/api/') {
    assert.equal(url.searchParams.get('key'), env.PIXABAY_API_KEY);
    assert.equal(url.searchParams.get('safesearch'), 'true');
    if (mode === 'quota') return new Response('secret', {status: 429});
    if (mode === 'network') throw Error(`failed ${input}`);
    return Response.json({hits: [{...item, id: Number(url.searchParams.get('id') || 31), largeImageURL: mode === 'host' ? 'http://127.0.0.1/private' : item.largeImageURL}]});
  }
  assert.equal(url.hostname, 'pixabay.com'); assert.equal(url.pathname, '/get/fixture.jpg');
  return new Response(new Uint8Array([255,216,255,217]), {headers: {'content-type': 'image/jpeg'}});
};
const globals = {process: {...process, cwd: () => temp, env}, fetch, AbortSignal, URLSearchParams};
const load = loader({}, globals);
const {searchPhotos, downloadPhoto} = load('app/_lib/stockPhotos.ts');
const {stockProviderStatus} = load('app/_lib/stockProvider.ts');
try {
  assert.equal(stockProviderStatus().provider, 'Pixabay');
  env.EDITOR_STOCK_PROVIDER = 'openverse'; assert.equal(stockProviderStatus().provider, 'Openverse');
  env.EDITOR_STOCK_PROVIDER = 'pixabay';
  const results = await Promise.all([searchPhotos('video editing', 'Pixabay'), searchPhotos('video editing', 'Pixabay')]);
  assert.equal(calls, 1); assert.equal(results[0].photos[0].provider, 'Pixabay');
  // Persistencia de la caché al volver a cargar el módulo, no sólo memoria.
  await loader({}, globals)('app/_lib/stockPhotos.ts').searchPhotos('video editing', 'Pixabay'); assert.equal(calls, 1);
  const saved = (await downloadPhoto('fixture', 31, 'Pixabay')).photo;
  assert.equal(saved.asset, 'work/fixture/photos/pixabay-31.jpg');
  const credit = JSON.parse(await fs.readFile(path.join(temp, 'public', saved.asset + '.json')));
  assert.equal(credit.photographer, 'Fixture'); assert.equal(credit.license, 'https://pixabay.com/service/license-summary/');
  const {validatePlan} = loader()('app/_lib/jobs.ts');
  const timeline = {duration_frames: 180, clips: [{id: 'clip', source_in_frame: 0, timeline_in_frame: 0, duration_frames: 180, words: [{id: 'w0', text: 'Editar', source_start_frame: 0, source_end_frame: 150}]}]};
  const plan = {version: 1, style: 'pink-demo-v1', cuts: [], backgrounds: [], cards: [{id: 'p', kind: 'photo', photo: saved, label: 'Editar', theme: 'base', anchor_word_id: 'w0', offset_frames: 0, duration_frames: 150, beat: {anchor_word_id: 'w0', offset_frames: 0}}]};
  assert.equal((await validatePlan(plan, timeline)).length, 0);
  assert.ok((await validatePlan({...plan, cards: [{...plan.cards[0], photo: {...saved, license: 'invented'}}]}, timeline)).length);
  mode = 'host'; await assert.rejects(downloadPhoto('fixture', 32, 'Pixabay'), /origen/);
  await assert.rejects(downloadPhoto('../escape', 31, 'Pixabay'), /inválido/);
  mode = 'quota'; await assert.rejects(searchPhotos('quota', 'Pixabay'), /cuota/);
  mode = 'network'; await assert.rejects(searchPhotos('network', 'Pixabay'), error => !error.message.includes(env.PIXABAY_API_KEY) && /conectar/.test(error.message));
  const cache = path.join(temp, 'work/_stock-cache/pixabay');
  for (const file of await fs.readdir(cache)) assert.ok(!(await fs.readFile(path.join(cache, file), 'utf8')).includes(env.PIXABAY_API_KEY));
  // Una respuesta vencida exige consultar de nuevo; la cuota no se oculta.
  for (const file of await fs.readdir(cache)) {
    const saved = JSON.parse(await fs.readFile(path.join(cache, file))); saved.at = Date.now() - 86_400_001;
    await fs.writeFile(path.join(cache, file), JSON.stringify(saved));
  }
  mode = 'quota'; await assert.rejects(searchPhotos('video editing', 'Pixabay'), /cuota/);
  delete env.PIXABAY_API_KEY; const before = calls;
  assert.equal(stockProviderStatus().ready, false); // No sustituir la selección explícita por Pexels.
  await assert.rejects(searchPhotos('video editing', 'Pixabay'), /PIXABAY_API_KEY/); assert.equal(calls, before);
  console.log('PASS Pixabay: búsqueda, descarga, procedencia, caché persistente 24 h/concurrencia/caducidad, origen, cuota, secreto y selección explícita. Transporte simulado.');
} finally { await fs.rm(temp, {recursive: true, force: true}); }
