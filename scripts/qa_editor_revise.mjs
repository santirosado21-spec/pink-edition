#!/usr/bin/env node
/**
 * QA visual del flujo «Pedir un cambio» del editor local (app/edit/[id]).
 *
 * Levanta `next start` sobre el build actual (.next) con un trabajo sintético
 * propio (work/qa-editor-revise, gitignored) y recorre en Chrome headless los
 * estados del input de revisión: deshabilitado sin Sol, habilitado, texto
 * tecleado, petición en vuelo, éxito con cambio visible y error con el borrador
 * intacto. Las capturas quedan en out/editor-qa/ (gitignored).
 *
 * Garantías:
 * - No llama a ningún modelo ni servicio externo: durante la captura el
 *   conector local (scripts/sol_model.py) se sustituye por un stub que
 *   responde una propuesta enlatada, y se restaura al terminar pase lo que
 *   pase (finally + señales), verificando su hash original.
 * - No toca trabajos reales: crea y borra su propio fixture.
 * - No usa credenciales: el estado «deshabilitado» se captura con el
 *   conector real y simplemente registra si hay sesión de Codex o no.
 *
 * Requisitos: `npm run web:build` previo, Chrome (`google-chrome` o
 * `chromium`, o CHROME_BIN) y ffmpeg para el video sintético del fixture.
 *
 * Uso: node scripts/qa_editor_revise.mjs
 */
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = process.cwd();
const CONNECTOR = path.join(ROOT, 'scripts', 'sol_model.py');
const FIXTURE_ID = 'qa-editor-revise';
const SHOTS = path.join(ROOT, 'out', 'editor-qa');
const FAIL_MARK = path.join(os.tmpdir(), `qa-editor-revise-fail-${process.pid}`);
const FPS = 30;

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fail = (message) => { console.error(`FALTA: ${message}`); process.exitCode = 1; throw new Error(message); };
const ok = (message) => console.log(`  OK   ${message}`);

// --- Requisitos y seguridad previa -----------------------------------------
if (!existsSync(CONNECTOR)) fail('scripts/sol_model.py no existe; ejecuta desde la raíz del repo.');
if (!existsSync(path.join(ROOT, '.next', 'BUILD_ID'))) fail('falta el build web: corre `npm run web:build` antes.');
try {
  execFileSync('git', ['diff', '--quiet', '--', 'scripts/sol_model.py'], { cwd: ROOT });
} catch {
  fail('scripts/sol_model.py tiene cambios sin confirmar; no se sustituye un conector modificado.');
}
const chromeBin = process.env.CHROME_BIN
  ?? ['google-chrome', 'chromium', 'chromium-browser']
    .find((bin) => { try { execFileSync('which', [bin], { stdio: 'pipe' }); return true; } catch { return false; } });
if (!chromeBin) fail('no se encontró Chrome (google-chrome/chromium); define CHROME_BIN.');
const hasFfmpeg = (() => { try { execFileSync('which', ['ffmpeg'], { stdio: 'pipe' }); return true; } catch { return false; } })();
if (!hasFfmpeg) console.log('  AVISO: sin ffmpeg el fixture no tendrá video; la vista previa saldrá vacía.');

const freePort = () => new Promise((resolve, reject) => {
  const server = createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)); });
});

// --- Fixture sintético ------------------------------------------------------
const words = Array.from({ length: 20 }, (_, index) => ({
  id: `w${index}`, text: `palabra${index}`, source_start_frame: index * 15, source_end_frame: (index + 1) * 15,
}));
words[7].text = '3';
const TIMELINE = { fps: FPS, duration_frames: 300, clips: [{ timeline_in_frame: 0, duration_frames: 300, source_in_frame: 0, words }] };
const PLAN = {
  version: 1, style: 'pink-demo-v1',
  cuts: [{ id: 'c1', label: 'dos tres', theme: 'stress', anchor_word_id: 'w2', offset_frames: 0, duration_frames: 30, style: 'solid', last_word_id: 'w3' }],
  cards: [{ id: 'k1', label: 'duda', theme: 'base', anchor_word_id: 'w6', offset_frames: 0, duration_frames: 45, kind: 'question', beat: { anchor_word_id: 'w7', offset_frames: 0 }, meaning: 'plantea una duda' }],
  backgrounds: [{ id: 'b1', label: 'fondo', theme: 'base', anchor_word_id: 'w12', offset_frames: 0, duration_frames: 75, motif: 'rings' }],
  zooms: [{ id: 'z1', anchor_word_id: 'w18', offset_frames: 0, duration_frames: 30, scale: 1.2 }],
  emphasis_word_ids: ['w7'],
};
const writeFixture = () => {
  const dir = path.join(ROOT, 'work', FIXTURE_ID);
  const media = path.join(ROOT, 'public', 'work', FIXTURE_ID);
  mkdirSync(dir, { recursive: true });
  mkdirSync(media, { recursive: true });
  const write = (name, data) => writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2));
  write('status.json', { state: 'ready', stage: 'edit', error: null, updated_at: Date.now() / 1000 });
  write('timeline.json', TIMELINE);
  write('active-edit.json', { format: 1, plan: PLAN, timeline: TIMELINE });
  if (hasFfmpeg) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=0x335577:s=608x1080:d=10:r=30', '-pix_fmt', 'yuv420p', path.join(media, 'source.mp4')]);
    copyFileSync(path.join(media, 'source.mp4'), path.join(media, 'person.webm'));
  }
};
const cleanFixture = () => {
  rmSync(path.join(ROOT, 'work', FIXTURE_ID), { recursive: true, force: true });
  rmSync(path.join(ROOT, 'public', 'work', FIXTURE_ID), { recursive: true, force: true });
};

