import { CLOUD } from "../../../_lib/supabase/config";
import { sameOrigin } from "../../../_lib/request-security";
import { oneShotReadiness } from "../../../_lib/oneShotReadiness";
import { createWriteStream, promises as fs } from "node:fs";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeStream } from "node:stream/web";
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readUploadSession, sessionDir, SessionError, writeUploadReceipt } from "../../../_lib/localUploadSession";

export const runtime = "nodejs";
const run = promisify(execFile);
// La sesión sólo existe después de confirmar un brief validado en servidor.
export async function PUT(request: Request) {
  if (CLOUD || process.env.VERCEL) return Response.json({ error: "No disponible en modo nube." }, { status: 404 });
  if (!sameOrigin(request)) return Response.json({ error: "Solicitud no permitida." }, { status: 403 });
  let lock, dir: string | undefined;
  const assetId = randomUUID();
  let committed = false;
  try {
    let session = await readUploadSession(request.headers.get("x-cutkind-session") ?? "");
    if (!request.body) throw new SessionError("No llegó ningún archivo.", 400);
    const declared = Number(request.headers.get("content-length") ?? 0);
    dir = sessionDir(session.id);
    try { lock = await fs.open(path.join(dir, "upload.lock"), "wx", 0o600); }
    catch { throw new SessionError("Ya hay una subida en curso.", 409); }
    // Releer dentro del lock: otra petición pudo terminar antes de adquirirlo.
    session = await readUploadSession(session.id);
    if (await fs.stat(path.join(dir, "execution.lock")).catch(() => null)) throw new SessionError("Espera a que termine la edición antes de añadir videos.", 409);
    const pending = path.join(dir, `${assetId}.part`);
    let bytes = 0, lastTouch = 0;
    const hash = createHash("sha256");
    const meter = new Transform({ transform(chunk: Buffer, _encoding, done) {
      bytes += chunk.length;
      hash.update(chunk);
      if (Date.now() - lastTouch > 30_000) {
        lastTouch = Date.now();
        fs.utimes(path.join(dir!, "upload.lock"), new Date(), new Date()).then(() => done(null, chunk), done);
      } else done(null, chunk);
    } });
    await pipeline(Readable.fromWeb(request.body as unknown as NodeStream), meter, createWriteStream(pending, { flags: "wx", mode: 0o600 }));
    if (!bytes || (declared > 0 && bytes !== declared)) throw new SessionError("La subida llegó vacía o incompleta.", 400);
    let metadata;
    try {
      const result = await run("ffprobe", ["-v", "error", "-protocol_whitelist", "file,pipe", "-show_streams", "-show_format", "-of", "json", pending], { timeout: 15000, maxBuffer: 2 * 1024 * 1024 });
      metadata = JSON.parse(result.stdout);
    } catch { throw new SessionError("No se pudo leer el video. Usa una grabación MP4, MOV o WebM válida.", 422); }
    const video = metadata.streams?.find((s: { codec_type: string }) => s.codec_type === "video");
    const seconds = Number(metadata.format?.duration);
    if (!video || !Number.isFinite(seconds) || seconds <= 0 || seconds > 120) throw new SessionError("El video debe durar entre 0 y 120 segundos.", 422);
    let width = Number(video.width), height = Number(video.height);
    if (video.side_data_list?.some((s: { rotation?: number }) => Math.abs(s.rotation ?? 0) % 180 === 90)) [width, height] = [height, width];
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new SessionError("No se pudieron leer las dimensiones del video.", 422);
    if (!metadata.streams.some((s: { codec_type: string }) => s.codec_type === "audio")) throw new SessionError("La grabación debe incluir audio.", 422);
    const source = { id: assetId, name: (new URL(request.url).searchParams.get("name") ?? "video").slice(0, 180), bytes,
      sha256: hash.digest("hex"), seconds, width, height };
    await fs.rename(pending, path.join(dir, assetId));
    session = { ...session, state: "received", sources: [...(session.sources ?? []), source], expiresAt: Date.now() + 60 * 60 * 1000 };
    await writeUploadReceipt(session);
    committed = true;
    await fs.rm(path.join(dir, "edit.json"), { force: true });
    await fs.rm(path.join(dir, "run.json"), { force: true });
    return Response.json({ received: true, state: "received", source, expiresAt: session.expiresAt,
      ...oneShotReadiness() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (lock && dir) {
      await fs.rm(path.join(dir, `${assetId}.part`), { force: true }).catch(() => {});
      if (!committed) await fs.rm(path.join(dir, assetId), { force: true }).catch(() => {});
    }
    return Response.json({ error: (error as NodeJS.ErrnoException).code === "ENOSPC" ? "No queda espacio disponible en tu Mac." : error instanceof SessionError ? error.message : "La subida no pudo completarse. Inténtalo de nuevo." },
      { status: error instanceof SessionError ? error.status : 400 });
  } finally {
    if (lock && dir) { await lock.close(); await fs.rm(path.join(dir, "upload.lock"), { force: true }).catch(() => {}); }
  }
}
