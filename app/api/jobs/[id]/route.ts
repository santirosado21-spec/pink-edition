import { jobStatus, outputFile, readJob, validId } from "../../../_lib/jobs";
import { existsSync } from "node:fs";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  if (!validId(id)) return Response.json({ error: "Trabajo inválido." }, { status: 400 });
  // `?status` es la consulta ligera que la página repite mientras algo corre.
  if (new URL(request.url).searchParams.has("status")) {
    return Response.json({ status: await jobStatus(id), hasOutput: existsSync(outputFile(id)) });
  }
  const job = await readJob(id);
  return job ? Response.json(job) : Response.json({ error: "El video aún no está listo para editar." }, { status: 404 });
}
