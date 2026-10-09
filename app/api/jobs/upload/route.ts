import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeStream } from "node:stream/web";
import { ENGINE_HERE, NO_ENGINE, readStyle, runningJob, startPipeline, uploadTarget } from "../../../_lib/jobs";

// El archivo llega como cuerpo crudo y se escribe en disco sin cargarlo en memoria.
export async function PUT(request: Request) {
  const name = new URL(request.url).searchParams.get("name") ?? "video.mp4";
  if (!ENGINE_HERE) return Response.json({ error: NO_ENGINE }, { status: 503 });
  if (!request.body) return Response.json({ error: "No llegó ningún archivo." }, { status: 400 });
  const { limits } = await readStyle();
  const bytes = Number(request.headers.get("content-length") ?? 0);
  if (bytes > limits.max_upload_mb * 1024 * 1024) {
    return Response.json({ error: `El archivo pesa más de ${limits.max_upload_mb} MB, el máximo permitido.` }, { status: 413 });
  }
  const busy = await runningJob();
  if (busy) return Response.json({ error: `Ya hay un video en proceso (${busy.id}). Espera a que termine.` }, { status: 409 });
  const { id, file } = await uploadTarget(name);
  await pipeline(Readable.fromWeb(request.body as unknown as NodeStream), createWriteStream(file));
  await startPipeline(id, file, "prepare");
  return Response.json({ id });
}
