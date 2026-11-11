// Real Remotion export + existing voice correlation + new media QA, synthetic media only.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const origin = process.env.BRAND_TEST_ORIGIN ?? 'http://localhost:3001';
assert.match(origin, /^http:\/\/localhost:\d+$/);
const root = path.resolve(import.meta.dirname, '..');
let sessionId, folder, active = false;
const api = async (method, route, body) => {
  const response = await fetch(origin + route, { method, headers: { Origin: origin, 'Content-Type': 'application/json', 'x-cutkind-session': sessionId ?? '' }, body: body ? JSON.stringify(body) : undefined });
  assert.ok(response.ok, await response.clone().text());
  return response.json();
};
try {
  const brief = { version: 1, objective: 'Prueba sintética', audience: 'General', confirmed: true,
    musicMood: 'documentary', musicSource: 'licensed-library', brollSource: 'licensed-library', resourceNotes: '', resourcePolicy: 'relevant-only',
    preferences: { topic: 'Prueba', vibe: 'balanced', graphics: 'none', brand_color: '#f36b52', context_colors: false, sfx: 'none', notes: '', transition: 'punch' } };
  sessionId = (await api('POST', '/api/local-intake', brief)).sessionId;
  folder = path.join(tmpdir(), 'cutkind-upload-sessions', createHash('sha256').update(root).digest('hex').slice(0, 16), sessionId);
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=30:duration=2', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=2', '-c:v', 'libx264', '-c:a', 'aac', '-shortest', path.join(folder, 'fixture.mp4')]);
  const source = { id: randomUUID(), name: 'synthetic.mp4', bytes: 1, sha256: 'synthetic', seconds: 2, width: 320, height: 180 };
  const session = JSON.parse(await readFile(path.join(folder, 'session.json'), 'utf8'));
  session.sources = [source]; session.state = 'received';
  await writeFile(path.join(folder, 'session.json'), JSON.stringify(session));
  await writeFile(path.join(folder, 'input.json'), JSON.stringify(session));
  const edit = { fps: 30, width: 320, height: 180, frames: 60, preferences: brief.preferences,
    scenes: [{ ...source, asset: 'fixture.mp4', from: 0, frames: 60 }], captions: [], beats: [], music: null, musicFrames: 60, issues: [], assets: [], checks: { syntheticFixture: true } };
  await writeFile(path.join(folder, 'edit.json'), JSON.stringify(edit));
  await api('POST', '/api/local-intake/run', { action: 'export', order: [source.id] }); active = true;
  let run;
  for (let i = 0; i < 180; i++) {
    run = (await api('GET', '/api/local-intake/run')).run;
    if (run && !['running', 'exporting'].includes(run.state)) { active = false; break; }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.equal(run?.state, 'exported', JSON.stringify(run));
  assert.ok(run.quality); assert.equal(run.quality.errors.length, 0);
  const evidence = JSON.parse(await readFile(path.join(folder, 'media-evidence.json'), 'utf8'));
  assert.equal(evidence.picture.decodedFrames, 60);
  assert.equal(evidence.audio.present, true);
  const download = await fetch(`${origin}/api/local-intake/media?session=${sessionId}&asset=final.mp4&download=1`);
  assert.equal(download.status, 200);
  assert.ok((await download.arrayBuffer()).byteLength > 1000);
  console.log('PASS: real synthetic MP4 render, voice correlation, media evidence, API report and download.');
} finally {
  if (folder && !active) await rm(folder, { recursive: true, force: true });
  if (active) console.error('Synthetic export is still active; kept its isolated session until it finishes.');
}
