import { CLOUD } from "../../_lib/supabase/config";
import { sameOrigin } from "../../_lib/request-security";
import { oneShotReadiness } from "../../_lib/oneShotReadiness";
import { checkOneShotBrief } from "../../../src/oneShotBrief";
import type { OneShotBrief } from "../../../src/oneShotBrief";
import { createUploadSession, discardSession, SessionError } from "../../_lib/localUploadSession";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (CLOUD || process.env.VERCEL) return Response.json({ error: "Sólo disponible en el estudio local." }, { status: 404 });
  if (!sameOrigin(request)) return Response.json({ error: "Solicitud no permitida." }, { status: 403 });
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Falta el brief." }, { status: 400 });
  let text = "", bytes = 0;
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 16_384) { await reader.cancel(); return Response.json({ error: "El brief es demasiado largo." }, { status: 413 }); }
    text += decoder.decode(value, { stream: true });
  }
  let brief;
  try { brief = JSON.parse(text + decoder.decode()); }
  catch { return Response.json({ error: "El brief no es válido." }, { status: 400 }); }
  const errors = checkOneShotBrief(brief);
  if (errors.length) return Response.json({ error: errors.join(" ") }, { status: 422 });
  try {
    const session = await createUploadSession(brief as OneShotBrief);
    return Response.json({ briefValid: true, uploadAllowed: true, sessionId: session.id, expiresAt: session.expiresAt,
      ...oneShotReadiness() }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "No se pudo preparar la sesión temporal. Inténtalo de nuevo." }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  if (CLOUD || process.env.VERCEL) return Response.json({ error: "Sólo disponible en local." }, { status: 404 });
  if (!sameOrigin(request)) return Response.json({ error: "Solicitud no permitida." }, { status: 403 });
  try {
    await discardSession(request.headers.get("x-cutkind-session") ?? "");
    return Response.json({ discarded: true });
  } catch (error) { return Response.json({ error: (error as Error).message }, { status: error instanceof SessionError ? error.status : 500 }); }
}
