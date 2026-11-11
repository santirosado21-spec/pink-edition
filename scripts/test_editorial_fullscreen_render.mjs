// Actual-frame regression on a private prepared take, preserving its audio.
// Usage: node scripts/test_editorial_fullscreen_render.mjs SESSION_FOLDER ORIGIN OUTPUT_FOLDER
// No inference, no public assets, no update of the session or its previous export.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {selectComposition, renderMedia, renderStill} from '@remotion/renderer';
const [folder, origin, outputArgument] = process.argv.slice(2);
assert.ok(folder && origin && outputArgument, 'Provide private session, local origin and output folder');
const output = path.resolve(outputArgument);
assert.match(origin, /^http:\/\/localhost:\d+$/);
const original = JSON.parse(await fs.readFile(path.join(folder, 'edit.json'), 'utf8'));
assert.equal(original.editorialVersion, 1);
const source = original.scenes.at(-1), offset = source.from / original.fps * 1000;
const captions = original.captions.filter(c => c.startMs >= offset && c.startMs < offset + source.frames / original.fps * 1000)
  .map(c => ({...c, startMs: c.startMs - offset, endMs: c.endMs - offset}));
const from = Math.round(captions[0].startMs / 1000 * original.fps);
const frames = Math.min(Math.round(4.5 * original.fps), source.frames - from - 3);
const phrase = captions.filter(c => c.startMs < (from + frames) / original.fps * 1000).map(c => c.text.trim()).join(' ');
const edit = {...original, frames: source.frames, scenes: [{...source, from: 0}], captions,
  preferences: {...original.preferences, editorial: {...original.preferences.editorial, emphasisStyle: 'fullscreen', captionIntent: 'both'}},
  transitions: [], soundEvents: [], beats: [{id: 'continuous-regression', kind: 'card', from, frames,
    quote: phrase, title: phrase, headline: phrase, labels: [phrase], reason: 'Local regression fixture only',
    presentation: 'fullscreen', textPages: [{text: phrase, from: 0, frames}]}]};
const gapIndex = captions.findIndex((c, i) => i && c.startMs - captions[i-1].endMs > 450 && c.startMs < (from + frames) / edit.fps * 1000);
assert.ok(gapIndex > 0, 'This regression needs a real >450 ms gap inside the authored event');
const gapFrame = Math.round((captions[gapIndex-1].endMs + captions[gapIndex].startMs) / 2 / 1000 * edit.fps);
await fs.mkdir(output, {recursive: true});
await fs.writeFile(path.join(output, 'edit.json'), JSON.stringify(edit));
const inputProps = {edit, mediaBase: `${origin}/api/local-intake/media?session=${path.basename(folder)}`};
const serveUrl = await bundle({entryPoint: path.resolve('src/oneShotEntry.tsx'), publicDir: null, outDir: path.join(output, 'bundle')});
const composition = await selectComposition({serveUrl, id: 'OneShot', inputProps});
await renderStill({serveUrl, composition, inputProps, frame: gapFrame, output: path.join(output, 'asr-gap.png')});
await renderMedia({serveUrl, composition, inputProps, codec: 'h264', audioCodec: 'aac', concurrency: 2,
  outputLocation: path.join(output, 'regression.mp4')});
execFileSync('python3', ['scripts/editorial_temporal_qc.py', path.join(output, 'edit.json'), '--movie', path.join(output, 'regression.mp4'), '--out', path.join(output, 'temporal-qc.json')]);
const report = JSON.parse(await fs.readFile(path.join(output, 'temporal-qc.json'), 'utf8'));
assert.equal(report.errors.length, 0);
assert.ok(report.containerFramesMeasured > 80);
console.log(JSON.stringify({passed: true, realGapFrame: gapFrame, measuredContainerFrames: report.containerFramesMeasured, output,
  scope: 'Actual MP4 background-corner regression + renderer state tests; aesthetic approval still pending.'}));
