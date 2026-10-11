import type { BackgroundEvent, CardEvent, CutEvent, Plan, Timeline } from "../../src/edit";

// Lo que devuelve el modelo: frases por número de palabra, sin tiempos ni posiciones.
type Range = { first_word: number; last_word: number; theme: string; label: string };
export type Proposal = {
  cuts: (Range & { style: string })[];
  cards: (Range & { kind: string; beat_word: number; meaning: string; text?: string })[];
  backgrounds: (Range & { motif: string })[];
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

// Convierte la propuesta en eventos del plan; descarta lo que apunte fuera del video.
export const proposalToPlan = (proposal: Proposal, timeline: Timeline, current: Plan): Plan => {
  const words = flatWords(timeline);
  const valid = (range: Range) => Number.isInteger(range.first_word) && Number.isInteger(range.last_word) && range.first_word >= 0 && range.last_word >= range.first_word && range.last_word < words.length;
  const base = (range: Range, id: string) => ({
    id,
    label: range.label.slice(0, 48),
    theme: range.theme,
    anchor_word_id: words[range.first_word].id,
    offset_frames: 0,
    duration_frames: Math.max(1, words[range.last_word].until - words[range.first_word].frame),
  });
  const cuts: CutEvent[] = proposal.cuts.filter(valid).map((cut, index) => ({ ...base(cut, `cut_${index + 1}`), style: cut.style, last_word_id: words[cut.last_word].id }));
  const cards: CardEvent[] = proposal.cards.filter(valid).map((card, index) => {
    const beat = card.beat_word >= card.first_word && card.beat_word <= card.last_word ? card.beat_word : card.last_word;
    // `top` es provisional: al guardar se recoloca sobre la persona.
    return { ...base(card, `card_${index + 1}`), kind: card.kind, top: 300, beat: { anchor_word_id: words[beat].id, offset_frames: 0 }, meaning: card.meaning, ...(card.kind === "counter" && card.text ? { text: card.text } : {}) };
  });
  const backgrounds: BackgroundEvent[] = proposal.backgrounds.filter(valid).map((background, index) => ({ ...base(background, `background_${index + 1}`), motif: background.motif }));
  return { ...current, cuts, cards, backgrounds };
};

// Lo inverso: el plan actual en el formato del modelo, para pedirle una corrección.
export const planToProposal = (plan: Plan, timeline: Timeline): Proposal => {
  const words = flatWords(timeline);
  const index = new Map(words.map((word, position) => [word.id, position]));
  const range = (event: { anchor_word_id: string; offset_frames: number; duration_frames: number; theme: string; label: string }, lastId?: string) => {
    const first = index.get(event.anchor_word_id) ?? 0;
    const end = words[first].frame + event.offset_frames + event.duration_frames;
    // Sin última palabra explícita, la última que empieza antes de que termine el evento.
    let last = lastId !== undefined ? index.get(lastId) ?? first : first;
    if (lastId === undefined) while (last + 1 < words.length && words[last + 1].frame < end) last++;
    return { first_word: first, last_word: last, theme: event.theme, label: event.label };
  };
  return {
    cuts: plan.cuts.map((cut) => ({ ...range(cut, cut.last_word_id), style: cut.style })),
    cards: plan.cards.map((card) => ({
      ...range(card),
      kind: card.kind,
      beat_word: index.get(card.beat.anchor_word_id) ?? index.get(card.anchor_word_id) ?? 0,
      meaning: card.meaning ?? card.label,
      ...(card.text ? { text: card.text } : {}),
    })),
    backgrounds: plan.backgrounds.map((background) => ({ ...range(background), motif: background.motif })),
    notes: "",
  };
};
