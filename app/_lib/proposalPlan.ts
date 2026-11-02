import type { Plan, Timeline } from "../../src/edit";
import { checkPreferences, type Preferences } from "../../src/preferences";
import schema from "../../schema/edit-plan.schema.json";

// Elementos nuevos admitidos en diez segundos, según el estilo que eligió el creador.
export const DENSITY: Record<Preferences["vibe"], number> = { clean: 2, balanced: 3, dynamic: 4 };

// Lo que devuelve el modelo: frases por número de palabra, sin tiempos ni posiciones.
type Range = { first_word: number; last_word: number; theme: string; label: string };
export type Proposal = {
  cuts: (Range & { style: string })[];
  cards: (Range & { kind: string; beat_word: number; meaning: string; text?: string })[];
  backgrounds: (Range & { motif: string })[];
  emphasis_words?: number[];
  notes: string;
};
export type FlatWord = { id: string; text: string; frame: number; clip: number; until: number };

// Misma lista que usa el editor: cada palabra con su frame y hasta dónde llega.
export const flatWords = (timeline: Timeline): FlatWord[] =>
  timeline.clips.flatMap((clip, clipIndex) =>
    clip.words.map((word, wordIndex) => {
      const frame = clip.timeline_in_frame + word.source_start_frame - clip.source_in_frame;
      const next = clip.words[wordIndex + 1];
      const until = next ? clip.timeline_in_frame + next.source_start_frame - clip.source_in_frame : clip.timeline_in_frame + clip.duration_frames;
      return { id: word.id, text: word.text, frame, clip: clipIndex, until };
    }),
  );

export type ProposalReport = {
  summary?: string;
  assets?: { quote: string; query: string; purpose: string; provider: string; status: string; detail: string }[];
  status: "ready" | "needs_review" | "degraded" | "no_new_elements";
  accepted: number;
  preserved: number;
  invalid: number;
  blocked: number;
  reasons: string[];
};

