// Descarga recursos públicos publicados por Mixkit; no envía material del cliente.
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'public/audio/mixkit');
mkdirSync(folder, {recursive: true});
// Número de ítem en Mixkit y nombre local; procedencia en AUDIO_ASSETS.md.
const sounds = [[2608, 'air-zoom-2608.wav'], [166, 'sweep-166.wav'], [3115, 'swoosh-3115.wav']];
for (const [item, name] of sounds) {
  const target = path.join(folder, name);
  if (existsSync(target)) continue;
  const response = await fetch(`https://assets.mixkit.co/active_storage/sfx/${item}/${item}.wav`);
  if (!response.ok) throw new Error(`No se pudo descargar el SFX ${item}: ${response.status}`);
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
}
console.log('SFX preparados. Procedencia y licencia: AUDIO_ASSETS.md.');
