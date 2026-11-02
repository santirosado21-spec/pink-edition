import { execFile, spawn } from "node:child_process";
import { existsSync, openSync, closeSync, readFileSync, promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";
import schemaJson from "../../schema/edit-plan.schema.json";
import styleJson from "../../style/pink-demo-v1.json";
import type { Plan, Style, Timeline } from "../../src/edit";
import { checkPreferences } from "../../src/preferences";
import { TAKE_TRANSITIONS, ZOOM_SCALE } from "../../src/zooms";
import { readProfileFile } from "./profileFile";
import { withFaceSafety } from "./faceSafety";
import { readActiveEdit, withJobWrite, contentHash, commitEdit, atomicJson, PlanConflict } from "./planStore";
import { buildRunManifest } from "./runManifest";

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

export const outputFile = (id: string) => {
  const pointer = join(dir(id), "current-render.json");
  if (existsSync(pointer)) {
    const run = JSON.parse(readFileSync(pointer, "utf8"));
    if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(run.id)) throw new Error("Registro de render inválido.");
    return join(dir(id), "renders", run.id, "out", `${id}.mp4`);
  }
  return join(dir(id), "out", `${id}.mp4`);
};
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

// Los videos analizados antes de los zooms no tienen la cabeza por toma: se mide una vez
// y se guarda, para que la vista previa y el render encuadren igual.
const backfillHeads = async (id: string, timeline: Timeline) => {
  const person = join(MEDIA, id, "person.webm");
  if (timeline.clips.every((clip) => "head" in clip) || !existsSync(person)) return timeline;
  // Si el motor está procesando este video, él escribe el timeline: no se mide en paralelo.
  if ((await jobStatus(id)).state === "running") return timeline;
  try {
    await run(at(".venv/bin/python"), ["scripts/heads.py", "--timeline", join(dir(id), "timeline.json"), "--person", person], { cwd: ROOT });
    return (await readJson<Timeline>(join(dir(id), "timeline.json"))) ?? timeline;
  } catch {
    return timeline;
  }
};

export const readJob = async (id: string): Promise<Job | null> => {
  let active;
  try { active = await readActiveEdit(id); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
  const stored = active.timeline;
  const frozen = existsSync(join(dir(id), "active-edit.json"));
  const headed = !frozen && ENGINE_HERE ? await backfillHeads(id, stored) : stored;
  const timeline = !frozen && ENGINE_HERE && (await jobStatus(id)).state !== "running" ? await withFaceSafety(id, headed) : headed;
  const plan = active.plan;
  if (!timeline || !plan) return null;
  let qc: string | null = null;
  try {
    qc = await fs.readFile(join(path.dirname(outputFile(id)), "QC.txt"), "utf-8");
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
  const timeline = (await readActiveEdit(id)).timeline;
  if (!timeline) return ["Falta el montaje del video."];
  const errors = await validatePlan(plan, timeline);
  if (errors.length) return errors;
  for (const card of plan.cards) {
    if (card.kind !== "photo") continue;
    const expected = `work/${id}/photos/${card.photo!.provider.toLowerCase()}-${card.photo!.id}.jpg`;
    if (card.photo!.asset !== expected || !existsSync(at("public", expected)) || !existsSync(at("public", expected + ".json"))) {
      errors.push("La foto debe descargarse desde el buscador para este video.");
    }
  }
  return errors;
};

const validStockPhoto = (photo: NonNullable<Plan["cards"][number]["photo"]>) =>
  photo.provider === "Wikimedia" ? typeof photo.id === "number" && Number.isSafeInteger(photo.id) && photo.id > 0 && photo.license === "https://creativecommons.org/publicdomain/zero/1.0/" :
  (photo.provider === "Pexels" || photo.provider === "Pixabay") ? typeof photo.id === "number" && Number.isSafeInteger(photo.id) && photo.id > 0 && (photo.provider !== "Pixabay" || photo.license === "https://pixabay.com/service/license-summary/") :
  photo.provider === "Openverse" && typeof photo.id === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(photo.id) && photo.license === "https://creativecommons.org/publicdomain/zero/1.0/";
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
  if (plan.zooms !== undefined && (!Array.isArray(plan.zooms) || plan.zooms.some((event) => typeof event !== "object" || event === null))) return ["La lista de zooms no es válida."];
  const zooms = plan.zooms ?? [];
  if (plan.cuts.length + plan.cards.length + plan.backgrounds.length + zooms.length > MAX_EVENTS) return [`El plan tiene más de ${MAX_EVENTS} elementos.`];
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
    if (card.kind === "photo" && (!card.photo || !validStockPhoto(card.photo) || typeof card.photo.asset !== "string" || !/^work\/[a-z0-9-]+\/photos\/(?:(?:pexels|pixabay|wikimedia)-[0-9]+|openverse-[a-f0-9-]{36})\.jpg$/.test(card.photo.asset))) errors.push(`cards/${card.id}: foto de archivo inválida.`);
    if (!allowed("cards", "kind").includes(card.kind)) errors.push(`cards/${card.id}: tarjeta desconocida «${card.kind}».`);
    if (!card.beat || !frames.has(card.beat.anchor_word_id) || !Number.isInteger(card.beat.offset_frames) || Math.abs(card.beat.offset_frames) > total) errors.push(`cards/${card.id}: la palabra de énfasis no existe.`);
    if (card.text !== undefined && (typeof card.text !== "string" || card.text.length > 12)) errors.push(`cards/${card.id}: el texto admite hasta 12 caracteres.`);
    // Un contador sin cifra dicha saldría vacío: no se inventa ninguna.
    if (card.kind === "counter" && !card.text?.trim()) errors.push(`cards/${card.id}: el contador necesita la cifra que se dijo.`);
  }
  for (const background of plan.backgrounds) {
    if (!allowed("backgrounds", "motif").includes(background.motif)) errors.push(`backgrounds/${background.id}: motivo desconocido.`);
  }
  // Zooms: mismas reglas de anclaje y tiempo que los demás elementos, y escala acotada.
  for (const zoom of zooms) {
    const name = `zooms/${zoom.id}`;
    if (typeof zoom.id !== "string" || !zoom.id || ids.has(zoom.id)) errors.push(`${name}: identificador vacío o repetido.`);
    ids.add(zoom.id);
    const anchor = frames.get(zoom.anchor_word_id);
    if (anchor === undefined) errors.push(`${name}: la palabra de anclaje no existe.`);
    if (!Number.isInteger(zoom.duration_frames) || zoom.duration_frames < 1 || zoom.duration_frames > total) errors.push(`${name}: duración inválida.`);
    if (!Number.isInteger(zoom.offset_frames) || Math.abs(zoom.offset_frames) > total) errors.push(`${name}: desfase inválido.`);
    else if (anchor !== undefined && (anchor + zoom.offset_frames < 0 || anchor + zoom.offset_frames >= total)) errors.push(`${name}: empieza fuera del video.`);
    if (typeof zoom.scale !== "number" || !(zoom.scale >= ZOOM_SCALE.min && zoom.scale <= ZOOM_SCALE.max)) errors.push(`${name}: la escala va de ${ZOOM_SCALE.min} a ${ZOOM_SCALE.max}.`);
  }
  if (plan.take_transition !== undefined && !TAKE_TRANSITIONS.includes(plan.take_transition)) errors.push("Transición entre tomas desconocida.");
  if (plan.emphasis_word_ids !== undefined) {
    const emphasis = plan.emphasis_word_ids;
    if (!Array.isArray(emphasis) || emphasis.length > MAX_EMPHASIS || new Set(emphasis).size !== emphasis.length) errors.push(`Las palabras resaltadas deben ser una lista sin repetidos de hasta ${MAX_EMPHASIS}.`);
    else if (emphasis.some((id) => typeof id !== "string" || !frames.has(id))) errors.push("Una palabra resaltada no existe en el video.");
  }
  return errors;
};

