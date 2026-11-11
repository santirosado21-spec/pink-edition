import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {loader, root} from './test_support/load_ts.mjs';

const style = JSON.parse(fs.readFileSync(path.join(root, 'style', 'pink-demo-v1.json'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(root, 'schema', 'edit-plan.schema.json'), 'utf8'));

// Paleta completa: cada tema tiene sus tres tonos en hex válido.
for (const name of ['base', 'health', 'stress', 'money', 'tech']) {
  const theme = style.themes[name];
  assert.ok(theme, `falta el tema ${name} en el estilo`);
  for (const tone of ['accent', 'light', 'dark']) assert.match(theme[tone], /^#[0-9a-f]{6}$/i, `${name}.${tone}`);
}

// El esquema admite los cinco temas en los tres grupos de elementos.
for (const group of ['cuts', 'cards', 'backgrounds']) {
  assert.deepEqual(schema.properties[group].items.properties.theme.enum, ['base', 'health', 'stress', 'money', 'tech']);
}

// Contraste WCAG de la tinta de los cortes (texto de 100 px: umbral de texto grande, 3:1).
const load0 = loader();
const {relativeLuminance: lum0} = load0('src/edit.ts');
const parse = (value) => {
  if (value.startsWith('#')) return {rgb: [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)), alpha: 1};
  const parts = value.match(/[\d.]+/g).map(Number);
  return {rgb: parts.slice(0, 3), alpha: parts[3]};
};
const blend = (value, background) => {
  const {rgb, alpha} = parse(value);
  const hex = rgb.map((channel, i) => Math.round(alpha * channel + (1 - alpha) * background[i]));
  return '#' + hex.map((channel) => channel.toString(16).padStart(2, '0')).join('');
};
const contrast = (a, b) => {
  const [high, low] = [lum0(a), lum0(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
for (const [name, theme] of Object.entries(style.themes)) {
  const onSolid = theme.on ?? style.cuts.solid.ink;
  assert.ok(contrast(onSolid, theme.accent) >= 3, `${name}: tinta del sólido ${contrast(onSolid, theme.accent).toFixed(2)}:1`);
  const muted = theme.on_muted ?? style.cuts.solid.muted;
  const blended = blend(muted, rgbOf(theme.accent));
  assert.ok(contrast(blended, theme.accent) >= 2.8, `${name}: apagado del sólido ${contrast(blended, theme.accent).toFixed(2)}:1`);
  assert.ok(contrast(theme.ink ?? theme.accent, '#ffffff') >= 3, `${name}: tinta del papel ${contrast(theme.ink ?? theme.accent, '#ffffff').toFixed(2)}:1`);
}
assert.ok(contrast(style.cuts.paper.muted, '#ffffff') >= 3, `apagado del papel ${contrast(style.cuts.paper.muted, '#ffffff').toFixed(2)}:1`);

// La tinta del resaltado conserva el acento de los temas nuevos y elige placa legible.
const load = loader();
const {relativeLuminance, highlightInk} = load('src/edit.ts');
for (const name of ['money', 'tech']) {
  const ink = highlightInk(style.themes[name]);
  assert.equal(ink.color, style.themes[name].accent, `${name}: la tinta conserva el acento`);
  const darkPlate = relativeLuminance(style.themes[name].accent) < 0.5;
  assert.equal(ink.backplate.includes('255,255,255'), darkPlate, `${name}: placa acorde a la tinta`);
}

// evaluateProposal acepta los temas nuevos (el enum sale del esquema).
const {evaluateProposal} = load('app/_lib/proposalPlan.ts');
const words = Array.from({length: 8}, (_, index) => ({id: `w${index}`, text: `p${index}`, source_start_frame: index * 15, source_end_frame: (index + 1) * 15}));
const timeline = {fps: 30, duration_frames: 300, clips: [{timeline_in_frame: 0, duration_frames: 300, source_in_frame: 0, words}]};
const current = {version: 1, style: 'pink-demo-v1', cuts: [], cards: [], backgrounds: []};
const {plan, report} = evaluateProposal({
  cuts: [{first_word: 0, last_word: 2, theme: 'money', label: 'ahorra cada mes', style: 'solid'}],
  cards: [],
  backgrounds: [{first_word: 4, last_word: 7, theme: 'tech', label: 'la tecnología', motif: 'network'}],
  notes: '',
}, timeline, current);
assert.equal(report.invalid, 0, report.reasons.join(' '));
assert.equal(plan.cuts[0].theme, 'money');
assert.equal(plan.backgrounds[0].theme, 'tech');

console.log('PASS: paleta, esquema, tinta y validación editorial cubren money y tech.');