type Group = "cuts" | "cards" | "backgrounds";
type Candidate = Range & { style?: string; kind?: string; beat_word?: number; meaning?: string; text?: string; motif?: string };
const GROUPS: Group[] = ["cuts", "cards", "backgrounds"];
const enums = schema.properties as unknown as Record<Group, { items: { properties: Record<string, { enum?: string[] }> } }>;
const option = (group: Group, field: string, value: unknown) => enums[group].items.properties[field].enum?.includes(value as string) === true;
const numericTokens = (text: string): string[] => {
  // Quitar sólo puntuación externa, nunca extraer una parte de una cifra (.5 → 5).
  const token = text.trim().replace(/^[\s(\[{'"«¿¡]+/u, "").replace(/[\s)\]}'"»!?;:.,]+$/u, "");
  return /^[+-]?(?:\d+(?:[.,]\d+)*|[.,]\d+)%?$/u.test(token) ? [token] : [];
};

// El cliente recibe sugerencias aditivas: ninguna procedencia no verificada da permiso
// para borrar decisiones existentes. Los límites gobiernan sólo las nuevas entradas.
export function evaluateProposal(proposal: Proposal, timeline: Timeline, current: Plan): { plan: Plan; report: ProposalReport } {
  if (current.preferences !== undefined) {
    const errors = checkPreferences(current.preferences);
    if (errors.length) throw new Error(errors.join(" "));
  }
  const words = flatWords(timeline);
  const frames = new Map(words.map((word) => [word.id, word.frame]));
  const prefs = current.preferences;
  const fps = (timeline as Timeline & { fps?: number }).fps ?? 30;
  if (!Number.isFinite(fps) || fps <= 0) throw new Error("Cadencia del video inválida.");
  const seconds = timeline.duration_frames / fps;
  const limits = {
    cuts: prefs?.vibe === "clean" ? 0 : Infinity,
    cards: prefs?.graphics === "none" ? 0 : prefs?.graphics === "few" ? Math.ceil(seconds / 12) : Infinity,
    backgrounds: prefs?.graphics === "none" ? 0 : prefs?.graphics === "few" ? Math.ceil(seconds / 25) : Infinity,
  };
  const plan: Plan = { ...current, cuts: [...current.cuts], cards: [...current.cards], backgrounds: [...current.backgrounds] };
  const existing = [...current.cuts, ...current.cards, ...current.backgrounds, ...(current.zooms ?? [])];
  const ids = new Set(existing.map((event) => event.id));
  const starts = existing.map((event) => (frames.get(event.anchor_word_id) ?? event.sample_frame ?? 0) + event.offset_frames);
  const density = DENSITY[prefs?.vibe ?? "dynamic"];
  const withinDensity = (list: number[]) => list.every((start) => list.filter((at) => at >= start && at < start + 10 * fps).length <= density);
  const report: ProposalReport = { status: "ready", accepted: 0, preserved: existing.length, invalid: 0, blocked: 0, reasons: [] };
  const reject = (group: Group, index: number, reason: string, invalid = true) => {
    report[invalid ? "invalid" : "blocked"]++;
    report.reasons.push(`${group}[${index + 1}]: ${reason}`);
  };
  if (existing.length) report.reasons.push("Se conservaron los elementos existentes. Revisa sus posibles conflictos con el estilo actual.");
  if (!withinDensity(starts)) report.reasons.push("El borrador ya supera la densidad permitida; reduce elementos antes de pedir nuevas sugerencias.");
  const candidates = GROUPS.flatMap((group) => {
    if (!Array.isArray(proposal[group])) throw new Error(`Falta la lista ${group} en la propuesta.`);
    return proposal[group].map((value, index) => ({ group, value: value as Candidate, index }));
  }).sort((a, b) => (a.value?.first_word ?? Infinity) - (b.value?.first_word ?? Infinity) || GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.index - b.index);
  for (const { group, value, index } of candidates) {
    if (!value || !Number.isInteger(value.first_word) || !Number.isInteger(value.last_word) || value.first_word < 0 || value.last_word < value.first_word || value.last_word >= words.length) {
      reject(group, index, "rango de palabras inválido"); continue;
    }
    const first = words[value.first_word], last = words[value.last_word];
    const start = first.frame, end = last.until;
    if (first.clip !== last.clip || start < 0 || end <= start || end > timeline.duration_frames) {
      reject(group, index, "el intervalo cruza una toma o sale del video"); continue;
    }
    const minimumSeconds = { cuts: 0.8, cards: 1.5, backgrounds: 2.2 }[group];
    if (end - start < Math.ceil(minimumSeconds * fps)) {
      reject(group, index, `la frase es demasiado breve para este elemento (mínimo ${minimumSeconds} s)`); continue;
    }
    if (typeof value.label !== "string" || value.label.length > 80 || !option(group, "theme", value.theme)) {
      reject(group, index, "etiqueta o tema inválido"); continue;
    }
    if (group === "cuts" && !option(group, "style", value.style)) { reject(group, index, "estilo desconocido"); continue; }
    if (group === "backgrounds" && !option(group, "motif", value.motif)) { reject(group, index, "motivo desconocido"); continue; }
    if (group === "cards") {
      if (!option(group, "kind", value.kind) || value.kind === "photo") { reject(group, index, "tarjeta no disponible para IA"); continue; }
      const phrase = words.slice(value.first_word, value.last_word + 1).map((word) => word.text).join(" ").toLowerCase();
      if (value.kind === "compare" && !/\b(más\s+que|menos\s+que|mayor|menor|más\s+(rápid[oa]|lent[oa]|grande|pequeñ[oa])|more\s+than|less\s+than|faster|slower|larger|smaller)\b/u.test(phrase)) {
        reject(group, index, "la frase no contiene una comparación explícita para las barras"); continue;
      }
      if (!Number.isInteger(value.beat_word) || value.beat_word! < value.first_word || value.beat_word! > value.last_word || typeof value.meaning !== "string" || value.meaning.length > 1000) {
        reject(group, index, "énfasis o explicación inválidos"); continue;
      }
      if (value.text !== undefined && (typeof value.text !== "string" || value.text.length > 12)) { reject(group, index, "texto de tarjeta inválido"); continue; }
      if (value.kind === "counter" && (!value.text?.trim() || !words.slice(value.first_word, value.last_word + 1).some((word) => numericTokens(word.text).includes(value.text!.trim())))) {
        reject(group, index, "el contador no tiene una cifra literal en esa frase"); continue;
      }
    }
    if (plan[group].length >= limits[group] || (group === "cards" && prefs?.graphic_kinds && !prefs.graphic_kinds.includes(value.kind!))) {
      reject(group, index, "no permitido por tus preferencias o su límite", false); continue;
    }
    if (existing.length + report.accepted >= 60 || !withinDensity([...starts, start])) {
      reject(group, index, "no queda espacio en el presupuesto de elementos", false); continue;
    }
    const occupied = group === "backgrounds" ? plan.backgrounds : [...plan.cuts, ...plan.cards];
    if (occupied.some((event) => {
      const at = (frames.get(event.anchor_word_id) ?? event.sample_frame ?? 0) + event.offset_frames;
      return start < at + event.duration_frames && at < end;
    })) { reject(group, index, "coincide con un elemento conservado o aceptado", false); continue; }
    let serial = 1;
    while (ids.has(`suggestion_${group}_${serial}`)) serial++;
    const id = `suggestion_${group}_${serial}`;
    ids.add(id);
    const base = { id, label: value.label.slice(0, 48), theme: prefs && !prefs.context_colors ? "base" : value.theme, anchor_word_id: first.id, offset_frames: 0, duration_frames: end - start };
    if (group === "cuts") plan.cuts.push({ ...base, style: value.style!, last_word_id: last.id });
    if (group === "cards") plan.cards.push({ ...base, kind: value.kind!, top: 300, beat: { anchor_word_id: words[value.beat_word!].id, offset_frames: 0 }, meaning: value.meaning!, ...(value.kind === "counter" ? { text: value.text!.trim() } : {}) });
    if (group === "backgrounds") plan.backgrounds.push({ ...base, motif: value.motif! });
    starts.push(start);
    report.accepted++;
  }
  if (current.emphasis_word_ids === undefined && Array.isArray(proposal.emphasis_words)) {
    plan.emphasis_word_ids = [...new Set(proposal.emphasis_words.filter((index) => Number.isInteger(index) && index >= 0 && index < words.length))].sort((a, b) => a - b).slice(0, 40).map((index) => words[index].id);
  }
  report.status = candidates.length > 0 && report.invalid === candidates.length ? "degraded"
    : report.preserved > 0 || report.invalid > 0 ? "needs_review"
    : report.accepted === 0 ? "no_new_elements" : "ready";
  return { plan, report };
}

export const proposalToPlan = (proposal: Proposal, timeline: Timeline, current: Plan): Plan => evaluateProposal(proposal, timeline, current).plan;
