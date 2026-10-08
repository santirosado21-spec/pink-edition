// Descarga sólo un recurso público publicado por Mixkit; no envía material del cliente.
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'public/audio/mixkit');
mkdirSync(folder, {recursive: true});
const raw = path.join(folder, '1492.wav');
if (!existsSync(raw)) {
  const response = await fetch('https://assets.mixkit.co/active_storage/sfx/1492/1492.wav');
  if (!response.ok) throw new Error(`No se pudo descargar el SFX: ${response.status}`);
  writeFileSync(raw, Buffer.from(await response.arrayBuffer()));
}
const processed = path.join(folder, 'whoosh-soft.wav');
if (!existsSync(processed)) execFileSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-n', '-i', raw, '-af',
  'highpass=f=140,lowpass=f=7500,volume=-10dB,afade=t=in:d=0.015,afade=t=out:st=1.05:d=0.28',
  processed,
], {stdio: 'inherit'});
console.log('SFX preparado. Procedencia y licencia: AUDIO_ASSETS.md.');
