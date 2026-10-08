import raw from "./pool-full-timeline.json";

export type AlignedWord = {
  id: string;
  text: string;
  source_start_frame: number;
  source_end_frame: number;
  alignment_score: number | null;
};
export type CaptionPage = {
  start_frame: number;
  end_frame: number;
  lines: AlignedWord[][];
};
export type SpeechClip = {
  id: string;
  source_in_frame: number;
  duration_frames: number;
  timeline_in_frame: number;
  words: AlignedWord[];
  pages: CaptionPage[];
};
// Un evento se ancla a una palabra; el frame absoluto sólo sirve con datos ficticios.
export type AnchoredEvent = {
  id: string;
  anchor_word_id: string;
  offset_frames: number;
  sample_frame: number;
};

const timeline = raw as unknown as {
  is_sample?: boolean;
  duration_frames: number;
  clips: SpeechClip[];
};

export const isSample = timeline.is_sample === true;
export const durationFrames = timeline.duration_frames;
export const clips = timeline.clips;

const wordFrames = new Map<string, number>();
for (const clip of clips) {
  for (const word of clip.words) {
    wordFrames.set(
      word.id,
      clip.timeline_in_frame + word.source_start_frame - clip.source_in_frame,
    );
  }
}

export const resolveFrame = (event: AnchoredEvent): number => {
  if (isSample) return event.sample_frame;
  const anchor = wordFrames.get(event.anchor_word_id);
  if (anchor === undefined) {
    throw new Error(`Evento ${event.id}: no existe la palabra ${event.anchor_word_id}.`);
  }
  return anchor + event.offset_frames;
};

// Palabras consecutivas de un tramo, con su frame en el montaje.
export const wordsBetween = (firstId: string, lastId: string) => {
  const all = clips.flatMap((clip) =>
    clip.words.map((word) => ({
      id: word.id,
      text: word.text,
      frame: clip.timeline_in_frame + word.source_start_frame - clip.source_in_frame,
    })),
  );
  const first = all.findIndex((word) => word.id === firstId);
  const last = all.findIndex((word) => word.id === lastId);
  return first < 0 || last < first ? [] : all.slice(first, last + 1);
};
