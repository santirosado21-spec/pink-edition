import { CLOUD, cloudJob } from "../../../../_lib/cloud";
import { readJob, readStyle, validId, validatePlan } from "../../../../_lib/jobs";
import { revisePlan } from "../../../../_lib/propose";
import type { Plan } from "../../../../../src/edit";

type Context = { params: Promise<{ id: string }> };
const MAX_INSTRUCTION = 500;

// Corrección por instrucción escrita sobre el plan que el usuario tiene en pantalla; no se guarda sola.
export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const job = CLOUD ? await cloudJob(id) : validId(id) ? await readJob(id) : null;
  if (!job) return Response.json({ error: "Trabajo inválido." }, { status: 400 });
  const body = (await request.json().catch(() => null)) as { instruction?: unknown; plan?: Plan } | null;
  const instruction = typeof body?.instruction === "string" ? body.instruction.trim() : "";
  if (!instruction) return Response.json({ error: "Escribe qué quieres cambiar." }, { status: 400 });
  if (instruction.length > MAX_INSTRUCTION) return Response.json({ error: `La instrucción admite hasta ${MAX_INSTRUCTION} caracteres.` }, { status: 400 });
  // El plan en pantalla puede tener cambios sin guardar; se valida antes de mandarlo al modelo.
  const current = body?.plan ?? job.plan;
  const invalid = await validatePlan(current, job.timeline);
  if (invalid.length > 0) return Response.json({ error: `El plan actual tiene errores: ${invalid.join(" ")}` }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Falta ANTHROPIC_API_KEY en el archivo .env.local. Agrégala y reinicia la web para pedir cambios por escrito." }, { status: 501 });
  }
  try {
    const { plan, notes, dropped } = await revisePlan(id, job.timeline, current, await readStyle(), instruction);
    const errors = await validatePlan(plan, job.timeline);
    if (errors.length > 0) return Response.json({ error: `El cambio no pasó la validación: ${errors.join(" ")}` }, { status: 502 });
    return Response.json({ plan: { ...plan, version: current.version }, notes, dropped });
  } catch (error) {
    return Response.json({ error: `No se pudo aplicar el cambio: ${(error as Error).message}` }, { status: 502 });
  }
}
