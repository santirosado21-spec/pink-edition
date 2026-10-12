import { CLOUD, cloudJob } from "../../../../_lib/cloud";
import { readJob, validId, validatePlan } from "../../../../_lib/jobs";
import { proposePlan } from "../../../../_lib/propose";

type Context = { params: Promise<{ id: string }> };

// Propuesta automática del plan con la API de Claude; no se guarda hasta que el usuario lo decide.
export async function POST(_request: Request, { params }: Context) {
  const { id } = await params;
  const job = CLOUD ? await cloudJob(id) : validId(id) ? await readJob(id) : null;
  if (!job) return Response.json({ error: "Trabajo inválido." }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Falta ANTHROPIC_API_KEY en el archivo .env.local. Agrégala y reinicia la web para proponer la edición automáticamente." }, { status: 501 });
  }
  try {
    const { plan, notes } = await proposePlan(id, job.timeline, job.plan);
    const errors = await validatePlan(plan, job.timeline);
    if (errors.length > 0) return Response.json({ error: `La propuesta no pasó la validación: ${errors.join(" ")}` }, { status: 502 });
    return Response.json({ plan, notes });
  } catch (error) {
    return Response.json({ error: `No se pudo proponer la edición: ${(error as Error).message}` }, { status: 502 });
  }
}
