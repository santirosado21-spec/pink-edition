import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { CLOUD, cloudDownload } from "../../../../_lib/cloud";
import { outputFile, validId } from "../../../../_lib/jobs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (CLOUD) {
    const url = await cloudDownload(id);
    return url ? Response.redirect(url, 302) : Response.json({ error: "Aún no hay video renderizado." }, { status: 404 });
  }
  if (!validId(id) || !existsSync(outputFile(id))) return Response.json({ error: "Aún no hay video renderizado." }, { status: 404 });
  const file = outputFile(id);
  return new Response(Readable.toWeb(createReadStream(file)) as unknown as ReadableStream, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(statSync(file).size),
      "Content-Disposition": `attachment; filename="pink-${id}.mp4"`,
    },
  });
}
