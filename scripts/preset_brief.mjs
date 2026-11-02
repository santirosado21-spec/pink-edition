// Expone el preset real de TypeScript a los scripts de evaluación sin duplicarlo.
// Esbuild hace aquí el mismo papel de cargador TS que los helpers de pruebas,
// pero resulta compatible con el compilador TypeScript 7 instalado en esta Mac.
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';

const presetId = process.argv[2];
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const bundled = esbuild.buildSync({
  entryPoints: [path.join(root, 'src/intakePresets.ts')],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
});
const module = { exports: {} };
vm.runInNewContext(bundled.outputFiles[0].text, { module, exports: module.exports, require });
const { INTAKE_PRESETS, quickPreferences, QUICK_OBJECTIVE, QUICK_AUDIENCE } = module.exports;
const preset = INTAKE_PRESETS.find((entry) => entry.id === presetId);

if (!preset) {
  console.error(`Preset desconocido: ${presetId ?? '(ninguno)'}.`);
  process.exit(2);
}

process.stdout.write(JSON.stringify({
  objective: QUICK_OBJECTIVE,
  audience: QUICK_AUDIENCE,
  preferences: { ...quickPreferences(), ...preset.preferences },
  musicMood: preset.musicMood,
}));
