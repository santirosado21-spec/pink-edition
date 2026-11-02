import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { loader, root, plain } from './test_support/load_ts.mjs';
const at = name => path.join(root, name);
const load = loader({ [at('app/_lib/supabase/config')]: { CLOUD: false } }, { TextDecoder, setInterval: () => ({ unref() {} }) });
const { DEFAULT_PREFERENCES } = load('src/preferences.ts');
const { checkOneShotBrief, ONE_SHOT_REQUIREMENTS } = load('src/oneShotBrief.ts');
const brief = { version: 1, objective: 'Explicar una idea', audience: 'Creadores', preferences: { ...DEFAULT_PREFERENCES,
  topic: 'Video', graphics: 'many', transition: 'punch' }, musicMood: 'documentary', musicSource: 'licensed-library',
  brollSource: 'both', resourceNotes: '', confirmed: true };
assert.deepEqual(plain(checkOneShotBrief(brief)), []);
for (const invalid of [null, {}, { ...brief, confirmed: false }, { ...brief, objective: ' ' }, { ...brief, musicMood: '' },
  { ...brief, requirements: { broll: 0 } }, { ...brief, preferences: { ...brief.preferences, graphics: 'none' } },
  { ...brief, preferences: { ...brief.preferences, transition: 'none' } }, { ...brief, musicSource: 'none' }]) {
  assert.ok(checkOneShotBrief(invalid).length, JSON.stringify(invalid));
}
assert.equal(ONE_SHOT_REQUIREMENTS.cards, 2); assert.equal(ONE_SHOT_REQUIREMENTS.graphics, 2);
assert.equal(ONE_SHOT_REQUIREMENTS.broll, 2); assert.equal(ONE_SHOT_REQUIREMENTS.music, true);
const route = load('app/api/local-intake/route.ts');
const req = (body, origin = 'http://test') => new Request('http://test/api/local-intake', {
  method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body),
});
assert.equal((await route.POST(req(brief, 'http://other'))).status, 403);
assert.equal((await route.POST(req({ ...brief, confirmed: false }))).status, 422);
assert.equal((await route.POST(req({ ...brief, resourceNotes: 'x'.repeat(20_000) }))).status, 413);
const cwd = process.cwd(), temp = await fs.mkdtemp(path.join(os.tmpdir(), 'cutkind-session-test-'));
process.chdir(temp);
const sessions = load('app/_lib/localUploadSession.ts');
try {
const response = await route.POST(req(brief));
assert.equal(response.status, 200);
const result = await response.json();
assert.equal(result.briefValid, true); assert.equal(result.ready, true);
assert.equal(result.requirements.cards, 2);
assert.equal(result.missing.length, 0);
const upload = load('app/api/jobs/upload/route.ts');
const videoRequest = new Request('http://test/api/jobs/upload?name=fixture.mp4', { method: 'PUT', headers: { origin: 'http://test' }, body: 'not-video' });
assert.equal((await upload.PUT(videoRequest)).status, 428);
assert.equal(videoRequest.bodyUsed, false, 'No consume video bytes');
assert.equal((await upload.PUT(new Request('http://test/api/jobs/upload', { method: 'PUT' }))).status, 403);
assert.equal(result.uploadAllowed, true);
const stored = await sessions.readUploadSession(result.sessionId);
assert.deepEqual(plain(stored.brief), plain(brief));
const put = bytes => new Request('http://test/api/jobs/upload?name=fixture.mp4', { method: 'PUT',
  headers: { origin: 'http://test', 'x-cutkind-session': result.sessionId }, body: bytes });
assert.equal((await upload.PUT(put('not a video'))).status, 422);
assert.equal((await fs.readdir(sessions.sessionDir(result.sessionId))).includes('source.part'), false);
const media = path.join(temp, 'fixture.mp4');
execFileSync('ffmpeg', ['-v','error','-f','lavfi','-i','color=c=blue:s=128x224:r=30:d=1','-f','lavfi','-i','sine=frequency=440:duration=1', '-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',media]);
const bytes = await fs.readFile(media);
const attempts = await Promise.all([upload.PUT(put(bytes)), upload.PUT(put(bytes))]);
assert.deepEqual(attempts.map(r => r.status).sort(), [200, 409]);
assert.equal((await sessions.readUploadSession(result.sessionId)).state, 'received');
const first = (await sessions.readUploadSession(result.sessionId)).sources[0];
assert.deepEqual(await fs.readFile(path.join(sessions.sessionDir(result.sessionId), first.id)), bytes);
assert.equal((await upload.PUT(put(bytes))).status, 200, 'Second file accepted in same session');
assert.equal((await upload.PUT(put('invalid second file'))).status, 422);
const batch = await sessions.readUploadSession(result.sessionId);
assert.equal(batch.sources.length, 2, 'Failure preserves prior receipts');
for (const source of batch.sources) assert.deepEqual(await fs.readFile(path.join(sessions.sessionDir(result.sessionId), source.id)), bytes);
const large = put(bytes); large.headers.set('content-length', String(600 * 1024 * 1024));
assert.equal((await upload.PUT(large)).status, 400, 'Large declared size is accepted, incomplete bytes rejected (not size 413)');
assert.equal((await fs.readdir(sessions.sessionDir(result.sessionId))).some(name => name.endsWith('.part')), false);
const discarded = await route.DELETE(new Request('http://test/api/local-intake', { method: 'DELETE', headers: { origin: 'http://test', 'x-cutkind-session': result.sessionId } }));
assert.equal(discarded.status, 200);
await assert.rejects(fs.stat(sessions.sessionDir(result.sessionId)), e => e.code === 'ENOENT');
const expired = await sessions.createUploadSession(brief);
await sessions.sweepSessions(Date.now() + 61 * 60 * 1000);
await assert.rejects(sessions.readUploadSession(expired.id), e => e.status === 410);
console.log('PASS: brief gate, real upload/probe, invalid media cleanup, concurrency, snapshot, expiry, discard, and no permanent jobs.');
} finally { await fs.rm(sessions.sessionRoot(), { recursive: true, force: true }); process.chdir(cwd); await fs.rm(temp, { recursive: true, force: true }); }

