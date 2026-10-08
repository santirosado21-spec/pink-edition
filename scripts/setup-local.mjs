// Prepara datos ficticios sólo donde falten las timelines privadas del cliente.
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(path.join(root, 'src'), {recursive: true});
const starts = [56, 452, 763, 1119, 1428, 1731, 2022, 2407, 2929];
const lengths = [166, 130, 203, 131, 155, 114, 189, 380, 131];
let offset = 0;
const clips = starts.map((start, i) => {
  const words = ['Texto', 'de', 'prueba.'].map((text, w) => ({
    id: `sample.${i}.${w}`, text, source_start_frame: start + 8 + w * 8,
    source_end_frame: start + 15 + w * 8, alignment_score: null,
  }));
  const clip = {id: `sample_${i}`, source_in_frame: start,
    source_out_frame: start + lengths[i], duration_frames: lengths[i],
    timeline_in_frame: offset, timeline_out_frame: offset + lengths[i], words,
    pages: [{start_frame: start, end_frame: start + lengths[i], lines: [words]}]};
  offset += lengths[i];
  return clip;
});
const full = path.join(root, 'src/pool-full-timeline.json');
if (!existsSync(full)) writeFileSync(full, JSON.stringify({
  is_sample: true, fps: 30, duration_frames: offset, clips,
  coverage: {source_word_count: 27, retained_word_count: 27},
}, null, 2));
const preview = path.join(root, 'src/pool-timeline.json');
if (!existsSync(preview)) writeFileSync(preview, JSON.stringify({
  is_sample: true, fps: 30, duration_frames: 515,
  visual_events: Array.from({length: 12}, (_, i) => ({
    id: `sample_${i}`, start_frame: i * 40, lines: ['Texto de prueba.'],
    layout: {lines: [{x: 80, baseline: 805}]},
    words: ['Texto', 'de', 'prueba.'].map((text, w) => ({
      text, start_frame: i * 40 + w * 8, end_frame: i * 40 + w * 8 + 7,
    })),
  })),
}, null, 2));
console.log('Datos locales preparados; las timelines existentes no se modifican.');
