import "server-only";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { checkOneShotBrief, type OneShotBrief } from "../../src/oneShotBrief";
import type { BrandSnapshot } from '../../src/brandKit';

const TTL = 60 * 60 * 1000;

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
export class SessionError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
export type UploadSource = { id: string; name: string; bytes: number; sha256: string; seconds: number; width: number; height: number };
export type UploadSession = { id: string; expiresAt: number; brief: OneShotBrief; state: "awaiting_upload" | "received";
  sources?: UploadSource[]; brand?: BrandSnapshot; referenceScope?: 'brand-only' };
export const sessionRoot = () => path.join(os.tmpdir(), "cutkind-upload-sessions", createHash("sha256").update(process.cwd()).digest("hex").slice(0, 16));
export function sessionDir(id: string) {
  if (!uuid.test(id)) throw new SessionError("Confirma el cuestionario antes de subir.", 428);
  return path.join(sessionRoot(), id);
}
// Active preparation and export keep their temporary source files alive.
async function executing(id: string) {
  try {
    const run = JSON.parse(await fs.readFile(path.join(sessionDir(id), 'run.json'), 'utf8'));
    if (!['running', 'exporting'].includes(run.state) || !run.pid) return false;
    process.kill(run.pid, 0); return true;
  } catch { return false; }
}
export async function discardSession(id: string, expired = false) {
  if (await executing(id)) throw new SessionError('Espera a que termine la ejecución antes de descartar.', 409);
  if (!expired) {
    for (const name of ["upload.lock", "execution.lock"]) if (await fs.stat(path.join(sessionDir(id), name)).catch(() => null)) throw new SessionError("Espera a que termine la operación en curso.", 409);
  }
  await fs.rm(sessionDir(id), { recursive: true, force: true });
}
export async function sweepSessions(now = Date.now()) {
  let entries;
  try { entries = await fs.readdir(sessionRoot(), { withFileTypes: true }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
  for (const entry of entries) {
    if (!entry.isDirectory() || !uuid.test(entry.name)) continue;
    const dir = sessionDir(entry.name);
    try {
      const session: UploadSession = JSON.parse(await fs.readFile(path.join(dir, "session.json"), "utf8"));
      if (session.expiresAt <= now && !await executing(entry.name)) {
        const active = await fs.stat(path.join(dir, "upload.lock")).catch(() => null);
        if (!active || active.mtimeMs + TTL <= now) await discardSession(entry.name, true);
      }
    } catch {
      // Un proceso muerto antes de publicar metadata no deja temporales eternos.
      try { if ((await fs.stat(dir)).mtimeMs + TTL <= now) await discardSession(entry.name, true); } catch { /* Ya eliminado. */ }
    }
  }
}
async function startCleanup() {
  await fs.mkdir(sessionRoot(), { recursive: true, mode: 0o700 });
  await sweepSessions();
  const global = globalThis as typeof globalThis & { cutkindSessionTimers?: Map<string, ReturnType<typeof setInterval>> };
  global.cutkindSessionTimers ??= new Map();
  if (!global.cutkindSessionTimers.has(sessionRoot())) {
    const timer = setInterval(() => { void sweepSessions().catch(() => {}); }, 60_000);
    timer.unref?.();
    global.cutkindSessionTimers.set(sessionRoot(), timer);
  }
}
export async function createUploadSession(brief: OneShotBrief) {
  const errors = checkOneShotBrief(brief);
  if (errors.length) throw new SessionError(errors.join(" "), 422);
  await startCleanup();
  const session: UploadSession = { id: randomUUID(), expiresAt: Date.now() + TTL, brief, state: "awaiting_upload" };
  await fs.mkdir(sessionDir(session.id), { mode: 0o700 });
  await fs.writeFile(path.join(sessionDir(session.id), "session.json"), JSON.stringify(session), { flag: "wx", mode: 0o600 });
  return session;
}
export async function readUploadSession(id: string) {
  const dir = sessionDir(id);
  await startCleanup();
  let session: UploadSession;
  try { session = JSON.parse(await fs.readFile(path.join(dir, "session.json"), "utf8")); }
  catch { throw new SessionError("La sesión expiró. Confirma de nuevo el cuestionario.", 410); }
  if (session.id !== id || (session.expiresAt <= Date.now() && !await executing(id))) throw new SessionError("La sesión expiró. Confirma de nuevo el cuestionario.", 410);
  return session;
}
export async function writeUploadReceipt(session: UploadSession) {
  const dir = sessionDir(session.id);
  const tmp = path.join(dir, "session.tmp");
  await fs.writeFile(tmp, JSON.stringify(session), { mode: 0o600 });
  await fs.rename(tmp, path.join(dir, "session.json"));
}
