// Almacenamiento y rutas reales sobre disco temporal; Python/modelo se simulan.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { EventEmitter } from 'node:events';
import { loader, root, plain } from './test_support/load_ts.mjs';
const at = name => path.join(root, name);
const previousCwd = process.cwd(), previousProvider = process.env.EDITOR_AI_PROVIDER;
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'cutkind-candidates-'));
let failLayout = false, failSpawn = false, layoutCalls = 0, command;
const execFile = () => {};
execFile[promisify.custom] = async () => { layoutCalls++; if (failLayout) throw new Error('layout failed'); return { stdout: '', stderr: '' }; };
const load = loader({
  'node:child_process': { execFile, spawn: (_exe, args) => {
    command = args; const child = new EventEmitter(); child.pid = process.pid; child.unref = () => {};
    queueMicrotask(() => failSpawn ? child.emit('error', new Error('missing python')) : child.emit('spawn')); return child;
  } },
  [at('app/_lib/faceSafety')]: { withFaceSafety: async (_id, timeline) => timeline },
  [at('app/_lib/cloud')]: { CLOUD: false },
});
try {
  process.chdir(temp); process.env.EDITOR_AI_PROVIDER = 'fixture';
  await fs.mkdir('work/fixture', { recursive: true });
  await fs.mkdir('public/work/fixture', { recursive: true });
  const plan = { style: 'pink-demo-v1', version: 1, cuts: [], cards: [], backgrounds: [] };
  const timeline = { fps: 30, duration_frames: 90, clips: [{ id: 'c', head: null, timeline_in_frame: 0, source_in_frame: 0, duration_frames: 90,
    words: [{ id: 'w0', text: 'Hola', source_start_frame: 0, source_end_frame: 30 }], pages: [] }] };
  const json = (file, value) => fs.writeFile(file, JSON.stringify(value));
  await json('work/fixture/plan.json', plan); await json('work/fixture/timeline.json', timeline);
  await json('work/fixture/status.json', { state: 'ready', stage: 'place', updated_at: 0 });
  await fs.writeFile('public/work/fixture/source.mp4', 'synthetic bytes, not a video');
  const store = load('app/_lib/planStore.ts'), jobs = load('app/_lib/jobs.ts'), candidates = load('app/_lib/candidates.ts');
  const style = await jobs.readStyle();
  const report = { status: 'needs_review', accepted: 0, preserved: 0, invalid: 0, blocked: 0, reasons: [] };
  const draft = { ...plan, take_transition: 'flash' };
  const result = { plan: { ...draft, take_transition: 'punch' }, report, notes: 'Fixture' };
  const candidate = await candidates.createCandidate('fixture', plan, draft, timeline, style, result, Date.now());
  assert.deepEqual(plain((await store.readActiveEdit('fixture')).plan), plan, 'Proposing must not change active');
  assert.deepEqual(plain((await candidates.readCandidate('fixture', candidate.id)).base), draft, 'Unsaved baseline is preserved');
  assert.equal(candidate.manifest.quality_approved, false);
  assert.equal((await candidates.listCandidates('fixture'))[0].stale, false);
  await assert.rejects(candidates.readCandidate('fixture', '../../plan'), /inválida/);

  failLayout = true;
  await assert.rejects(jobs.savePlan('fixture', draft), /layout failed/);
  assert.deepEqual(plain((await store.readActiveEdit('fixture')).plan), plan, 'Failed placement must not alter active');
  assert.equal((await fs.readdir('work/fixture')).some(f => f.startsWith('.save-')), false);
  failLayout = false;

  const promote = load('app/api/jobs/[id]/candidates/[candidateId]/promote/route.ts').POST;
  const context = { params: Promise.resolve({ id: 'fixture', candidateId: candidate.id }) };
  const req = origin => new Request('http://test/api/jobs/fixture/candidates/x/promote', { method: 'POST', headers: { origin } });
  assert.equal((await promote(req('http://evil'), context)).status, 403);
  const beforePromotionCalls = layoutCalls;
  const promotion = await promote(req('http://test'), context);
  assert.equal(promotion.status, 200, await promotion.clone().text());
  const saved = (await promotion.json()).plan;
  assert.deepEqual(saved, { ...result.plan, version: 2 });
  assert.equal(layoutCalls, beforePromotionCalls, 'Promotion must not silently reposition the frozen proposal');
  assert.equal((await promote(req('http://test'), context)).status, 409, 'Cannot promote the same old base twice');
  assert.equal((await candidates.listCandidates('fixture'))[0].stale, true);
  assert.deepEqual(JSON.parse(await fs.readFile('work/fixture/plan.json')), plan, 'Legacy baseline retained');

  const races = await Promise.allSettled([jobs.savePlan('fixture', saved), jobs.savePlan('fixture', saved)]);
  assert.equal(races.filter(r => r.status === 'fulfilled').length, 1, 'Only one writer commits');
  assert.equal(races.find(r => r.status === 'rejected').reason.status, 409);
  const active = await store.readActiveEdit('fixture');
  assert.equal(active.plan.version, 3);
  assert.equal((await fs.readdir('work/fixture/versions')).length, 2);
  assert.deepEqual(plain((await candidates.readCandidate('fixture', candidate.id)).plan), result.plan, 'History is immutable across saves');

  const originalActive = await fs.readFile('work/fixture/active-edit.json', 'utf8');
  await jobs.startPipeline('fixture', path.join(temp, 'public/work/fixture/source.mp4'), 'render');
  const pointer = JSON.parse(await fs.readFile('work/fixture/current-render.json'));
  assert.ok(command.includes('--execution-id'));
  const input = `work/fixture/renders/${pointer.id}/input`;
  assert.deepEqual(JSON.parse(await fs.readFile(`${input}/plan.json`)), plain(active.plan));
  assert.deepEqual(JSON.parse(await fs.readFile(`${input}/timeline.json`)), timeline);
  assert.equal(await fs.readFile('work/fixture/active-edit.json', 'utf8'), originalActive);
  assert.equal(jobs.outputFile('fixture'), path.join(process.cwd(), `work/fixture/renders/${pointer.id}/out/fixture.mp4`));
  await assert.rejects(jobs.savePlan('fixture', active.plan), e => e.status === 409);
  await json('work/fixture/status.json', { state: 'ready', stage: 'place', updated_at: 0 });
  failSpawn = true;
  await assert.rejects(jobs.startPipeline('fixture', '/unused', 'render'), /missing python/);
  assert.equal(JSON.parse(await fs.readFile('work/fixture/status.json')).state, 'failed');
  assert.equal((await fs.readdir('work/fixture')).includes('.edit-write.lock'), false, 'Spawn failure releases edit lock');

  const candidateFile = `work/fixture/candidates/${candidate.id}.json`;
  await json(candidateFile, { ...plain(candidate), style: {} });
  await assert.rejects(candidates.readCandidate('fixture', candidate.id), /integridad/);
  console.log('PASS: candidate persistence, baseline, integrity, failed save rollback, promotion, stale revision, concurrent CAS, frozen render input and output isolation.');
} finally {
  process.chdir(previousCwd);
  if (previousProvider === undefined) delete process.env.EDITOR_AI_PROVIDER; else process.env.EDITOR_AI_PROVIDER = previousProvider;
  await fs.rm(temp, { recursive: true, force: true });
}