// --- Stub del conector (restauración garantizada) ---------------------------
const STUB = `import json, os, sys, time
if '--status' in sys.argv:
    print(json.dumps({'model': 'gpt-5.6-sol', 'ready': True}))
    sys.exit(0)
sys.stdin.read()
if os.path.exists(${JSON.stringify(FAIL_MARK)}):
    sys.exit(1)
time.sleep(4)
print(json.dumps({
  "cuts": [
    {"first_word": 2, "last_word": 3, "theme": "stress", "label": "dos tres", "style": "solid"},
    {"first_word": 18, "last_word": 19, "theme": "base", "label": "cierre", "style": "paper"}
  ],
  "cards": [],
  "backgrounds": [{"first_word": 12, "last_word": 16, "theme": "base", "label": "fondo", "motif": "rings"}],
  "emphasis_words": [7],
  "notes": "Quité la tarjeta y añadí un cierre."
}))
`;
const originalHash = sha256(CONNECTOR);
let connectorStubbed = false;
const restoreConnector = () => {
  if (!connectorStubbed) return;
  execFileSync('git', ['checkout', '--', 'scripts/sol_model.py'], { cwd: ROOT });
  connectorStubbed = false;
  if (sha256(CONNECTOR) !== originalHash) {
    console.error('  ERROR: no se pudo restaurar scripts/sol_model.py a su contenido original.');
    process.exitCode = 1;
  }
};

// --- Procesos hijo y limpieza ----------------------------------------------
const children = [];
const launch = (command, args, name) => {
  // Grupo de proceso propio: Chrome/npx crean hijos que hay que tumbar con él.
  const child = spawn(command, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  child.stderr.on('data', () => {});
  children.push(child);
  console.log(`  ...  ${name} (pid ${child.pid})`);
  return child;
};
const killTree = (child) => {
  try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch {} }
};
let chromeProfile = null;
const waitExit = (child) => new Promise((resolve) => {
  if (child.exitCode !== null || child.signalCode) return resolve();
  child.once('exit', () => resolve());
  setTimeout(resolve, 5000).unref();
});
const cleanup = async () => {
  restoreConnector();
  rmSync(FAIL_MARK, { force: true });
  const running = children.splice(0);
  for (const child of running) killTree(child);
  await Promise.all(running.map(waitExit));
  cleanFixture();
  // Un perfil de Chrome ocupado no debe tumbar un QA ya superado.
  if (chromeProfile) {
    try { rmSync(chromeProfile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); }
    catch { console.log(`  AVISO: no se pudo borrar el perfil temporal ${chromeProfile}; está fuera del repo.`); }
  }
};
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    restoreConnector();
    rmSync(FAIL_MARK, { force: true });
    for (const child of children) killTree(child);
    cleanFixture();
    process.exit(130);
  });
}

// --- CDP mínimo sobre WebSocket ---------------------------------------------
const connectCdp = async (port) => {
  for (let i = 0; i < 40; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const page = (await response.json()).find((target) => target.type === 'page');
      if (page) return new WebSocket(page.webSocketDebuggerUrl);
    } catch {}
    await sleep(500);
  }
  fail('Chrome CDP no responde.');
};

// --- Recorrido ---------------------------------------------------------------
mkdirSync(SHOTS, { recursive: true });
writeFixture();
const serverPort = await freePort();
const cdpPort = await freePort();
const base = `http://localhost:${serverPort}`;

