import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { Plan, Timeline } from "../../src/edit";

export class PlanConflict extends Error {
  readonly status = 409;
}
export const contentHash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function jobDirectory(id: string) {
  if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(id)) throw new Error("Trabajo inválido.");
  return path.join(/* turbopackIgnore: true */ process.cwd(), "work", id);
}
export type ActiveEdit = { format: 1; plan: Plan; timeline: Timeline };
export async function readActiveEdit(id: string): Promise<ActiveEdit> {
  const dir = jobDirectory(id);
  try {
    const edit = JSON.parse(await fs.readFile(path.join(dir, "active-edit.json"), "utf8"));
    if (edit.format !== 1 || !edit.plan || !edit.timeline) throw new Error("La versión activa está dañada; conserva tus archivos y revisa el trabajo.");
    return edit;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return { format: 1, plan: JSON.parse(await fs.readFile(path.join(dir, "plan.json"), "utf8")),
    timeline: JSON.parse(await fs.readFile(path.join(dir, "timeline.json"), "utf8")) };
}
export async function atomicJson(file: string, data: unknown) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(data, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    await fs.rename(temporary, file);
  } finally { await fs.rm(temporary, { force: true }); }
}
export async function withJobWrite<T>(id: string, action: () => Promise<T>): Promise<T> {
  const file = path.join(jobDirectory(id), ".edit-write.lock");
  let handle;
  try { handle = await fs.open(file, "wx", 0o600); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new PlanConflict("Hay otro guardado o arranque en curso. Conserva tu borrador e intenta de nuevo.");
    throw error;
  }
  try { await handle.writeFile(JSON.stringify({ pid: process.pid, created_at: new Date().toISOString() })); return await action(); }
  finally { await handle.close(); await fs.unlink(file); }
}
// La pareja plan/timeline cambia mediante una única operación atómica.
export async function commitEdit(id: string, baseHash: string, edit: ActiveEdit) {
  const current = await readActiveEdit(id);
  if (contentHash(current.plan) !== baseHash) throw new PlanConflict("Este video cambió en otra pestaña. Tu borrador se conserva; recarga la versión actual antes de guardar.");
  const directory = path.join(jobDirectory(id), "versions");
  await fs.mkdir(directory, { recursive: true });
  const version = `${edit.plan.version}-${randomUUID()}.json`;
  await fs.writeFile(path.join(directory, version), JSON.stringify(edit, null, 2), { flag: "wx", mode: 0o600 });
  await atomicJson(path.join(jobDirectory(id), "active-edit.json"), edit);
}