// Cada guardado es una versión nueva; las tarjetas se recolocan sobre la persona.
export const savePlan = async (id: string, incoming: Plan, expected?: { planHash: string; timelineHash: string; timeline: Timeline }): Promise<Plan> => {
  const base = await readActiveEdit(id);
  if (expected && contentHash(base.plan) !== expected.planHash) throw new PlanConflict("La base de esta candidata cambió.");
  if (incoming.version !== base.plan.version) throw new PlanConflict("Tu borrador parte de otra versión. Conservamos tus cambios; recarga la versión actual antes de guardar.");
  if ((await jobStatus(id)).state === "running") throw new PlanConflict("Espera a que termine el procesamiento antes de guardar. Tu borrador sigue intacto.");
  const errors = await checkPlan(id, incoming);
  if (errors.length) throw new Error(errors.join(" "));
  const person = join(MEDIA, id, "person.webm");
  if (incoming.cards.length > 0 && !existsSync(person)) {
    throw new Error("Falta el recorte de la persona. Prepara el video antes de guardar tarjetas; no se modificó el plan.");
  }
  const stage = await fs.mkdtemp(join(dir(id), ".save-"));
  try {
    const file = join(stage, "plan.json"), timelineFile = join(stage, "timeline.json");
    const plan: Plan = { ...incoming, version: base.plan.version + 1 };
    // Preparar fuera del lock y fuera de los archivos activos. Un fallo no cambia el video.
    const headed = await readJob(id);
    if (expected && contentHash(headed?.timeline) !== expected.timelineHash) throw new PlanConflict("El montaje de esta candidata cambió.");
    await fs.writeFile(file, JSON.stringify(plan));
    await fs.writeFile(timelineFile, JSON.stringify(expected?.timeline ?? headed?.timeline ?? base.timeline));
    if (!expected) {
      await run(at(".venv/bin/python"), ["scripts/layout_captions.py", "--timeline", timelineFile, "--plan", file], { cwd: ROOT });
      if (plan.cards.length > 0) await run(at(".venv/bin/python"), ["scripts/place_graphics.py", "--style", "style/pink-demo-v1.json",
        "--plan", file, "--timeline", timelineFile, "--person", person], { cwd: ROOT });
    }
    const edit = { format: 1 as const, plan: JSON.parse(await fs.readFile(file, "utf8")) as Plan,
      timeline: JSON.parse(await fs.readFile(timelineFile, "utf8")) as Timeline };
    await withJobWrite(id, async () => {
      if ((await jobStatus(id)).state === "running") throw new PlanConflict("Empezó un procesamiento mientras guardabas. Conserva tu borrador e intenta después.");
      if (expected && contentHash((await readActiveEdit(id)).timeline) !== expected.timelineHash) throw new PlanConflict("El montaje cambió mientras aplicabas la candidata.");
      await commitEdit(id, contentHash(base.plan), edit);
    });
    return edit.plan;
  } finally { await fs.rm(stage, { recursive: true, force: true }); }
};

