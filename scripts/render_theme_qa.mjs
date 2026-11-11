// QA visual sintético de temas en cortes y tarjetas: los cinco temas en corte
// sólido y en corte de papel, y una tarjeta por tema nuevo, sobre un video de
// cielo ficticio (sin material del cliente). Verificación de píxeles por color;
// la legibilidad se revisa a ojo en los stills de out/themes/.
// Uso: node scripts/render_theme_qa.mjs
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {selectComposition, renderStill} from '@remotion/renderer';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'out', 'themes');
fs.mkdirSync(outDir, {recursive: true});
fs.mkdirSync(path.join(root, 'public', 'evidence'), {recursive: true});

const FPS = 30, CLIP = 45, CLIPS = 12;
const bg = path.join(root, 'public', 'evidence', 'bg-themes.mp4');
if (!fs.existsSync(bg)) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i',
    "color=c=white:s=1080x1920:d=21:r=30,geq=r='135+40*Y/H':g='206+20*Y/H':b='235+20*Y/H'" +
    ",format=yuv420p,drawbox=x=340:y=980:w=400:h=940:c=0x3a3340@1:t=fill",
    '-t', '21', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', bg]);
}

// Montaje ficticio: doce tomas de tres palabras, con la medición de cara que
// safeCardTop necesita para dejar salir tarjetas (la silueta del fondo).
const timeline = {
  fps: FPS, duration_frames: CLIP * CLIPS,
  clips: Array.from({length: CLIPS}, (_, index) => {
    const words = [0, 1, 2].map((w) => ({
      id: `t${index}w${w}`, text: w === 1 ? `clave${index}` : `texto${index}`,
      source_start_frame: index * CLIP + w * 15, source_end_frame: index * CLIP + (w + 1) * 15,
      alignment_score: null,
    }));
    return {
      id: `qa_${index}`,
      timeline_in_frame: index * CLIP, timeline_out_frame: (index + 1) * CLIP,
      source_in_frame: index * CLIP, source_out_frame: (index + 1) * CLIP, duration_frames: CLIP,
      face: {top: 980, bottom: 1420, left: 340, right: 740},
      words,
      pages: [{start_frame: index * CLIP, end_frame: (index + 1) * CLIP, lines: [words]}],
    };
  }),
};

const style = JSON.parse(fs.readFileSync(path.join(root, 'style', 'pink-demo-v1.json'), 'utf8'));
const THEMES = ['base', 'health', 'stress', 'money', 'tech'];
const event = (kind, clipIndex, extra) => {
  const clip = timeline.clips[clipIndex];
  return {
    id: `qa-${kind}-${clipIndex}`, label: clip.words.map((word) => word.text).join(' '), theme: THEMES[clipIndex % 5],
    anchor_word_id: clip.words[0].id, offset_frames: 0, duration_frames: CLIP,
    ...extra,
  };
};
const plan = {
  style: 'pink-demo-v1', version: 1, clip_labels: [],
  cuts: [
    ...THEMES.map((_, i) => event('solid', i, {style: 'solid', last_word_id: timeline.clips[i].words[2].id})),
    ...THEMES.map((_, i) => event('paper', i + 5, {style: 'paper', last_word_id: timeline.clips[i + 5].words[2].id})),
  ],
  cards: [10, 11].map((clipIndex) => event('card', clipIndex, {
    theme: THEMES[(clipIndex - 10) + 3], top: 300, kind: 'steps', meaning: 'QA de tema',
    beat: {anchor_word_id: timeline.clips[clipIndex].words[1].id, offset_frames: 0},
  })),
  backgrounds: [],
};

const props = {style, plan, timeline, media: {source: 'evidence/bg-themes.mp4', person: 'evidence/bg-themes.mp4'}};
const shots = [
  ...THEMES.map((name, i) => [`cut-${name}-solid`, i * CLIP + 22]),
  ...THEMES.map((name, i) => [`cut-${name}-paper`, (i + 5) * CLIP + 22]),
  ['card-money', 10 * CLIP + 22],
  ['card-tech', 11 * CLIP + 22],
];

const serveUrl = await bundle({entryPoint: path.join(root, 'src', 'index.ts'), outDir: path.join(outDir, 'bundle')});
const composition = await selectComposition({serveUrl, id: 'PinkEdit', inputProps: props});
for (const [name, frame] of shots) {
  await renderStill({serveUrl, composition, inputProps: props, frame, output: path.join(outDir, `${name}.png`)});
}
console.log(`${shots.length} stills en out/themes/`);

// Píxeles por color: el sólido lo domina el tema; el papel lleva tinta y apagado
// legibles; cada tarjeta dibuja trazos del acento de su tema.
const check = execFileSync('python3', ['-c', `
import json, sys
from PIL import Image
def near(img, target, tol):
    px = img.convert('RGB').resize((270, 480)).getdata()
    tr, tg, tb = target
    return sum(1 for r, g, b in px if abs(r - tr) <= tol and abs(g - tg) <= tol and abs(b - tb) <= tol)
def rgb(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))
base, themes = sys.argv[1], json.loads(sys.argv[2])
result = {}
for name, palette in themes.items():
    solid = Image.open(f'{base}/cut-{name}-solid.png')
    paper = Image.open(f'{base}/cut-{name}-paper.png')
    result[f'solid_{name}'] = near(solid, rgb(palette['dark']), 40) + near(solid, rgb(palette['accent']), 40)
    result[f'papel_{name}_tinta'] = near(paper, rgb(palette.get('ink') or palette['accent']), 45)
    result[f'papel_{name}_apagado'] = near(paper, (0x6f, 0x84, 0xa8), 30)
result['tarjeta_money'] = near(Image.open(base + '/card-money.png'), rgb(themes['money']['accent']), 60)
result['tarjeta_tech'] = near(Image.open(base + '/card-tech.png'), rgb(themes['tech']['accent']), 60)
print(json.dumps(result))
`, outDir, JSON.stringify(style.themes)], {encoding: 'utf8'});
const counts = JSON.parse(check.slice(check.indexOf('{')));
console.log('píxeles por tema:', counts);
const failures = [];
for (const name of THEMES) {
  if (counts[`solid_${name}`] < 0.3 * 270 * 480) failures.push(`el sólido ${name} no domina con su tema`);
  if (counts[`papel_${name}_tinta`] < 40) failures.push(`el papel ${name} no muestra su tinta`);
  if (counts[`papel_${name}_apagado`] < 40) failures.push(`el papel ${name} no muestra el apagado legible`);
}
if (counts.tarjeta_money < 15) failures.push('la tarjeta money no muestra su acento');
if (counts.tarjeta_tech < 15) failures.push('la tarjeta tech no muestra su acento');
if (failures.length) {
  console.error('FALLO QA de temas:', failures.join('; '));
  process.exit(1);
}
console.log('PASS: los cinco temas se renderizan con sus colores y el apagado de papel legible.');
