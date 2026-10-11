import type { Plan, Timeline } from "../src/edit";

// Montaje ficticio: una toma por frase, 10 frames por palabra, sin material del cliente.
export const timelineOf = (sentences: string[], framesPerWord = 10): Timeline => {
  let offset = 0;
  const clips = sentences.map((sentence, clipIndex) => {
    const texts = sentence.split(" ");
    const words = texts.map((text, index) => ({
      id: `test.word.${clipIndex}.${index}`,
      text,
      source_start_frame: 1000 * clipIndex + index * framesPerWord,
      source_end_frame: 1000 * clipIndex + (index + 1) * framesPerWord - 1,
      alignment_score: null,
    }));
    const duration = texts.length * framesPerWord;
    const clip = { id: `clip_${clipIndex}`, source_in_frame: 1000 * clipIndex, duration_frames: duration, timeline_in_frame: offset, words, pages: [] };
    offset += duration;
    return clip;
  });
  return { duration_frames: offset, clips, fps: 30 } as Timeline;
};

export const emptyPlan = (): Plan => ({ style: "pink-demo-v1", version: 1, cuts: [], cards: [], backgrounds: [] });