export const runningJob = async () => (await listJobs()).find((job) => job.status.state === "running") ?? null;

// Lanza el motor en segundo plano; su avance queda en `status.json` y `job.log`.
export const startPipeline = async (id: string, source: string, mode: "prepare" | "render") => {
  if (!ENGINE_HERE) throw new Error(NO_ENGINE);
  const preferences = mode === "prepare" ? await readProfileFile() : null;
  const busy = await runningJob();
  if (busy) throw new Error(`Ya hay un video en proceso (${busy.id}). Esta versión procesa uno a la vez.`);
  await fs.mkdir(dir(id), { recursive: true });
  return withJobWrite(id, async () => {
  if ((await jobStatus(id)).state === "running") throw new PlanConflict("Este video ya está en proceso.");
  if (mode === "prepare" && existsSync(join(dir(id), "active-edit.json"))) throw new PlanConflict("Este video ya tiene versiones editadas. Sube el original como un trabajo nuevo para volver a prepararlo.");
  await fs.mkdir(join(dir(id), "out"), { recursive: true });
  // Un video nuevo nace con el estilo del creador (cuestionario); el motor lo copia al plan inicial.
  const profile = join(dir(id), "preferences-snapshot.json");
  if (preferences !== null) await fs.writeFile(profile, JSON.stringify(preferences), "utf-8");
  const prepare = ["--prepare-only", ...(preferences !== null ? ["--preferences", profile] : [])];
  // Exportar exactamente el montaje revisado, sin volver a alinear las palabras.
  let render: string[] = [];
  if (mode === "render") {
    const active = await readJob(id);
    if (!active) throw new Error("El video todavía no está preparado.");
    const problems = await checkPlan(id, active.plan);
    if (problems.length) throw new Error(problems.join(" "));
    const runId = randomUUID(), input = join(dir(id), "renders", runId, "input");
    await fs.mkdir(input, { recursive: true });
    await fs.writeFile(join(input, "plan.json"), JSON.stringify(active.plan));
    await fs.writeFile(join(input, "timeline.json"), JSON.stringify(active.timeline));
    await fs.writeFile(join(input, "style.json"), JSON.stringify(active.style));
    await fs.writeFile(join(input, "manifest.json"), JSON.stringify(await buildRunManifest(id, active.plan, active.timeline, active.style, Date.now()), null, 2));
    render = ["--execution-id", runId, "--plan", join(input, "plan.json"), "--timeline-from", join(input, "timeline.json"), "--style", join(input, "style.json")];
    await atomicJson(join(dir(id), "current-render.json"), { id: runId, plan_version: active.plan.version, plan_hash: contentHash(active.plan) });
  }
  const status: JobStatus = { state: "running", stage: "start", error: null, updated_at: Date.now() / 1000, pid: process.pid };
  await atomicJson(join(dir(id), "status.json"), status);
  const log = openSync(join(dir(id), "job.log"), "a");
  try {
    const child = spawn("python3", ["scripts/pink_edit.py", source, "--id", id, ...(mode === "prepare" ? prepare : render)], {
      cwd: ROOT, detached: true, stdio: ["ignore", log, log],
    });
    child.once("exit", () => {
      // También cubrir fallos de importación anteriores al primer estado de Python.
      void (async () => {
        const latest = await readJson<JobStatus>(join(dir(id), "status.json"));
        if (latest?.state === "running" && (latest.pid === child.pid || latest.pid === process.pid)) {
          await atomicJson(join(dir(id), "status.json"), { ...latest, state: "failed",
            error: "El motor terminó sin confirmar el resultado. Revisa el registro del trabajo." });
        }
      })().catch(() => { /* La recuperación durable tras reinicios pertenece a la cola. */ });
    });
    await new Promise<void>((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
    // Python publica su propio PID antes de trabajar; no sobrescribir sus etapas.
    child.unref();
  } catch (error) {
    await atomicJson(join(dir(id), "status.json"), { ...status, state: "failed", error: "No se pudo iniciar el motor." });
    throw error;
  } finally { closeSync(log); }
  });
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
