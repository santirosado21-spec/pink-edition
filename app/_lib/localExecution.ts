import 'server-only';
import { promises as fs, openSync, closeSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { readUploadSession, sessionDir, SessionError } from './localUploadSession';
import type { LocalRun, OneShotEdit } from '../../src/oneShotEdit';
export async function readRun(id: string): Promise<LocalRun | null> {
  const dir = sessionDir(id);
  try {
    const run: LocalRun = JSON.parse(await fs.readFile(path.join(dir, 'run.json'), 'utf8'));
    if (run.state === 'running' || run.state === 'exporting') {
      try { if (!run.pid) throw Error(); process.kill(run.pid, 0); }
      catch { return { ...run, state: 'failed', error: 'El proceso local se detuvo. Puedes reintentar con los archivos de esta sesión.' }; }
    }
    return run;
  } catch { return null; }
}
export async function readEdit(id: string): Promise<OneShotEdit | null> {
  try { return JSON.parse(await fs.readFile(path.join(sessionDir(id), 'edit.json'), 'utf8')); } catch { return null; }
}
export async function executeSession(id: string, order: string[], action: 'edit' | 'export', origin: string) {
  const session = await readUploadSession(id), dir = sessionDir(id);
  if (!(session.sources?.length)) throw new SessionError('Primero sube tus grabaciones.', 422);
  let current = await readRun(id);
  if (current?.state === 'running' || current?.state === 'exporting') throw new SessionError('Ya hay una ejecución en curso.', 409);
  let lock;
  try { lock = await fs.open(path.join(dir, 'upload.lock'), 'wx', 0o600); }
  catch { throw new SessionError('Espera a que termine la subida.', 409); }
  const executionLock = path.join(dir, 'execution.lock');
  let ownsExecution = false;
  try {
    current = await readRun(id);
    if (current?.state === "running" || current?.state === "exporting") throw new SessionError("Ya hay una ejecución en curso.", 409);
    // A stale worker lock can be removed only after the recorded process died.
    if (current?.state === 'failed') await fs.rm(executionLock, { force: true });
    const held = await fs.open(executionLock, 'wx', 0o600).catch(() => { throw new SessionError('La sesión está ocupada.', 409); });
    await held.close(); ownsExecution = true;
    await fs.rm(path.join(dir, "go"), { force: true });
    if (action === 'edit') {
      const ids = session.sources.map(s => s.id);
      if (order.length !== ids.length || new Set(order).size !== ids.length || order.some(s => !ids.includes(s))) throw new SessionError('El orden no corresponde a los videos recibidos.', 422);
      await fs.rm(path.join(dir, 'edit.json'), { force: true });
      await fs.writeFile(path.join(dir, 'input.json'), JSON.stringify({ ...session, sources: order.map(id => session.sources!.find(s => s.id === id)) }), { mode: 0o600 });
    } else {
      const edit = await readEdit(id);
      const input = await fs.readFile(path.join(dir, 'input.json'), 'utf8').then(text => JSON.parse(text)).catch(() => null);
      if (!edit || !input || edit.scenes.length !== session.sources.length || edit.scenes.some((s, i) => s.id !== input.sources[i]?.id) || edit.issues.length || !Object.values(edit.checks).every(Boolean)) throw new SessionError('Faltan requisitos de edición. Revisa el informe antes de exportar.', 422);
    }
    const log = openSync(path.join(dir, 'execution.log'), 'a', 0o600);
    try {
      const args = action === 'edit' ? ['scripts/one_shot_worker.py', dir] : ['scripts/one_shot_render.mjs', dir, origin];
      const child = spawn(action === 'edit' ? 'python3' : process.execPath, args, { cwd: process.cwd(), detached: true, stdio: ['ignore', log, log] });
      await new Promise<void>((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
      const run: LocalRun = { state: action === 'edit' ? 'running' : 'exporting', stage: 'Iniciando', updatedAt: Date.now(), pid: child.pid };
      await fs.writeFile(path.join(dir, 'launch.json'), JSON.stringify(run));
      // Worker starts with a short handshake so it never races this initial state.
      await fs.writeFile(path.join(dir, 'run.json'), JSON.stringify(run));
      await fs.writeFile(path.join(dir, 'go'), '');
      child.unref();
      return run;
    } finally { closeSync(log); }
  } catch (error) { if (ownsExecution) await fs.rm(executionLock, { force: true }); throw error; }
  finally { await lock.close(); await fs.rm(path.join(dir, 'upload.lock'), { force: true }); }
}
