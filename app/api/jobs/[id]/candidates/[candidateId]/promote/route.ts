import { readCandidate } from "../../../../../../_lib/candidates";
import { checkPlan, readJob, savePlan, validId } from "../../../../../../_lib/jobs";
import { CLOUD } from "../../../../../../_lib/cloud";
import { sameOrigin } from "../../../../../../_lib/request-security";
import { contentHash, PlanConflict } from "../../../../../../_lib/planStore";
import { fileHash } from "../../../../../../_lib/runManifest";
import path from "node:path";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string; candidateId: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: "Solicitud no permitida." }, { status: 403 });
  if (CLOUD || process.env.VERCEL) return Response.json({ error: "Disponible sólo en el piloto local." }, { status: 501 });
  const { id, candidateId } = await params;
  if (!validId(id)) return Response.json({ error: "Trabajo inválido." }, { status: 400 });
  try {
    const candidate = await readCandidate(id, candidateId), active = await readJob(id);
    if (!active || contentHash(active.plan) !== candidate.base_plan_hash || contentHash(active.timeline) !== candidate.base_timeline_hash) throw new PlanConflict("La base de esta candidata cambió. No se modificó tu edición.");
    if (await fileHash(path.join(process.cwd(), candidate.manifest.source.path)) !== candidate.manifest.source.sha256) throw new PlanConflict("El original cambió. No se puede aplicar esta candidata.");
    for (const asset of candidate.manifest.assets) {
      if (await fileHash(path.join(process.cwd(), "public", asset.asset)) !== asset.sha256) throw new PlanConflict("Cambió un recurso de esta candidata. No se modificó tu edición.");
    }
    const errors = await checkPlan(id, candidate.plan);
    if (errors.length) return Response.json({ error: "La candidata no pasó la validación.", errors }, { status: 400 });
    const plan = await savePlan(id, candidate.plan, { planHash: candidate.base_plan_hash, timelineHash: candidate.base_timeline_hash, timeline: candidate.timeline });
    return Response.json({ plan, timeline: (await readJob(id))?.timeline });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo aplicar la candidata." }, { status: error instanceof PlanConflict ? 409 : 400 }); }
}
