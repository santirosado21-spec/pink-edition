import type { Plan, Timeline } from "../../src/edit";
import { CLOUD } from "./supabase/config";
import { supabaseServer } from "./supabase/server";
import { readStyle, validatePlan, type Job, type JobStatus, type JobSummary } from "./jobs";

export { CLOUD };

type VideoRow = { id: string; title: string; status: string; duration_seconds: number | null; poster_path: string | null; person_path: string | null; source_path: string; error: string | null };
type JobRow = { video_id: string; kind: string; status: string; error: string | null; created_at: string };

const HOUR = 4 * 3600;
const COLUMNS = "id,title,status,duration_seconds,poster_path,person_path,source_path,error";

// El estado visible sale del último trabajo; el del video sólo decide cuando no hay uno activo.
const statusOf = (video: VideoRow, job?: JobRow): JobStatus => {
  const updated_at = Date.now() / 1000;
  if (job && (job.status === "queued" || job.status === "running")) {
    return { state: "running", stage: job.status === "queued" ? "queued" : job.kind, error: null, updated_at };
  }
  if (job?.status === "failed") return { state: "failed", stage: job.kind, error: job.error ?? "El procesamiento falló.", updated_at };
  if (video.status === "done") return { state: "done", stage: "finish", error: null, updated_at };
  if (video.status === "ready_to_edit") return { state: "ready", stage: "place", error: null, updated_at };
  if (video.status === "failed") return { state: "failed", stage: "analyze", error: video.error ?? "El procesamiento falló.", updated_at };
  return { state: "running", stage: "queued", error: null, updated_at };
};

const latestJobs = async (ids: string[]) => {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("jobs").select("video_id,kind,status,error,created_at").in("video_id", ids).order("created_at", { ascending: false });
  const latest = new Map<string, JobRow>();
  for (const job of (data ?? []) as JobRow[]) if (!latest.has(job.video_id)) latest.set(job.video_id, job);
  return latest;
};

const sign = async (bucket: string, file: string | null, expires = HOUR) => {
  if (!file) return null;
  const { data } = await (await supabaseServer()).storage.from(bucket).createSignedUrl(file, expires);
  return data?.signedUrl ?? null;
};

export const cloudList = async (): Promise<JobSummary[]> => {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("videos").select(COLUMNS).order("created_at", { ascending: false });
  const videos = (data ?? []) as VideoRow[];
  if (videos.length === 0) return [];
  const jobs = await latestJobs(videos.map((video) => video.id));
  const renders = await supabase.from("renders").select("video_id").in("video_id", videos.map((video) => video.id));
  const rendered = new Set((renders.data ?? []).map((row: { video_id: string }) => row.video_id));
  return Promise.all(videos.map(async (video) => ({
    id: video.id,
    title: video.title,
    status: statusOf(video, jobs.get(video.id)),
    poster: await sign("media", video.poster_path),
    hasOutput: rendered.has(video.id),
    seconds: video.duration_seconds,
    words: null,
  })));
};

const loadVideo = async (id: string) => {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("videos").select(COLUMNS).eq("id", id).maybeSingle();
  return (data as VideoRow | null) ?? null;
};

const latestPlan = async (id: string) => {
  const { data } = await (await supabaseServer()).from("edit_plans").select("id,version,config,timeline").eq("video_id", id).order("version", { ascending: false }).limit(1).maybeSingle();
  return (data as { id: string; version: number; config: Plan; timeline: Timeline } | null) ?? null;
};

export const cloudStatus = async (id: string) => {
  const video = await loadVideo(id);
  if (!video) return null;
  const job = (await latestJobs([id])).get(id);
  const { count } = await (await supabaseServer()).from("renders").select("id", { count: "exact", head: true }).eq("video_id", id);
  return { status: statusOf(video, job), hasOutput: (count ?? 0) > 0 };
};

export const cloudJob = async (id: string): Promise<Job | null> => {
  const video = await loadVideo(id);
  const plan = await latestPlan(id);
  if (!video || !plan) return null;
  const state = (await cloudStatus(id))!;
  const [source, person, poster, render] = await Promise.all([
    sign("sources", video.source_path),
    sign("media", video.person_path),
    sign("media", video.poster_path),
    (await supabaseServer()).from("renders").select("qc").eq("video_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    id,
    title: video.title,
    status: state.status,
    poster,
    hasOutput: state.hasOutput,
    seconds: plan.timeline.duration_frames / 30,
    words: plan.timeline.clips.reduce((total, clip) => total + clip.words.length, 0),
    style: await readStyle(),
    plan: { ...plan.config, version: plan.version },
    timeline: plan.timeline,
    media: { source: source ?? "", person },
    qc: (render.data?.qc as { text?: string } | null)?.text ?? null,
  };
};

export const cloudSavePlan = async (id: string, incoming: Plan): Promise<{ plan?: Plan; errors?: string[] }> => {
  const current = await latestPlan(id);
  if (!current) return { errors: ["El video aún no está listo para editar."] };
  const errors = await validatePlan(incoming, current.timeline);
  if (errors.length > 0) return { errors };
  const version = current.version + 1;
  const plan = { ...incoming, version };
  const { error } = await (await supabaseServer()).from("edit_plans").insert({ video_id: id, version, style: plan.style, source: "user", config: plan, timeline: current.timeline });
  return error ? { errors: [error.message] } : { plan };
};

export const cloudRender = async (id: string): Promise<string | null> => {
  const plan = await latestPlan(id);
  if (!plan) return "Guarda un plan antes de renderizar.";
  const { error } = await (await supabaseServer()).from("jobs").insert({ video_id: id, plan_id: plan.id, kind: "render" });
  if (!error) return null;
  return error.code === "23505" ? "Este video ya tiene un proceso en curso." : error.message;
};

export const cloudDownload = async (id: string): Promise<string | null> => {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("renders").select("output_path").eq("video_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  const signed = await supabase.storage.from("renders").createSignedUrl(data.output_path, 600, { download: `pink-${id}.mp4` });
  return signed.data?.signedUrl ?? null;
};
