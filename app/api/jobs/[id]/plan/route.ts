import { CLOUD, cloudSavePlan } from "../../../../_lib/cloud";
import { checkPlan, savePlan, validId } from "../../../../_lib/jobs";
import type { Plan } from "../../../../../src/edit";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  const plan = (await request.json()) as Plan;
  if (CLOUD) {
    const saved = await cloudSavePlan(id, plan);
    return saved.plan ? Response.json({ plan: saved.plan }) : Response.json({ error: "El plan tiene errores.", errors: saved.errors }, { status: 400 });
  }
  if (!validId(id)) return Response.json({ error: "Trabajo inválido." }, { status: 400 });
  const errors = await checkPlan(id, plan);
  if (errors.length > 0) return Response.json({ error: "El plan tiene errores.", errors }, { status: 400 });
  try {
    return Response.json({ plan: await savePlan(id, plan) });
  } catch (error) {
    return Response.json({ error: `No se pudo guardar: ${(error as Error).message}` }, { status: 500 });
  }
}
