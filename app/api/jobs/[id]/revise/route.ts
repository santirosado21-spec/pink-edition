import { EditorAiError } from "../../../../_lib/editorAi";
import { CLOUD, cloudJob } from "../../../../_lib/cloud";
import { readJob, validId, validatePlan } from "../../../../_lib/jobs";
import { revisePlan } from "../../../../_lib/propose";
import { sameOrigin } from "../../../../_lib/request-security";
import { draftShapeErrors, readRevisionDraft, ProposalRequestError } from "../../../../_lib/proposalRequest";
import { createCandidate } from "../../../../_lib/candidates";
import { PlanConflict } from "../../../../_lib/planStore";

type Context = { params: Promise<{ id: string }> };

// Corrección por instrucción escrita sobre el borrador visible; se conserva como
// candidato en el historial, sin cambiar la versión activa ni guardar sola.
export async function POST(request: Request, { params }: Context) {
  const startedAt = Date.now();
  if (!sameOrigin(request)) return Response.json({ error: "Solicitud no permitida." }, { status: 403 });
  const { id } = await params;
  const job = CLOUD ? await cloudJob(id) : validId(id) ? await readJob(id) : null;
  if (!job) return Response.json({ error: "Trabajo inválido." }, { status: 400 });
  try {
    const { plan: current, instruction } = await readRevisionDraft(request);
    const shapeErrors = draftShapeErrors(current);
    const errors = shapeErrors.length ? shapeErrors : await validatePlan(current, job.timeline);
    if (errors.length) return Response.json({ error: `Revisa el borrador antes de pedir un cambio: ${errors.join(" ")}` }, { status: 400 });
    if (current.version !== job.plan.version) throw new PlanConflict("El video cambió en otra pestaña. Conserva tu borrador y carga la versión actual antes de pedir un cambio.");
    if (job.status.state === "running") throw new PlanConflict("Espera a que termine el procesamiento antes de pedir un cambio.");
    if (CLOUD || process.env.VERCEL) throw new EditorAiError("La edición IA está habilitada sólo en las pruebas locales por ahora.", 501);
    const result = await revisePlan(id, job.timeline, current, instruction);
    const problems = await validatePlan(result.plan, job.timeline);
    if (problems.length) return Response.json({ error: `El cambio no pasó la validación: ${problems.join(" ")}` }, { status: 502 });
    const candidate = await createCandidate(id, job.plan, current, job.timeline, job.style, result, startedAt);
    return Response.json({ ...result, candidate: { id: candidate.id, created_at: candidate.created_at, base_version: candidate.base_version } });
  } catch (error) {
    return Response.json({ error: `No se pudo aplicar el cambio: ${(error as Error).message}` }, { status: error instanceof ProposalRequestError || error instanceof EditorAiError || error instanceof PlanConflict ? error.status : 502 });
  }
}
