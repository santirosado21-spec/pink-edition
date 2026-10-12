import { createWriteStream, promises as fs } from "node:fs";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeStream } from "node:stream/web";
import { CLOUD } from "../../../_lib/supabase/config";
import { ENGINE_HERE, NO_ENGINE, readStyle, runningJob, startPipeline, uploadTarget } from "../../../_lib/jobs";

// El archivo llega como cuerpo crudo y se escribe en disco sin cargarlo en memoria.
export async function PUT(request: Request) {
  const name = new URL(request.url).searchParams.get("name") ?? "video.mp4";
  // En modo nube el navegador sube directo al almacenamiento; esta ruta no tiene sesión.
  if (CLOUD) return Response.json({ error: "No disponible en modo nube." }, { status: 404 });
  if (!ENGINE_HERE) return Response.json({ error: NO_ENGINE }, { status: 503 });
  if (!request.body) return Response.json({ error: "No llegó ningún archivo." }, { status: 400 });
  const { limits } = await readStyle();
  const maximum = limits.max_upload_mb * 1024 * 1024;
  const tooBig = Response.json({ error: `El archivo pesa más de ${limits.max_upload_mb} MB, el máximo permitido.` }, { status: 413 });
  const bytes = Number(request.headers.get("content-length") ?? 0);
  if (bytes > maximum) return tooBig;
  const busy = await runningJob();
  if (busy) return Response.json({ error: `Ya hay un video en proceso (${busy.id}). Espera a que termine.` }, { status: 409 });
  const { id, file } = await uploadTarget(name);
  // El tamaño se cuenta mientras llega: la cabecera puede faltar o mentir.
  let received = 0;
  const meter = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      received += chunk.length;
      done(received > maximum ? new Error("too-big") : null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(request.body as unknown as NodeStream), meter, createWriteStream(file));
  } catch (error) {
    await fs.rm(file, { force: true });
    return (error as Error).message === "too-big" ? tooBig : Response.json({ error: "Se cortó la subida. Inténtalo de nuevo." }, { status: 400 });
  }
  // Una subida cortada no se procesa: se avisa en vez de editar un video a medias.
  if (bytes > 0 && (await fs.stat(file)).size !== bytes) {
    await fs.rm(file, { force: true });
    return Response.json({ error: "La subida llegó incompleta. Inténtalo de nuevo." }, { status: 400 });
  }
  try {
    await startPipeline(id, file, "prepare");
  } catch (error) {
    await fs.rm(file, { force: true });
    return Response.json({ error: (error as Error).message }, { status: 409 });
  }
  return Response.json({ id });
}
