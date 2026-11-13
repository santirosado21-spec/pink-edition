import assert from 'node:assert/strict';
import {loader} from './test_support/load_ts.mjs';
const load = loader();
const {relativeLuminance, highlightInk, karaokeInk} = load('src/edit.ts');

// Luminancias conocidas: negro 0, blanco 1.
assert.equal(relativeLuminance('#000000'), 0);
assert.ok(Math.abs(relativeLuminance('#ffffff') - 1) < 1e-9);

// La tinta SIEMPRE conserva el color de marca (no se sustituye por otra variante).
for (const accent of ['#1f5fc4', '#f4d653', '#2ecc71', '#112233']) {
  assert.equal(highlightInk({accent, light: '#eeeeee', dark: '#111111'}).color, accent);
}

// Acento oscuro (azul de marca por defecto): placa clara casi opaca.
const dark = highlightInk({accent: '#1f5fc4', light: '#6aa6ff', dark: '#174a9c'});
assert.ok(dark.backplate.includes('255,255,255'), 'tinta oscura pide placa clara');

// Acento claro: placa oscura.
const light = highlightInk({highlight: '', accent: '#f4d653', light: '#f4d653', dark: '#8a7514'});
assert.ok(light.backplate.includes('16,16,20'), 'tinta clara pide placa oscura');

// La placa elegida contrasta con la tinta: pares conocidos en extremos opuestos de luminancia.
assert.ok(relativeLuminance('#1f5fc4') < 0.5, 'el azul de marca cuenta como tinta oscura');
assert.ok(relativeLuminance('#f4d653') >= 0.5, 'el amarillo cuenta como tinta clara');

// Placa de karaoke: la insignia conserva el color de marca y la tinta elegida
// siempre contrata al menos tanto como la alternativa.
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
for (const brand of ['#1f5fc4', '#ccce83', '#f4d653', '#112233', '#2ecc71', '#bb3d35']) {
  const ink = karaokeInk(brand);
  assert.equal(ink.background, brand, 'la insignia conserva el color de marca');
  const chosen = ratio(relativeLuminance(brand), relativeLuminance(ink.color));
  const alternative = ratio(relativeLuminance(brand), relativeLuminance(ink.color === '#ffffff' ? '#171717' : '#ffffff'));
  assert.ok(chosen >= alternative, `tinta subóptima para ${brand}`);
}
// Azul de marca oscuro por defecto: antes texto oscuro sobre placa oscura (2.9:1);
// ahora tinta blanca con contraste AA para texto grande (>= 3:1) y normal (>= 4.5:1).
assert.equal(karaokeInk('#1f5fc4').color, '#ffffff');
assert.ok(ratio(relativeLuminance('#1f5fc4'), 1) >= 4.5, 'azul de marca con blanco llega a AA');
// Acento claro conserva la tinta oscura de siempre (resultado idéntico al diseño original).
assert.equal(karaokeInk('#ccce83').color, '#171717');

console.log('PASS: luminancia WCAG, tinta de marca conservada y placa contrastada.');
