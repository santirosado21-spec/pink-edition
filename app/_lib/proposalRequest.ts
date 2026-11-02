import type { Plan } from "../../src/edit";

export class ProposalRequestError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export async function readProposalDraft(request: Request, stored: Plan): Promise<Plan> {
  const maximum = 512 * 1024;
  if (Number(request.headers.get("content-length")) > maximum) throw new ProposalRequestError("El borrador supera 512 KiB.", 413);
  if (!request.body) return stored;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new ProposalRequestError("El borrador supera 512 KiB.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (size === 0) return stored;
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ProposalRequestError("El borrador no llegó como JSON válido."); }
  if (!body || typeof body !== "object" || !Object.hasOwn(body, "plan")) throw new ProposalRequestError("Falta el borrador del video.");
  return (body as { plan: Plan }).plan;
}

export function draftShapeErrors(plan: Plan): string[] {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return ["El borrador no es válido."];
  if (typeof plan.style !== "string" || !Number.isInteger(plan.version) || plan.version < 1) return ["El borrador necesita estilo y versión válidos."];
  for (const group of ["cuts", "cards", "backgrounds", "zooms"] as const) {
    if (group === "zooms" && plan[group] === undefined) continue;
    if (!Array.isArray(plan[group])) return [`Falta la lista ${group}.`];
    for (const event of plan[group]!) {
      if (!event || typeof event !== "object" || Array.isArray(event)) return ["Elemento inválido."];
      if (["origin", "locked", "decision_id", "profile_version"].some((key) => Object.hasOwn(event, key))) return ["El borrador contiene procedencia no verificada."];
      for (const field of ["label", "meaning"] as const) {
        if (field in event && typeof (event as unknown as Record<string, unknown>)[field] !== "string") return [`${field}: debe ser texto.`];
      }
    }
  }
  return [];
}
