import { editorAiFingerprint, EditorAiError } from "../../../../_lib/editorAi";
import { solEditorStatus, SOL_EDITOR_MODEL } from "../../../../_lib/solEditor";
import { CLOUD, cloudJob } from "../../../../_lib/cloud";
import { readJob, validId, validatePlan } from "../../../../_lib/jobs";
import { proposePlan } from "../../../../_lib/propose";
import { sameOrigin } from "../../../../_lib/request-security";
import { draftShapeErrors, readProposalDraft, ProposalRequestError } from "../../../../_lib/proposalRequest";
import { createCandidate } from "../../../../_lib/candidates";
import { PlanConflict } from "../../../../_lib/planStore";

type Context = { params: Promise<{ id: string }> };

// Comprueba la sesión local de ChatGPT; este diagnóstico no genera tokens.
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const job = CLOUD ? await cloudJob(id) : validId(id) ? await readJob(id) : null;
  if (!job) return Response.json({ error: "Trabajo inválido." }, { status: 400 });
  let status;
  try { status = CLOUD || process.env.VERCEL
    ? { ready: false, provider: "OpenAI", model: SOL_EDITOR_MODEL, message: "La edición IA está habilitada sólo en las pruebas locales por ahora." }
    : await solEditorStatus(editorAiFingerprint(job.timeline, job.plan));
  } catch (error) { return Response.json({ ready: false, message: (error as Error).message }, { headers: { "Cache-Control": "no-store" } }); }
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}

// Usa el borrador visible; no lo guarda ni consulta el perfil actual de la cuenta.
export async function POST(request: Request, { params }: Context) {
  const startedAt = Date.now();
  if (!sameOrigin(request)) return Response.json({ error: "Solicitud no permitida." }, { status: 403 });
  const { id } = await params;
  const job = CLOUD ? await cloudJob(id) : validId(id) ? await readJob(id) : null;
  if (!job) return Response.json({ error: "Trabajo inválido." }, { status: 400 });
  try {
    const current = await readProposalDraft(request, job.plan);
    const shapeErrors = draftShapeErrors(current);
    const errors = shapeErrors.length ? shapeErrors : await validatePlan(current, job.timeline);
    if (errors.length) return Response.json({ error: `Revisa el borrador antes de proponer: ${errors.join(" ")}` }, { status: 400 });
    if (current.version !== job.plan.version) throw new PlanConflict("El video cambió en otra pestaña. Conserva tu borrador y carga la versión actual antes de proponer.");
    if (job.status.state === "running") throw new PlanConflict("Espera a que termine el procesamiento antes de proponer.");
    if (CLOUD || process.env.VERCEL) throw new EditorAiError("La edición IA está habilitada sólo en las pruebas locales por ahora.", 501);
    const result = await proposePlan(id, job.timeline, current);
    const problems = await validatePlan(result.plan, job.timeline);
    if (problems.length) return Response.json({ error: `La propuesta no pasó la validación: ${problems.join(" ")}` }, { status: 502 });
    const candidate = await createCandidate(id, job.plan, current, job.timeline, job.style, result, startedAt);
    return Response.json({ ...result, candidate: { id: candidate.id, created_at: candidate.created_at, base_version: candidate.base_version } });
  } catch (error) {
    return Response.json({ error: `No se pudo proponer la edición: ${(error as Error).message}` }, { status: error instanceof ProposalRequestError || error instanceof EditorAiError || error instanceof PlanConflict ? error.status : 502 });
  }
}
