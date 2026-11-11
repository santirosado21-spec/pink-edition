// QA visual sintético: palabra resaltada del preset «keyword» sobre cielo claro.
// Genera stills con un video de cielo ficticio (sin material del cliente) en out/contrast/.
// Uso: node scripts/render_caption_contrast.mjs [etiqueta]
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {selectComposition, renderStill} from '@remotion/renderer';
import {loader} from './test_support/load_ts.mjs';

const label = process.argv[2] || 'actual';
const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'out', 'contrast');
fs.mkdirSync(outDir, {recursive: true});
fs.mkdirSync(path.join(root, 'public', 'evidence'), {recursive: true});

// Fondos ficticios (sin material del cliente): cielo claro, noche y textura ruidosa,
// todos con una silueta oscura para probar porciones de palabra dentro y fuera de ella.
const VARIANTS = {
  cielo: "color=c=white:s=1080x1920:d=8:r=30,geq=r='135+40*Y/H':g='206+20*Y/H':b='235+20*Y/H'",
  noche: "color=c=white:s=1080x1920:d=8:r=30,geq=r='26+14*Y/H':g='28+14*Y/H':b='46+18*Y/H'",
  textura: "color=c=white:s=1080x1920:d=8:r=30,geq=r='135+40*Y/H+60*sin(X/37)*random(1)':g='206+20*Y/H-50*random(2)':b='235+20*Y/H+40*random(3)'",
};
for (const [name, filter] of Object.entries(VARIANTS)) {
  const target = path.join(root, 'public', 'evidence', `bg-${name}.mp4`);
  if (fs.existsSync(target)) continue;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i',
    filter + ",format=yuv420p,drawbox=x=340:y=980:w=400:h=940:c=0x3a3340@1:t=fill",
    '-t', '8', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', target]);
}

const load = loader();
const timeline = JSON.parse(fs.readFileSync(path.join(root, 'src', 'pool-full-timeline.json'), 'utf8'));
delete timeline.is_sample;
const {buildEdit} = load('src/edit.ts');

const firstWords = timeline.clips[0].words.slice(1, 4).map((w) => w.id);
const style = JSON.parse(fs.readFileSync(path.join(root, 'style', 'pink-demo-v1.json'), 'utf8'));
const plan = {
  style: 'pink-demo-v1', version: 1, clip_labels: [], cuts: [], cards: [], backgrounds: [],
  preferences: {captions: 'keyword', brand_color: style.themes.base.accent},
  emphasis_word_ids: firstWords,
};
const variant = process.argv[3] || 'cielo';
if (!VARIANTS[variant]) throw new Error(`Fondo desconocido: ${variant} (usa ${Object.keys(VARIANTS).join(', ')})`);
const props = {style, plan, timeline, media: {source: `evidence/bg-${variant}.mp4`, person: `evidence/bg-${variant}.mp4`}};

// Cuadro con una palabra marcada visible: página que contiene el primer énfasis.
const edit = buildEdit(props);
const clip = edit.clips[0];
const page = clip.pages.find((candidate) => candidate.lines.flat().some((word) => firstWords.includes(word.id)));
if (!page) throw new Error('No se encontró página con las palabras marcadas.');
const frames = [page.start_frame + 12, Math.min(page.end_frame - 2, page.start_frame + 24)];
console.log('Página con énfasis:', page.start_frame, '-', page.end_frame, '→ cuadros', frames.join(', '));

const serveUrl = await bundle({entryPoint: path.join(root, 'src', 'index.ts'), outDir: path.join(outDir, 'bundle')});
const composition = await selectComposition({serveUrl, id: 'PinkEdit', inputProps: props});
for (const frame of frames) {
  const output = path.join(outDir, `keyword-${variant}-${label}-f${frame}.png`);
  await renderStill({serveUrl, composition, inputProps: props, frame, output});
  console.log('Still:', output);
}
