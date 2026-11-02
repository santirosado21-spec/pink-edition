import "server-only";
import { createHash } from "node:crypto";
import type { Plan, Timeline } from "../../src/edit";

export class EditorAiError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
export type EditorAiStatus = { ready: boolean; provider: "OpenAI"; model: string; message: string; dataFingerprint?: string };

// No incluir el plan gráfico mutable: autoriza exactamente el texto y perfil
// enviados, también cuando se reutiliza un ID o cambia el borrador del perfil.
export const editorAiFingerprint = (timeline: Timeline, plan: Plan) => createHash("sha256").update(JSON.stringify({
  source: (timeline as Timeline & { source_sha256?: string }).source_sha256 ?? null,
  fps: (timeline as Timeline & { fps?: number }).fps ?? 30, duration: timeline.duration_frames,
  clips: timeline.clips.map((clip) => ({ source: clip.source_in_frame, start: clip.timeline_in_frame, duration: clip.duration_frames, words: clip.words.map((word) => [word.id, word.text, word.source_start_frame, word.source_end_frame]) })),
  preferences: plan.preferences ?? null,
})).digest("hex");

