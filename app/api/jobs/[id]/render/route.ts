import { existsSync } from "node:fs";
import { sourceFile, startPipeline, validId } from "../../../../_lib/jobs";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!validId(id) || !existsSync(sourceFile(id))) return Response.json({ error: "Trabajo inválido." }, { status: 400 });
  try {
    await startPipeline(id, sourceFile(id), "render");
    return Response.json({ started: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 409 });
  }
}
