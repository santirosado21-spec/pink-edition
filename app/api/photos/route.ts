import { searchPhotos, downloadPhoto } from "../../_lib/stockPhotos";
export const runtime = "nodejs";
const local = (request: Request) => !process.env.VERCEL && !process.env.NEXT_PUBLIC_SUPABASE_URL &&
  ["localhost", "127.0.0.1"].includes(new URL(request.url).hostname) &&
  (!request.headers.get("origin") || request.headers.get("origin") === new URL(request.url).origin);
export async function GET(request: Request) {
  if (!local(request)) return Response.json({ error: "Fotos disponibles sólo en la aplicación local." }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim();
  if (!query || query.length > 100) return Response.json({ error: "Escribe una búsqueda de hasta 100 caracteres." }, { status: 400 });
  if (params.has("provider") && !["Pixabay", "Pexels", "Openverse", "Wikimedia"].includes(params.get("provider")!)) return Response.json({ error: "Proveedor inválido." }, { status: 400 });
  try { return Response.json(await searchPhotos(query, params.get("provider") === "Pexels" ? "Pexels" : params.get("provider") === "Openverse" ? "Openverse" : params.get("provider") === "Pixabay" ? "Pixabay" : "Wikimedia")); }
  catch (error) { return Response.json({ error: (error as Error).message }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!local(request)) return Response.json({ error: "Fotos disponibles sólo en la aplicación local." }, { status: 403 });
  try {
    const { job, photoId, provider = "Wikimedia" } = await request.json();
    if (provider !== "Pexels" && provider !== "Openverse" && provider !== "Pixabay" && provider !== "Wikimedia") return Response.json({ error: "Proveedor inválido." }, { status: 400 });
    return Response.json(await downloadPhoto(job, photoId, provider));
  } catch (error) { return Response.json({ error: (error as Error).message }, { status: 503 }); }
}
