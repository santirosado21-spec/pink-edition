import { CLOUD, cloudSavePlan } from "../../../../_lib/cloud";
import { checkPlan, readJob, savePlan, validId } from "../../../../_lib/jobs";
import type { Plan } from "../../../../../src/edit";
import { PlanConflict } from "../../../../_lib/planStore";
import { sameOrigin } from "../../../../_lib/request-security";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  if (!sameOrigin(request)) return Response.json({ error: "Solicitud no permitida." }, { status: 403 });
  const { id } = await params;
  let plan: Plan;
  try {
    plan = (await request.json()) as Plan;
  } catch {
    return Response.json({ error: "El plan no llegó como JSON válido." }, { status: 400 });
  }
  if (CLOUD) {
    const saved = await cloudSavePlan(id, plan);
    return saved.plan ? Response.json({ plan: saved.plan }) : Response.json({ error: "El plan tiene errores.", errors: saved.errors }, { status: 400 });
  }
  if (!validId(id)) return Response.json({ error: "Trabajo inválido." }, { status: 400 });
  const errors = await checkPlan(id, plan);
  if (errors.length > 0) return Response.json({ error: "El plan tiene errores.", errors }, { status: 400 });
  try {
    const saved = await savePlan(id, plan);
    return Response.json({ plan: saved, timeline: (await readJob(id))?.timeline });
  } catch (error) {
    return Response.json({ error: `No se pudo guardar: ${(error as Error).message}` }, { status: error instanceof PlanConflict ? 409 : 500 });
  }
}
