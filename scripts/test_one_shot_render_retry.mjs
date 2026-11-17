import assert from 'node:assert/strict';
import {isTransientCompositorError} from './one_shot_render_retry.mjs';

const observed = 'La edición está incompleta: Compositor error: No frame found at position 512 for source /tmp/x.mp4 (original source = http://localhost/api/media?asset=a.mp4). See https://remotion.dev/docs/troubleshooting/no-frame-found-at-position';
assert.equal(isTransientCompositorError(observed), true, 'no reconoció la firma observada');
assert.equal(isTransientCompositorError('La edición tiene requisitos pendientes.'), false);
assert.equal(isTransientCompositorError('La validación de audio o duración del MP4 falló.'), false);
assert.equal(isTransientCompositorError('Compositor error: ffmpeg exited with code 1'), false, 'otros errores del compositor no son reintentables por esta firma');
assert.equal(isTransientCompositorError(undefined), false);
assert.equal(isTransientCompositorError(null), false);
console.log('PASS: firma de fallo transitorio del compositor acotada a la evidencia observada');
