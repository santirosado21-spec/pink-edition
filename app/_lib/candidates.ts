import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Plan, Timeline, Style } from "../../src/edit";
import type { ProposalReport } from "./proposalPlan";
import { jobDirectory, contentHash, readActiveEdit } from "./planStore";
import { buildRunManifest } from "./runManifest";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export type Candidate = {
  format: 1; id: string; job_id: string; created_at: string;
  base_version: number; base_plan_hash: string; base_timeline_hash: string;
  draft_hash: string;
  base: Plan; plan: Plan; timeline: Timeline; style: Style; report: ProposalReport; notes: string;
  manifest: Awaited<ReturnType<typeof buildRunManifest>>;
};
export type CandidateSummary = Pick<Candidate, "id" | "created_at" | "base_version" | "report"> & { stale: boolean };
export async function createCandidate(job: string, stored: Plan, draft: Plan, timeline: Timeline, style: Style,
  result: { plan: Plan; report: ProposalReport; notes: string }, startedAt: number) {
  const id = randomUUID();
  const candidate: Candidate = { format: 1, id, job_id: job, created_at: new Date().toISOString(), base_version: stored.version,
    base_plan_hash: contentHash(stored), base_timeline_hash: contentHash(timeline), draft_hash: contentHash(draft), base: draft, ...result, timeline, style,
    manifest: await buildRunManifest(job, result.plan, timeline, style, startedAt) };
  const dir = path.join(jobDirectory(job), "candidates");
  await fs.mkdir(dir, { recursive: true });
  // Publicar sólo archivos completos; el temporal queda fuera del listado.
  const temp = path.join(dir, `.${id}.tmp`);
  await fs.writeFile(temp, JSON.stringify(candidate, null, 2), { flag: "wx", mode: 0o600 });
  await fs.rename(temp, path.join(dir, `${id}.json`));
  return candidate;
}
export async function readCandidate(job: string, id: string): Promise<Candidate> {
  if (!uuid.test(id)) throw new Error("Candidata inválida.");
  const candidate = JSON.parse(await fs.readFile(path.join(jobDirectory(job), "candidates", `${id}.json`), "utf8")) as Candidate;
  if (candidate.id !== id || candidate.job_id !== job || candidate.format !== 1 ||
    contentHash(candidate.base) !== candidate.draft_hash || contentHash(candidate.style) !== candidate.manifest.style_sha256 ||
    contentHash(candidate.plan) !== candidate.manifest.plan_sha256 || contentHash(candidate.timeline) !== candidate.manifest.timeline_sha256) throw new Error("La candidata no pasó la comprobación de integridad.");
  return candidate;
}
export async function listCandidates(job: string): Promise<CandidateSummary[]> {
  const active = await readActiveEdit(job);
  const dir = path.join(jobDirectory(job), "candidates");
  let files: string[];
  try { files = await fs.readdir(dir); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  const candidates = await Promise.all(files.filter(f => uuid.test(f.replace(/\.json$/, "")) && f.endsWith(".json")).map(f => readCandidate(job, f.slice(0, -5))));
  return candidates.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20).map(c => ({
    id: c.id, created_at: c.created_at, base_version: c.base_version, report: c.report,
    stale: c.base_plan_hash !== contentHash(active.plan),
  }));
}
