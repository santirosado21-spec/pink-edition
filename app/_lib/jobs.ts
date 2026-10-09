import { execFile, spawn } from "node:child_process";
import { existsSync, openSync, promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { Plan, Style, Timeline } from "../../src/edit";

// La web corre en la misma máquina que el motor: lee y escribe `work/<id>/`.
const ROOT = process.cwd();
const WORK = path.join(ROOT, "work");
const MEDIA = path.join(ROOT, "public/work");
const run = promisify(execFile);
// El motor (Python, FFmpeg, recorte) sólo existe en el equipo que procesa; en Vercel no.
export const ENGINE_HERE = !process.env.VERCEL;
export const NO_ENGINE = "La edición todavía no está disponible en línea: el motor corre en el equipo local.";

export type JobStatus = {
  state: "running" | "ready" | "done" | "failed";
  stage: string;
  error: string | null;
  updated_at: number;
  pid?: number;
};
export type JobSummary = { id: string; title?: string; status: JobStatus; poster: string | null; hasOutput: boolean; seconds: number | null; words: number | null };
export type Job = JobSummary & {
  style: Style;
  plan: Plan;
  timeline: Timeline;
  media: { source: string; person: string | null };
  qc: string | null;
};

export const validId = (id: string) => /^[a-z0-9][a-z0-9-]{0,60}$/.test(id);
const dir = (id: string) => {
  if (!validId(id)) throw new Error("Identificador de trabajo inválido.");
  return path.join(WORK, id);
};
const readJson = async <T>(file: string): Promise<T | null> => {
  try {
    return JSON.parse(await fs.readFile(file, "utf-8")) as T;
  } catch {
    return null;
  }
};
const alive = (pid?: number) => {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

export const outputFile = (id: string) => path.join(dir(id), "out", `${id}.mp4`);
export const readStyle = async () => (await readJson<Style>(path.join(ROOT, "style/pink-demo-v1.json"))) as Style;

export const jobStatus = async (id: string): Promise<JobStatus> => {
  const status = await readJson<JobStatus>(path.join(dir(id), "status.json"));
  if (!status) return { state: "failed", stage: "start", error: "Sin estado: el trabajo no llegó a arrancar.", updated_at: 0 };
  // Un proceso que murió sin avisar no debe quedarse «en curso» para siempre.
  if (status.state === "running" && !alive(status.pid)) {
    return { ...status, state: "failed", error: status.error ?? "El proceso se detuvo antes de terminar." };
  }
  return status;
};

const summary = async (id: string): Promise<JobSummary> => {
  const timeline = await readJson<Timeline & { fps?: number }>(path.join(dir(id), "timeline.json"));
  return {
    id,
    status: await jobStatus(id),
    poster: existsSync(path.join(MEDIA, id, "poster.jpg")) ? `/work/${id}/poster.jpg` : null,
    hasOutput: existsSync(outputFile(id)),
    seconds: timeline ? timeline.duration_frames / (timeline.fps ?? 30) : null,
    words: timeline ? timeline.clips.reduce((total, clip) => total + clip.words.length, 0) : null,
  };
};

export const listJobs = async (): Promise<JobSummary[]> => {
  if (!existsSync(WORK)) return [];
  const entries = await fs.readdir(WORK, { withFileTypes: true });
  const ids = entries.filter((entry) => entry.isDirectory() && validId(entry.name) && existsSync(path.join(WORK, entry.name, "status.json")));
  const jobs = await Promise.all(ids.map((entry) => summary(entry.name)));
  return jobs.sort((a, b) => b.status.updated_at - a.status.updated_at);
};

export const readJob = async (id: string): Promise<Job | null> => {
  const timeline = await readJson<Timeline>(path.join(dir(id), "timeline.json"));
  const plan = await readJson<Plan>(path.join(dir(id), "plan.json"));
  if (!timeline || !plan) return null;
  let qc: string | null = null;
  try {
    qc = await fs.readFile(path.join(dir(id), "out/QC.txt"), "utf-8");
  } catch {
    qc = null;
  }
  return {
    ...(await summary(id)),
    style: await readStyle(),
    plan,
    timeline,
    media: { source: `work/${id}/source.mp4`, person: existsSync(path.join(MEDIA, id, "person.webm")) ? `work/${id}/person.webm` : null },
    qc: existsSync(outputFile(id)) ? qc : null,
  };
};

// Comprobación estructural del plan contra el esquema y contra las palabras reales.
export const checkPlan = async (id: string, plan: Plan): Promise<string[]> => {
  const timeline = await readJson<Timeline>(path.join(dir(id), "timeline.json"));
  return timeline ? validatePlan(plan, timeline) : ["Falta el montaje del video."];
};

export const validatePlan = async (plan: Plan, timeline: Timeline): Promise<string[]> => {
  const errors: string[] = [];
  const schema = await readJson<{ properties: Record<string, { items: { properties: Record<string, { enum?: string[] }> } }> }>(path.join(ROOT, "schema/edit-plan.schema.json"));
  if (!schema) return ["Falta el esquema del plan."];
  const words = new Set(timeline.clips.flatMap((clip) => clip.words.map((word) => word.id)));
  const allowed = (group: string, field: string) => schema.properties[group].items.properties[field].enum ?? [];
  const ids = new Set<string>();
  for (const group of ["cuts", "cards", "backgrounds"] as const) {
    if (!Array.isArray(plan[group])) return [`El plan no tiene la lista ${group}.`];
    for (const event of plan[group]) {
      const name = `${group}/${event.id}`;
      if (!event.id || ids.has(event.id)) errors.push(`${name}: identificador vacío o repetido.`);
      ids.add(event.id);
      if (!allowed(group, "theme").includes(event.theme)) errors.push(`${name}: tema desconocido «${event.theme}».`);
      if (!words.has(event.anchor_word_id)) errors.push(`${name}: la palabra de anclaje no existe.`);
      if (!Number.isInteger(event.duration_frames) || event.duration_frames < 1) errors.push(`${name}: duración inválida.`);
      if (!Number.isInteger(event.offset_frames)) errors.push(`${name}: desfase inválido.`);
    }
  }
  for (const cut of plan.cuts) {
    if (!allowed("cuts", "style").includes(cut.style)) errors.push(`cuts/${cut.id}: estilo desconocido.`);
    if (!words.has(cut.last_word_id)) errors.push(`cuts/${cut.id}: la última palabra no existe.`);
  }
  for (const card of plan.cards) {
    if (!allowed("cards", "kind").includes(card.kind)) errors.push(`cards/${card.id}: tarjeta desconocida «${card.kind}».`);
    if (!card.beat || !words.has(card.beat.anchor_word_id)) errors.push(`cards/${card.id}: la palabra de énfasis no existe.`);
  }
  for (const background of plan.backgrounds) {
    if (!allowed("backgrounds", "motif").includes(background.motif)) errors.push(`backgrounds/${background.id}: motivo desconocido.`);
  }
  return errors;
};

// Cada guardado es una versión nueva; las tarjetas se recolocan sobre la persona.
export const savePlan = async (id: string, incoming: Plan): Promise<Plan> => {
  const file = path.join(dir(id), "plan.json");
  const current = await readJson<Plan>(file);
  const plan: Plan = { ...incoming, version: (current?.version ?? 0) + 1 };
  await fs.mkdir(path.join(dir(id), "plans"), { recursive: true });
  const text = JSON.stringify(plan, null, 2) + "\n";
  await fs.writeFile(file, text, "utf-8");
  const person = path.join(MEDIA, id, "person.webm");
  if (plan.cards.length > 0 && existsSync(person)) {
    await run(path.join(ROOT, ".venv/bin/python"), [
      "scripts/place_graphics.py",
      "--style", "style/pink-demo-v1.json",
      "--plan", file,
      "--timeline", path.join(dir(id), "timeline.json"),
      "--person", person,
    ], { cwd: ROOT });
  }
  await fs.copyFile(file, path.join(dir(id), "plans", `plan-v${plan.version}.json`));
  return (await readJson<Plan>(file)) as Plan;
};

export const runningJob = async () => (await listJobs()).find((job) => job.status.state === "running") ?? null;

// Lanza el motor en segundo plano; su avance queda en `status.json` y `job.log`.
export const startPipeline = async (id: string, source: string, mode: "prepare" | "render") => {
  if (!ENGINE_HERE) throw new Error(NO_ENGINE);
  const busy = await runningJob();
  if (busy) throw new Error(`Ya hay un video en proceso (${busy.id}). Esta versión procesa uno a la vez.`);
  await fs.mkdir(path.join(dir(id), "out"), { recursive: true });
  const log = openSync(path.join(dir(id), "job.log"), "a");
  const child = spawn("python3", ["scripts/pink_edit.py", source, "--id", id, ...(mode === "prepare" ? ["--prepare-only"] : [])], {
    cwd: ROOT,
    detached: true,
    stdio: ["ignore", log, log],
  });
  const status: JobStatus = { state: "running", stage: "start", error: null, updated_at: Date.now() / 1000, pid: child.pid };
  await fs.writeFile(path.join(dir(id), "status.json"), JSON.stringify(status), "utf-8");
  child.unref();
};

export const sourceFile = (id: string) => path.join(MEDIA, id, "source.mp4");
export const uploadTarget = async (name: string) => {
  const base = name.replace(/\.[^.]+$/, "").toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "video";
  let id = base;
  for (let attempt = 2; existsSync(path.join(WORK, id)); attempt++) id = `${base}-${attempt}`;
  const extension = (name.match(/\.[a-z0-9]{2,5}$/i)?.[0] ?? ".mp4").toLowerCase();
  await fs.mkdir(path.join(WORK, "_uploads"), { recursive: true });
  return { id, file: path.join(WORK, "_uploads", `${id}${extension}`) };
};
