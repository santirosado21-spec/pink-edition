import assert from 'node:assert/strict';
import {loader} from './test_support/load_ts.mjs';
const load = loader();
const {relativeLuminance, highlightInk} = load('src/edit.ts');

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

console.log('PASS: luminancia WCAG, tinta de marca conservada y placa contrastada.');
