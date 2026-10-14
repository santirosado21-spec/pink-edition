import type { Plan, Timeline } from "./edit";

// Caja de la cabeza de una toma, en píxeles del lienzo (unión de todos sus cuadros).
export type Head = { top: number; bottom: number; left: number; right: number };
// Zoom tipo «punch-in», anclado a una palabra como todo lo demás.
export type ZoomEvent = { id: string; anchor_word_id: string; offset_frames: number; duration_frames: number; scale: number; sample_frame?: number };
export const TAKE_TRANSITIONS = ["none", "punch", "flash"] as const;
export type TakeTransition = (typeof TAKE_TRANSITIONS)[number];
export const ZOOM_SCALE = { min: 1.05, max: 1.35 };

const MARGIN = 40;
// Por debajo de esto el efecto apenas se nota: mejor no aplicarlo.
const MIN_EFFECT = 1.03;

/**
 * La transformación final de la imagen: escala base del desenfoque inicial × zoom × punch.
 * Devuelve `null` cuando no hay efecto (la imagen queda como siempre) o cuando no existe
 * un encuadre que mantenga la cabeza a 40 px de cada borde.
 */
export const frameTransform = (
  head: Head | null | undefined,
  base: number,
  zoom: number,
  punch: number,
  canvas: { width: number; height: number },
): { scale: number; originX: number; originY: number } | null => {
  if (zoom * punch === 1 || !head) return null;
  const { width, height } = canvas;
  const cx = Math.min(width, Math.max(0, (head.left + head.right) / 2));
  const cy = Math.min(height, Math.max(0, (head.top + head.bottom) / 2));
  // Escala máxima para que cada borde de la caja, escalado alrededor del centro, quede dentro.
  const limits = [
    head.left < cx ? (cx - MARGIN) / (cx - head.left) : Infinity,
    head.right > cx ? (width - MARGIN - cx) / (head.right - cx) : Infinity,
    head.top < cy ? (cy - MARGIN) / (cy - head.top) : Infinity,
    head.bottom > cy ? (height - MARGIN - cy) / (head.bottom - cy) : Infinity,
  ];
  const total = Math.min(base * zoom * punch, ...limits);
  if (!(total / base >= MIN_EFFECT)) return null;
  return { scale: total, originX: cx, originY: cy };
};

type Phrase = { frame: number; wordId: string; clip: number };

// Inicios de frase: primera palabra de cada toma, o la que sigue a una pausa o a un signo.
const phraseStarts = (timeline: Timeline): Phrase[] => {
  const starts: Phrase[] = [];
  timeline.clips.forEach((clip, clipIndex) => {
    clip.words.forEach((word, index) => {
      const previous = clip.words[index - 1];
      const frame = clip.timeline_in_frame + word.source_start_frame - clip.source_in_frame;
      const pause = previous ? word.source_start_frame - previous.source_end_frame : Infinity;
      if (!previous || pause >= 6 || /[.,;:?!]$/.test(previous.text)) starts.push({ frame, wordId: word.id, clip: clipIndex });
    });
  });
  return starts;
};

const SPACING: Record<string, number> = { dynamic: 75, balanced: 150 };

/**
 * Zooms automáticos: una frase sí, otra no, para que cada cambio de frase se note.
 * Respeta el presupuesto de 60 elementos, no pisa cortes de color ni tarjetas y sólo usa
 * tomas con datos de cabeza. Mismo resultado para la misma entrada.
 */
export const autoZooms = (timeline: Timeline, plan: Plan, vibe: string): ZoomEvent[] => {
  const spacing = SPACING[vibe];
  const budget = 60 - plan.cuts.length - plan.cards.length - plan.backgrounds.length;
  if (!spacing || budget <= 0) return [];
  const frames = new Map(timeline.clips.flatMap((clip) => clip.words.map((word) => [word.id, clip.timeline_in_frame + word.source_start_frame - clip.source_in_frame] as const)));
  const busy = [...plan.cuts, ...plan.cards].map((event) => {
    const start = (frames.get(event.anchor_word_id) ?? 0) + event.offset_frames;
    return [start, start + event.duration_frames] as const;
  });
  const taken = new Set([...plan.cuts, ...plan.cards, ...plan.backgrounds].map((event) => event.id));
  const phrases = phraseStarts(timeline);
  const zooms: ZoomEvent[] = [];
  let last = -Infinity;
  let turn = true;
  let counter = 1;
  phrases.forEach((phrase, index) => {
    if (zooms.length >= budget) return;
    const end = Math.min(phrases[index + 1]?.frame ?? timeline.duration_frames, timeline.duration_frames);
    const duration = Math.min(120, end - phrase.frame);
    const fits = duration >= 30 && phrase.frame - last >= spacing && timeline.clips[phrase.clip].head
      && busy.every(([start, stop]) => phrase.frame + duration <= start || phrase.frame >= stop);
    if (turn && fits) {
      while (taken.has(`zoom_${counter}`)) counter++;
      zooms.push({ id: `zoom_${counter}`, anchor_word_id: phrase.wordId, offset_frames: 0, duration_frames: duration, scale: 1.3 });
      taken.add(`zoom_${counter}`);
      last = phrase.frame;
      turn = false;
    } else if (!turn) {
      turn = true;
    }
  });
  return zooms;
};
