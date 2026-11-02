// Monta componentes reales en loopback temporal. Preview, Next navigation y APIs
// son doubles. No abre Next, work/ ni un perfil real; no prueba el renderer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { root } from './test_support/load_ts.mjs';
const require = createRequire(import.meta.url);
const runtime = process.env.CUTKIND_PLAYWRIGHT_RUNTIME;
const { chromium } = runtime ? createRequire(path.join(runtime, 'package.json'))('playwright') : require('playwright');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'cutkind-editor-browser-'));
const style = JSON.parse(fs.readFileSync(path.join(root, 'style/pink-demo-v1.json')));
const preferences = { topic: '', notes: '', vibe: 'balanced', graphics: 'many', brand_color: '#1f5fc4', context_colors: false, sfx: 'none' };
const words = Array.from({ length: 12 }, (_, i) => ({ id: `w${i}`, text: ['Este', 'es', 'un', 'video', 'sintético', 'para', 'probar', 'mis', 'cambios', 'sin', 'perder', 'nada'][i], source_start_frame: i * 30, source_end_frame: (i + 1) * 30, alignment_score: 1 }));
const card = { id: 'manual', kind: 'bill', label: 'Mi gráfico', theme: 'base', anchor_word_id: 'w0', offset_frames: 0, duration_frames: 60, top: 800, beat: { anchor_word_id: 'w1', offset_frames: 0 }, meaning: 'Manual' };
const initial = { id: 'fixture', style, media: { source: '', person: 'synthetic' }, plan: { style: style.id, version: 1, preferences, cuts: [], cards: [card], backgrounds: [], emphasis_word_ids: [] }, timeline: { fps: 30, duration_frames: 360, clips: [{ id: 'clip', source_in_frame: 0, timeline_in_frame: 0, duration_frames: 360, words, pages: [], head: null }] }, status: { state: 'ready', stage: 'place', error: null, updated_at: 0 }, hasOutput: false, qc: null };
const entry = `import React from 'react'; import {createRoot} from 'react-dom/client'; import {Editor} from ${JSON.stringify(path.join(root, 'app/_components/Editor.tsx'))}; import {ProfileRecovery} from ${JSON.stringify(path.join(root, 'app/_components/ProfileRecovery.tsx'))}; const initial=${JSON.stringify(initial)}; createRoot(document.getElementById('root')).render(location.pathname==='/recovery'?<ProfileRecovery message='Tu estilo guardado necesita revisión.' invalid/>:<Editor initial={initial}/>);`;
await build({ stdin: { contents: entry, resolveDir: root, loader: 'tsx' }, outfile: path.join(output, 'app.js'), bundle: true, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'isolated-next', setup(b) {
  b.onResolve({ filter: /^next\/(dynamic|link|navigation)$/ }, args => ({ path: args.path, namespace: 'double' }));
  b.onLoad({ filter: /.*/, namespace: 'double' }, args => ({ resolveDir: root, loader: 'tsx', contents: args.path === 'next/link' ? `import React from 'react'; export default function Link(p){return <a {...p}/>}` : args.path === 'next/navigation' ? `export const useRouter=()=>({push:url=>window.__navigation=url, refresh:()=>{}});` : `import React from 'react'; export default ()=>function Preview(p){return p.props?<div style={{padding:24,color:'white',background:'#20211f',minHeight:300}}>Vista sintética de prueba<pre data-testid='plan-state' hidden>{JSON.stringify(p.props.plan)}</pre></div>:<p>Ejemplo visual simulado</p>};` }));
  b.onResolve({ filter: /\/(Preview|CatalogPreview)$/ }, () => ({ path: 'unused', namespace: 'unused' }));
  b.onLoad({ filter: /.*/, namespace: 'unused' }, () => ({ contents: 'export default ()=>null;' }));
} }] });
const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'app/cutkind.css'), 'utf8');
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/app.js') { res.setHeader('Content-Type', 'application/javascript'); return res.end(fs.readFileSync(path.join(output, 'app.js'))); }
  if (url.pathname === '/style.css') { res.setHeader('Content-Type', 'text/css'); return res.end(css); }
  if (/^\/(fonts|brand)\/[a-zA-Z0-9_.-]+$/.test(url.pathname)) {
    const file = path.join(root, 'public', url.pathname);
    if (fs.existsSync(file)) { res.setHeader('Content-Type', file.endsWith('.svg') ? 'image/svg+xml' : 'font/woff2'); return res.end(fs.readFileSync(file)); }
  }
  if (url.pathname !== '/' && url.pathname !== '/recovery') { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', 'text/html');
  res.end('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
let page;
try {
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const historic = { id: 'historic', created_at: '2026-10-20T12:00:00Z', base_version: 1, base: initial.plan,
    plan: { ...initial.plan, take_transition: 'flash' }, style, timeline: initial.timeline, report: { accepted: 0 }, stale: false };
  await page.route('**/api/jobs/fixture/candidates*', route => route.fulfill({ contentType: 'application/json',
    body: JSON.stringify(route.request().url().includes('?') ? { candidate: historic } : { candidates: [historic] }) }));
  await page.route('**/api/profile', route => route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: 'Tu estilo guardado necesita revisión.' }) }));
  let sent, pending, fail = false;
  await page.route('**/api/jobs/fixture/propose', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ready: true, provider: 'Anthropic', model: 'fixture', message: 'Proveedor simulado para probar interacción.' }) });
    sent = route.request().postDataJSON().plan;
    if (fail) return route.abort('failed');
    await new Promise(resolve => { pending = resolve; });
    const proposed = { ...sent, cards: [...sent.cards, { ...card, id: 'new-suggestion', label: 'Sugerencia nueva', anchor_word_id: 'w8' }] };
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ plan: proposed, notes: 'Prueba', report: { status: 'needs_review', accepted: 1, preserved: sent.cards.length, invalid: 0, blocked: 0, reasons: ['Se conservaron tus elementos.'] } }) });
  });
  await page.goto(url);
  const waitPending = async () => { const end = Date.now() + 10000; while (!pending) { if (Date.now() > end) throw new Error('La petición de propuesta no llegó'); await new Promise(r => setTimeout(r, 10)); } };
  const state = () => page.getByTestId('plan-state').textContent().then(JSON.parse);
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(), /conserva su propio estilo/);
  // Un borrador sin guardar se envía: cambiar transición no hace PUT.
  await page.getByLabel('Transición entre tomas').selectOption('flash');
  await page.getByRole('button', { name: '✦ Proponer con IA', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('button[disabled]') !== null);
  await waitPending();
  assert.equal(sent.take_transition, 'flash');
  assert.deepEqual(sent.cards, [card]);
  // Se edita de nuevo mientras IA responde: la respuesta debe descartarse.
  await page.getByLabel('Transición entre tomas').selectOption('punch');
  pending(); pending = null;
  await page.getByText('Seguiste editando mientras llegaba', { exact: false }).waitFor();
  assert.equal((await state()).take_transition, 'punch');
  assert.equal((await state()).cards.length, 1);
  // Consultar propuestas anteriores no reemplaza el borrador; editar sale de la comparación.
  await page.getByRole('button', { name: 'Ver propuesta', exact: true }).click();
  await page.getByText('Comparando: propuesta conservada.', { exact: false }).waitFor();
  assert.equal((await state()).take_transition, 'flash');
  assert.equal(await page.getByRole('button', { name: 'Renderizar', exact: true }).isDisabled(), true, 'Do not export a different draft while viewing history');
  await page.getByRole('button', { name: 'Volver al borrador', exact: true }).click();
  assert.equal((await state()).take_transition, 'punch');
  await page.getByRole('button', { name: 'Ver punto de partida', exact: true }).click();
  await page.getByText('Comparando: punto de partida.', { exact: false }).waitFor();
  await page.getByLabel('Transición entre tomas').selectOption('none');
  assert.equal((await state()).take_transition, 'none');
  assert.equal(await page.getByRole('button', { name: 'Volver al borrador', exact: true }).count(), 0);
  await page.getByRole('button', { name: '✦ Proponer con IA', exact: true }).click();
  await waitPending();
  pending(); pending = null;
  await page.getByRole('status').filter({ hasText: 'Revisa las sugerencias' }).waitFor();
  assert.equal((await state()).cards.length, 2);
  assert.deepEqual((await state()).cards[0], card);
  await page.screenshot({ path: path.join(output, 'editor-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  assert.equal((await state()).cards.length, 1);
  assert.equal(await page.getByRole('status').filter({ hasText: 'Revisa las sugerencias' }).count(), 0, 'Undo clears stale proposal report');
  fail = true;
  await page.getByRole('button', { name: '✦ Proponer con IA', exact: true }).click();
  await page.getByText('Tus cambios siguen intactos', { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: '✦ Proponer con IA', exact: true }).isEnabled(), true);
  assert.equal((await state()).cards.length, 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: /Elementos/ }).click();
  await page.screenshot({ path: path.join(output, 'editor-mobile.png'), fullPage: true });
  await page.goto(`${url}/recovery`);
  assert.equal(await page.locator('input').count(), 0, 'No defaults form before explicit recovery');
  await page.screenshot({ path: path.join(output, 'profile-recovery-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Rehacer mi estilo' }).click();
  await page.getByPlaceholder('Tu nombre o marca').waitFor();
  let saved;
  await page.unroute('**/api/profile');
  await page.route('**/api/profile', route => { saved = route.request().postDataJSON(); return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ preferences: saved }) }); });
  for (let i = 0; i < 7; i++) await page.getByRole('button', { name: /Siguiente/ }).click();
  await page.getByRole('button', { name: /Guardar/ }).click();
  await page.waitForFunction(() => window.__navigation !== undefined);
  assert.equal(saved.catalog_version, 1);
  assert.equal(saved.graphics, 'few');
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ passed: ['draft submission', 'late response discarded', 'existing event preserved', 'undo', 'network failure', 'profile alert', 'explicit recovery', 'quiz save', 'history preview without overwriting draft', 'export disabled during comparison', 'editing exits comparison'], pageErrors: errors, limitations: 'Preview/Next navigation/APIs simulated; no SSR, cloud or MP4 validation.' }, null, 2));
  console.log(`PASS: Playwright, 8 original scenarios plus history preview, draft preservation and exit comparison on edit. Evidence: ${output}`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
