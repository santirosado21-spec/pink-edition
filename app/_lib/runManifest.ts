import "server-only";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import path from "node:path";
import { contentHash } from "./planStore";
import type { Plan, Style, Timeline } from "../../src/edit";

export async function fileHash(file: string) {
  const hash = createHash("sha256");
  for await (const bytes of createReadStream(file)) hash.update(bytes);
  return hash.digest("hex");
}
export async function buildRunManifest(id: string, plan: Plan, timeline: Timeline, style: Style, startedAt: number) {
  const root = process.cwd();
  const source = `public/work/${id}/source.mp4`;
  const sourceHash = await fileHash(path.join(root, source));
  const code: Record<string, string | null> = {};
  for (const file of ["app/_lib/contextualProposal.ts", "app/_lib/proposalPlan.ts", "app/_lib/solEditor.ts", "scripts/sol_model.py", "app/_lib/propose.ts", "src/EditorialGraphics.tsx",
    "src/PinkEdit.tsx", "src/visualSafety.ts", "style/catalog-v1.json", "style/reference-library-v1.json", "package-lock.json"]) {
    try { code[file] = await fileHash(path.join(root, file)); } catch { code[file] = null; }
  }
  const assets: { asset: string; sha256: string }[] = [];
  for (const card of plan.cards) {
    if (!card.photo) continue;
    if (!/^work\/[a-z0-9-]+\/photos\/[a-z0-9-]+\.jpg$/.test(card.photo.asset)) throw new Error("Recurso de la propuesta inválido.");
    assets.push({ asset: card.photo.asset, sha256: await fileHash(path.join(root, "public", card.photo.asset)) });
  }
  const runtime = { provider: "OpenAI", model: "gpt-5.6-sol", transport: "codex-chatgpt", digest: null as string | null };
  return { format: 1 as const, created_at: new Date().toISOString(), elapsed_ms: Date.now() - startedAt,
    source: { path: source, sha256: sourceHash }, plan_sha256: contentHash(plan), timeline_sha256: contentHash(timeline),
    style_sha256: contentHash(style), runtime, code, assets, quality_approved: false,
    limitations: ["El manifiesto detecta cambios; no empaqueta aún el runtime completo ni mide memoria máxima."] };
}
