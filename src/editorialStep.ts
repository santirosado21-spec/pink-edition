type TimedWord = {text: string; startMs: number; endMs: number};
const normalize = (text: string) => text.toLocaleLowerCase('es').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// A complete quoted occurrence must contain the active caption token and fall
// inside this beat. Common words or another occurrence cannot activate a row.
export function activeEditorialStep(labels: string[], captions: TimedWord[], active: number, startMs: number, endMs: number): number {
  if (active < 0 || active >= captions.length) return -1;
  return labels.findIndex(label => {
    const tokens = normalize(label).split(' ');
    return captions.some((word, start) => {
      const last = captions[start + tokens.length - 1];
      if (!last || word.startMs < startMs || last.endMs > endMs) return false;
      return start <= active && active < start + tokens.length && tokens.every((token, offset) => normalize(captions[start + offset]?.text ?? '') === token);
    });
  });
}
