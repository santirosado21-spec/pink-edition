// Integration test against the local studio. Uses only generated fixtures; no Sol calls.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const origin = process.env.BRAND_TEST_ORIGIN ?? 'http://localhost:3001';
assert.match(origin, /^http:\/\/localhost:\d+$/);
const root = path.resolve(import.meta.dirname, '..');
const temporary = await mkdtemp(path.join(tmpdir(), 'cutkind-brand-test-'));
let kit, session;
async function call(route, method = 'GET', body, headers = {}) {
  const response = await fetch(origin + route, { method, headers: { Origin: origin, ...headers }, body });
  return { status: response.status, data: await response.json() };
}
async function patch(body) { return call('/api/local-brand', 'PATCH', JSON.stringify(body), { 'Content-Type': 'application/json', 'x-cutkind-brand': kit.id }); }
try {
  const rejected = await fetch(origin + '/api/local-brand', { method: 'POST', headers: { Origin: 'https://example.com' } });
  assert.equal(rejected.status, 403);
  assert.equal((await call('/api/local-brand?id=../../etc')).status, 422);
  const created = await call('/api/local-brand', 'POST');
  assert.equal(created.status, 201); kit = created.data;
  assert.match(kit.id, /^[a-f0-9-]{36}$/);
  const dir = path.join(root, 'work', 'brand-kits', kit.id);
  const invalid = await call('/api/local-brand?kind=logo&name=bad.png', 'PUT', 'not an image', { 'x-cutkind-brand': kit.id });
  assert.equal(invalid.status, 422);
  assert.equal((await call('/api/local-brand?id=' + kit.id)).data.logo, undefined);
  assert.equal((await readdir(dir)).some(file => file.endsWith('.part')), false);
  const logo = path.join(temporary, 'logo.png'), video = path.join(temporary, 'reference.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=64x64', '-frames:v', '1', logo]);
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=160x240:d=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', video]);
  const uploadedLogo = await call('/api/local-brand?kind=logo&name=logo.png', 'PUT', await readFile(logo), { 'x-cutkind-brand': kit.id });
  assert.equal(uploadedLogo.status, 200); kit = uploadedLogo.data;
  assert.ok(kit.logo.colors.some(color => parseInt(color.slice(1, 3), 16) > 220 && parseInt(color.slice(3, 5), 16) < 40));
  const preview = await fetch(`${origin}/api/local-brand?id=${kit.id}&logo=1`);
  assert.equal(preview.headers.get('content-type'), 'image/png');
  const uploadedReference = await call('/api/local-brand?kind=reference&name=reference.mp4', 'PUT', await readFile(video), { 'x-cutkind-brand': kit.id });
  assert.equal(uploadedReference.status, 200); kit = uploadedReference.data;
  assert.deepEqual(kit.selected, []);
  assert.equal(kit.analysis, undefined); // Upload never spends a model call without the Analyze action.
  const patterns = [
    { name: 'Bloques cortos', description: 'Agrupar subtítulos legibles', adaptation: 'short-caption-pages', implementation: 'available', evidenceSeconds: [0.2, 0.8] },
    { name: 'Efecto nuevo', description: 'No implementado', adaptation: 'needs-new-renderer', implementation: 'not-implemented', evidenceSeconds: [0.4] },
  ];
  const analysisPath = path.join(dir, `analysis-${kit.reference.id}.json`);
  await writeFile(analysisPath, JSON.stringify({ state: 'ready', route: 'reference', reason: 'Fixture', patterns }));
  assert.equal((await patch({ action: 'select', referenceId: kit.reference.id, selected: [1] })).status, 422);
  assert.equal((await patch({ action: 'select', referenceId: 'old-reference', selected: [0] })).status, 422);
  assert.equal((await patch({ action: 'select', referenceId: kit.reference.id, selected: [0] })).status, 200);
  const brief = { version: 1, objective: 'Prueba local', audience: 'General', confirmed: true,
    musicMood: 'documentary', musicSource: 'licensed-library', brollSource: 'licensed-library', resourceNotes: '', resourcePolicy: 'relevant-only', brandKitId: kit.id,
    preferences: { topic: 'Prueba', vibe: 'balanced', graphics: 'none', brand_color: '#ff0000', context_colors: false, sfx: 'none', notes: '', transition: 'punch' } };
  const confirmed = await call('/api/local-intake', 'POST', JSON.stringify(brief), { 'Content-Type': 'application/json' });
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed.data)); session = confirmed.data.sessionId;
  const state = (await call('/api/local-intake/run', 'GET', undefined, { 'x-cutkind-session': session })).data.session;
  assert.equal(state.referenceScope, 'brand-only');
  assert.equal(state.brand.patterns.length, 1);
  assert.equal(state.brand.patterns[0].sourceSha256, kit.reference.sha256);
  assert.equal(state.brand.logo.file, 'brand-logo.png');
  assert.equal(state.sources, undefined); // Reference is never an A-roll source.
  await patch({ action: 'select', referenceId: kit.reference.id, selected: [] });
  await patch({ action: 'remove-logo' });
  const frozen = (await call('/api/local-intake/run', 'GET', undefined, { 'x-cutkind-session': session })).data.session;
  assert.equal(frozen.brand.patterns.length, 1); assert.ok(frozen.brand.logo);
  assert.ok((await readdir(path.join(dir, 'history'))).length >= 5);
  console.log('Brand kit: uploads, palette extraction, validation, explicit learning, frozen snapshots and source isolation passed.');
} finally {
  if (session) await call('/api/local-intake', 'DELETE', undefined, { 'x-cutkind-session': session });
  if (kit?.id && /^[a-f0-9-]{36}$/.test(kit.id)) await rm(path.join(root, 'work', 'brand-kits', kit.id), { recursive: true, force: true });
  await rm(temporary, { recursive: true, force: true });
}
