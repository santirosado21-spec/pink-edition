import type { Caption } from '@remotion/captions';

export function captionIndex(captions: Caption[], timeMs: number): number {
  const active = captions.findIndex(word => timeMs >= word.startMs && timeMs < word.endMs);
  if (active >= 0) return active;
  for (let i = captions.length - 2; i >= 0; i--) {
    if (timeMs >= captions[i].endMs && timeMs < captions[i + 1].startMs &&
        captions[i + 1].startMs - captions[i].endMs <= 450) return i;
  }
  return -1;
}

// Keep original tokens and timings; split on pauses and a readable text budget.
export function captionPage(captions: Caption[], active: number): Caption[] {
  if (active < 0 || active >= captions.length) return [];
  let start = 0;
  while (start < captions.length) {
    let end = start + 1;
    let length = captions[start].text.trim().length;
    while (end < captions.length && end - start < 4) {
      const next = captions[end];
      const size = length + 1 + next.text.trim().length;
      if (size > 36 || next.startMs - captions[end - 1].endMs > 450) break;
      length = size;
      end++;
    }
    if (active < end) return captions.slice(start, end);
    start = end;
  }
  return [];
}

const hangingWords = new Set('a al de del el la los las un una unos unas en por para con sin y o que me te se lo le les mi tu su como si estos estas este esta'.split(' '));
const token = (text: string) => text.toLocaleLowerCase('es').replace(/^[¿¡"“]+|[.,;:!?"”]+$/g,'');
// Deterministic phrase boundaries preserve every original token and timestamp.
export function captionPhrasePage(captions: Caption[], active: number): Caption[] {
  if (active < 0 || active >= captions.length) return [];
  let start=0;
  while(start<captions.length) {
    let end=start+1,chars=captions[start].text.trim().length;
    while(end<captions.length && end-start<5) {
      if (/[.!?;:]$/.test(captions[end-1].text.trim()) || captions[end-1].pageBreakAfter || captions[end].startMs-captions[end-1].endMs>450) break;
      const size=chars+1+captions[end].text.trim().length;
      if(size>34) break;
      chars=size;end++;
      if(end-start>=2 && /,$/.test(captions[end-1].text.trim())) break;
    }
    // Carry a preposition/article into the next phrase rather than leave it hanging.
    if(end<captions.length && captions[end].startMs-captions[end-1].endMs<=450) {
      while(end-start>1 && hangingWords.has(token(captions[end-1].text.trim()))) end--;
    }
    if(active<end) return captions.slice(start,end);
    start=end;
  }
  return [];
}
