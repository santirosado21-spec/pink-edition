// Prepara .venv-asr para las comprobaciones de audio del motor.
// Ligero por defecto (numpy/scipy/Pillow: correlación de voz y evidencia);
// la transcripción real necesita además `pip install -r requirements-asr.txt`
// (whisperx con torch, varios GB) y descarga de modelos en el primer uso.
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const run = (cmd, args) => execFileSync(cmd, args, {stdio: 'inherit'});
if (!existsSync('.venv-asr/bin/python')) run('python3', ['-m', 'venv', '.venv-asr']);
run('.venv-asr/bin/python', ['-m', 'pip', 'install', '-q', 'numpy', 'scipy', 'Pillow']);
console.log('Listo: comprobaciones de audio disponibles. Para transcribir: .venv-asr/bin/pip install -r requirements-asr.txt');
