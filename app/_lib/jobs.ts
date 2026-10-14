import { execFile, spawn } from "node:child_process";
import { existsSync, openSync, promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import schemaJson from "../../schema/edit-plan.schema.json";
import styleJson from "../../style/pink-demo-v1.json";
import type { Plan, Style, Timeline } from "../../src/edit";
import { checkPreferences } from "../../src/preferences";

// La web corre en la misma máquina que el motor: lee y escribe `work/<id>/`.
// Los comentarios evitan que el compilador rastree las carpetas del motor (work/, .venv/…)
// y las meta en el paquete del servidor: son datos de esta máquina, no parte del programa.
const join = (first: string, ...rest: string[]) => path.join(/* turbopackIgnore: true */ first, ...rest);
const at = (...parts: string[]) => path.join(/* turbopackIgnore: true */ process.cwd(), ...parts);
const ROOT = at();
const WORK = at("work");
const MEDIA = at("public/work");
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
  return join(WORK, id);
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

export const outputFile = (id: string) => join(dir(id), "out", `${id}.mp4`);
// Estilo y esquema van dentro del programa: así existen también donde no hay motor.
export const readStyle = async (): Promise<Style> => styleJson;

export const jobStatus = async (id: string): Promise<JobStatus> => {
  const status = await readJson<JobStatus>(join(dir(id), "status.json"));
  if (!status) return { state: "failed", stage: "start", error: "Sin estado: el trabajo no llegó a arrancar.", updated_at: 0 };
  // Un proceso que murió sin avisar no debe quedarse «en curso» para siempre.
  if (status.state === "running" && !alive(status.pid)) {
    return { ...status, state: "failed", error: status.error ?? "El proceso se detuvo antes de terminar." };
  }
  return status;
};

const summary = async (id: string): Promise<JobSummary> => {
  const timeline = await readJson<Timeline & { fps?: number }>(join(dir(id), "timeline.json"));
  return {
    id,
    status: await jobStatus(id),
    poster: existsSync(join(MEDIA, id, "poster.jpg")) ? `/work/${id}/poster.jpg` : null,
    hasOutput: existsSync(outputFile(id)),
    seconds: timeline ? timeline.duration_frames / (timeline.fps ?? 30) : null,
    words: timeline ? timeline.clips.reduce((total, clip) => total + clip.words.length, 0) : null,
  };
};

export const listJobs = async (): Promise<JobSummary[]> => {
  if (!existsSync(WORK)) return [];
  const entries = await fs.readdir(WORK, { withFileTypes: true });
  const ids = entries.filter((entry) => entry.isDirectory() && validId(entry.name) && existsSync(join(WORK, entry.name, "status.json")));
  const jobs = await Promise.all(ids.map((entry) => summary(entry.name)));
  return jobs.sort((a, b) => b.status.updated_at - a.status.updated_at);
};

export const readJob = async (id: string): Promise<Job | null> => {
  const timeline = await readJson<Timeline>(join(dir(id), "timeline.json"));
  const plan = await readJson<Plan>(join(dir(id), "plan.json"));
  if (!timeline || !plan) return null;
  let qc: string | null = null;
  try {
    qc = await fs.readFile(join(dir(id), "out/QC.txt"), "utf-8");
  } catch {
    qc = null;
  }
  return {
    ...(await summary(id)),
    style: await readStyle(),
    plan,
    timeline,
    media: { source: `work/${id}/source.mp4`, person: existsSync(join(MEDIA, id, "person.webm")) ? `work/${id}/person.webm` : null },
    qc: existsSync(outputFile(id)) ? qc : null,
  };
};

// Comprobación estructural del plan contra el esquema y contra las palabras reales.
export const checkPlan = async (id: string, plan: Plan): Promise<string[]> => {
  const timeline = await readJson<Timeline>(join(dir(id), "timeline.json"));
  return timeline ? validatePlan(plan, timeline) : ["Falta el montaje del video."];
};

const MAX_EVENTS = 60;
export const MAX_EMPHASIS = 40;
type SchemaGroup = { items: { properties: Record<string, { enum?: string[] }> } };

export const validatePlan = async (plan: Plan, timeline: Timeline): Promise<string[]> => {
  const errors: string[] = [];
  if (typeof plan !== "object" || plan === null) return ["El plan no es válido."];
  if (plan.preferences !== undefined) {
    const problems = checkPreferences(plan.preferences);
    if (problems.length > 0) return problems;
  }
  const groups = schemaJson.properties as unknown as Record<string, SchemaGroup>;
  const total = timeline.duration_frames;
  const frames = new Map(timeline.clips.flatMap((clip) => clip.words.map((word) => [word.id, clip.timeline_in_frame + word.source_start_frame - clip.source_in_frame] as const)));
  const allowed = (group: string, field: string) => groups[group].items.properties[field].enum ?? [];
  const ids = new Set<string>();
  for (const group of ["cuts", "cards", "backgrounds"] as const) {
    if (!Array.isArray(plan[group])) return [`El plan no tiene la lista ${group}.`];
    if (plan[group].some((event) => typeof event !== "object" || event === null)) return [`La lista ${group} tiene un elemento que no es válido.`];
  }
  if (plan.cuts.length + plan.cards.length + plan.backgrounds.length > MAX_EVENTS) return [`El plan tiene más de ${MAX_EVENTS} elementos.`];
  for (const group of ["cuts", "cards", "backgrounds"] as const) {
    for (const event of plan[group]) {
      const name = `${group}/${event.id}`;
      if (typeof event.id !== "string" || !event.id || ids.has(event.id)) errors.push(`${name}: identificador vacío o repetido.`);
      ids.add(event.id);
      if (!allowed(group, "theme").includes(event.theme)) errors.push(`${name}: tema desconocido «${event.theme}».`);
      const anchor = frames.get(event.anchor_word_id);
      if (anchor === undefined) errors.push(`${name}: la palabra de anclaje no existe.`);
      // Cotas: un número fuera del video dejaría colgado el cálculo de posiciones.
      if (!Number.isInteger(event.duration_frames) || event.duration_frames < 1 || event.duration_frames > total) errors.push(`${name}: duración inválida.`);
      if (!Number.isInteger(event.offset_frames) || Math.abs(event.offset_frames) > total) errors.push(`${name}: desfase inválido.`);
      else if (anchor !== undefined && (anchor + event.offset_frames < 0 || anchor + event.offset_frames >= total)) errors.push(`${name}: empieza fuera del video.`);
    }
  }
  for (const cut of plan.cuts) {
    if (!allowed("cuts", "style").includes(cut.style)) errors.push(`cuts/${cut.id}: estilo desconocido.`);
    if (!frames.has(cut.last_word_id)) errors.push(`cuts/${cut.id}: la última palabra no existe.`);
  }
  for (const card of plan.cards) {
    if (!allowed("cards", "kind").includes(card.kind)) errors.push(`cards/${card.id}: tarjeta desconocida «${card.kind}».`);
    if (!card.beat || !frames.has(card.beat.anchor_word_id) || !Number.isInteger(card.beat.offset_frames) || Math.abs(card.beat.offset_frames) > total) errors.push(`cards/${card.id}: la palabra de énfasis no existe.`);
    if (card.text !== undefined && (typeof card.text !== "string" || card.text.length > 12)) errors.push(`cards/${card.id}: el texto admite hasta 12 caracteres.`);
    // Un contador sin cifra dicha saldría vacío: no se inventa ninguna.
    if (card.kind === "counter" && !card.text?.trim()) errors.push(`cards/${card.id}: el contador necesita la cifra que se dijo.`);
  }
  for (const background of plan.backgrounds) {
    if (!allowed("backgrounds", "motif").includes(background.motif)) errors.push(`backgrounds/${background.id}: motivo desconocido.`);
  }
  if (plan.emphasis_word_ids !== undefined) {
    const emphasis = plan.emphasis_word_ids;
    if (!Array.isArray(emphasis) || emphasis.length > MAX_EMPHASIS || new Set(emphasis).size !== emphasis.length) errors.push(`Las palabras resaltadas deben ser una lista sin repetidos de hasta ${MAX_EMPHASIS}.`);
    else if (emphasis.some((id) => typeof id !== "string" || !frames.has(id))) errors.push("Una palabra resaltada no existe en el video.");
  }
  return errors;
};

// Cada guardado es una versión nueva; las tarjetas se recolocan sobre la persona.
export const savePlan = async (id: string, incoming: Plan): Promise<Plan> => {
  const file = join(dir(id), "plan.json");
  const current = await readJson<Plan>(file);
  const plan: Plan = { ...incoming, version: (current?.version ?? 0) + 1 };
  await fs.mkdir(join(dir(id), "plans"), { recursive: true });
  const text = JSON.stringify(plan, null, 2) + "\n";
  await fs.writeFile(file, text, "utf-8");
  const person = join(MEDIA, id, "person.webm");
  if (plan.cards.length > 0 && existsSync(person)) {
    await run(at(".venv/bin/python"), [
      "scripts/place_graphics.py",
      "--style", "style/pink-demo-v1.json",
      "--plan", file,
      "--timeline", join(dir(id), "timeline.json"),
      "--person", person,
    ], { cwd: ROOT });
  }
  await fs.copyFile(file, join(dir(id), "plans", `plan-v${plan.version}.json`));
  return (await readJson<Plan>(file)) as Plan;
};

export const runningJob = async () => (await listJobs()).find((job) => job.status.state === "running") ?? null;

// Lanza el motor en segundo plano; su avance queda en `status.json` y `job.log`.
export const startPipeline = async (id: string, source: string, mode: "prepare" | "render") => {
  if (!ENGINE_HERE) throw new Error(NO_ENGINE);
  const busy = await runningJob();
  if (busy) throw new Error(`Ya hay un video en proceso (${busy.id}). Esta versión procesa uno a la vez.`);
  await fs.mkdir(join(dir(id), "out"), { recursive: true });
  const log = openSync(join(dir(id), "job.log"), "a");
  // Un video nuevo nace con el estilo del creador (cuestionario); el motor lo copia al plan inicial.
  const profile = at("work", "_profile.json");
  const prepare = ["--prepare-only", ...(existsSync(profile) ? ["--preferences", profile] : [])];
  const child = spawn("python3", ["scripts/pink_edit.py", source, "--id", id, ...(mode === "prepare" ? prepare : [])], {
    cwd: ROOT,
    detached: true,
    stdio: ["ignore", log, log],
  });
  const status: JobStatus = { state: "running", stage: "start", error: null, updated_at: Date.now() / 1000, pid: child.pid };
  await fs.writeFile(join(dir(id), "status.json"), JSON.stringify(status), "utf-8");
  child.unref();
};

export const sourceFile = (id: string) => join(MEDIA, id, "source.mp4");
export const uploadTarget = async (name: string) => {
  const base = name.replace(/\.[^.]+$/, "").toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "video";
  let id = base;
  for (let attempt = 2; existsSync(join(WORK, id)); attempt++) id = `${base}-${attempt}`;
  const extension = (name.match(/\.[a-z0-9]{2,5}$/i)?.[0] ?? ".mp4").toLowerCase();
  await fs.mkdir(join(WORK, "_uploads"), { recursive: true });
  return { id, file: join(WORK, "_uploads", `${id}${extension}`) };
};