try {
  launch('npx', ['next', 'start', '-p', String(serverPort)], `next start :${serverPort}`);
  let up = false;
  for (let i = 0; i < 90 && !up; i++) {
    await sleep(1000);
    up = await fetch(`${base}/edit/${FIXTURE_ID}`).then((r) => r.ok).catch(() => false);
  }
  if (!up) fail('el servidor local no respondió a tiempo.');

  chromeProfile = mkdtempSync(path.join(os.tmpdir(), 'qa-editor-chrome-'));
  launch(chromeBin, ['--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${chromeProfile}`, 'about:blank'], `chrome :${cdpPort}`);
  const ws = await connectCdp(cdpPort);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

  let seq = 0;
  const pending = new Map();
  ws.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      data.error ? reject(new Error(JSON.stringify(data.error))) : resolve(data.result);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) =>
    (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;
  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(path.join(SHOTS, `${name}.png`), Buffer.from(data, 'base64'));
    console.log(`  FOTO ${name}.png`);
  };
  const waitFor = async (expression, timeout, label) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (await evaluate(expression)) return;
      await sleep(400);
    }
    fail(`tiempo agotado esperando ${label}`);
  };
  const aiText = `(document.querySelector('[data-testid="editor-ai-status"]')?.textContent || '')`;
  const toast = `(document.querySelector('.toast')?.textContent || '')`;
  const typeIntoAsk = (text) => evaluate(`(() => {
    const input = document.querySelector('.ask input');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(text)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return input.value;
  })()`);
  const scrollAsk = () => evaluate(`document.querySelector('.ask').scrollIntoView({ block: 'center' })`);

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  // S1: conector real. Sin sesión de Codex el input se deshabilita con la razón
  // a la vista; con sesión queda habilitado. Ambos son estados legítimos.
  await send('Page.navigate', { url: `${base}/edit/${FIXTURE_ID}` });
  await waitFor(`document.readyState === 'complete' && !!document.querySelector('.ask input')`, 30000, 'editor cargado');
  await waitFor(`${aiText}.includes('Inicia sesión') || ${aiText}.includes('Sol configurado')`, 30000, 'estado IA resuelto');
  await scrollAsk();
  await sleep(600);
  const solReady = await evaluate(`${aiText}.includes('Sol configurado')`);
  const s1Disabled = await evaluate(`document.querySelector('.ask input').disabled`);
  if (s1Disabled === solReady) fail(`S1: input ${s1Disabled ? 'deshabilitado' : 'habilitado'} pero el estado IA dice ${solReady ? 'listo' : 'no listo'}.`);
  ok(`S1 conector real: Sol ${solReady ? 'con sesión' : 'sin sesión'} e input ${s1Disabled ? 'deshabilitado con la razón visible' : 'habilitado'}`);
  await shot('s1-conector-real');

  // Stub listo: estados interactivos sin llamar a ningún modelo.
  writeFileSync(CONNECTOR, STUB);
  connectorStubbed = true;
  await send('Page.navigate', { url: `${base}/edit/${FIXTURE_ID}` });
  await waitFor(`${aiText}.includes('Sol configurado')`, 30000, 'estado IA con stub');
  await scrollAsk();
  await sleep(600);
  if (await evaluate(`document.querySelector('.ask input').disabled`)) fail('S2: el input sigue deshabilitado con Sol listo.');
  ok('S2 input habilitado con Sol listo');
  await shot('s2-input-habilitado');

  if ((await typeIntoAsk('quita la tarjeta y pon un cierre')) !== 'quita la tarjeta y pon un cierre') fail('S3: no se pudo teclear la instrucción.');
  await sleep(400);
  ok('S3 instrucción tecleada');
  await shot('s3-instruccion');

  await evaluate(`document.querySelector('.ask button').click()`);
  await sleep(1800); // el stub tarda 4 s: estado en vuelo
  if (!await evaluate(`document.querySelector('.ask button').disabled`)) fail('S4: el botón no se deshabilita en vuelo.');
  ok('S4 petición en vuelo con controles deshabilitados');
  await shot('s4-en-vuelo');

  await waitFor(`${toast}.includes('Cambio conservado')`, 40000, 'toast de éxito');
  await sleep(400);
  const tarjetasVacias = await evaluate(`!document.body.textContent.includes('TARJETA duda')`);
  const cierreVisible = await evaluate(`document.body.textContent.includes('cierre')`);
  if (!tarjetasVacias || !cierreVisible) fail('S5: el cambio no se reflejó (tarjeta quitada y cierre añadido).');
  ok('S5 éxito: tarjeta quitada y corte «cierre» visible, toast correcto');
  await shot('s5-exito');

  writeFileSync(FAIL_MARK, '1');
  await typeIntoAsk('quita el cierre');
  await sleep(300);
  await scrollAsk();
  await evaluate(`document.querySelector('.ask button').click()`);
  await waitFor(`${toast}.includes('No se pudo aplicar el cambio')`, 40000, 'toast de error');
  await sleep(300);
  if (!await evaluate(`document.body.textContent.includes('cierre')`)) fail('S6: el borrador cambió pese al error.');
  ok('S6 error: aviso visible y borrador intacto');
  await shot('s6-error');

  ws.close();
  console.log(`QA visual del editor completo: capturas en ${path.relative(ROOT, SHOTS)}/`);
} finally {
  await cleanup();
}
