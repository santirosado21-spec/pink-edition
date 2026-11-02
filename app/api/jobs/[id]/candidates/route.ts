import { listCandidates, readCandidate } from "../../../../_lib/candidates";
import { validId } from "../../../../_lib/jobs";
import { CLOUD } from "../../../../_lib/cloud";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (CLOUD || process.env.VERCEL) return Response.json({ error: "Las candidatas están disponibles en el piloto local." }, { status: 501 });
  const { id } = await params;
  if (!validId(id)) return Response.json({ error: "Trabajo inválido." }, { status: 400 });
  try {
    const candidate = new URL(request.url).searchParams.get("candidate");
    return Response.json(candidate ? { candidate: await readCandidate(id, candidate) } : { candidates: await listCandidates(id) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "No se pudo leer el historial de candidatas." }, { status: 404 }); }
}
