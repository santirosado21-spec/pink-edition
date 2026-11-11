import type {EditBeat, EditorialBox, EditorialPresentation, EditorialTextPage, OneShotEdit} from './oneShotEdit';

// This shelf is shared by the presenter, support and caption renderers.
export const EDITORIAL_CAPTION_TOP = .74;
export const EDITORIAL_SUPPORT_BOTTOM = .72;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const fallbackBox: EditorialBox = {x: .04, y: .04, width: .82, height: .23};
export const editorialCaptionIntent = (edit: OneShotEdit) => edit.editorialVersion === 1 ? edit.preferences.editorial?.captionIntent ?? 'both' : 'both';
export const editorialBeatVisible = (beat: EditBeat, edit: OneShotEdit) => !(edit.editorialVersion === 1 && editorialCaptionIntent(edit) === 'literal' && beat.kind === 'card');
export function editorialPresentation(beat: EditBeat, edit: OneShotEdit): EditorialPresentation {
  return beat.presentation ?? (beat.kind === 'card' && edit.preferences.emphasis_mode === 'fullscreen' ? 'fullscreen' : beat.layoutBox ? 'overlay' : 'reserved');
}
export function editorialSupportBox(beat: EditBeat, presentation: EditorialPresentation): EditorialBox {
  if (presentation === 'fullscreen') return {x: 0, y: 0, width: 1, height: 1};
  const box = beat.layoutBox ?? fallbackBox;
  if (![box.x, box.y, box.width, box.height].every(Number.isFinite) || box.width <= 0 || box.height <= 0) return {...fallbackBox};
  // Support never reaches the caption shelf: keep its bottom edge above it.
  const x = clamp(box.x, 0, .95), y = clamp(box.y, 0, EDITORIAL_SUPPORT_BOTTOM - .1);
  const normalized = {x, y, width: clamp(box.width, .01, 1 - x), height: clamp(box.height, .01, EDITORIAL_SUPPORT_BOTTOM - y)};
  if (presentation === 'reserved' || presentation === 'inset') {
    const room = Math.max(y - .025, 1 - y - normalized.height - .025,
      (x - .025), (1 - x - normalized.width - .025));
    if (room < .16) return {...fallbackBox};
  }
  return normalized;
}
// Full canvas by default; separate presenter rectangle only when reserved or inset.
export function editorialPresenterBox(beat?: EditBeat, presentation?: EditorialPresentation): EditorialBox {
  if (!beat || (presentation !== 'reserved' && presentation !== 'inset')) return {x: 0, y: 0, width: 1, height: 1};
  const support = editorialSupportBox(beat, presentation), gap = .025;
  const candidates = [
    {x: 0, y: 0, width: 1, height: Math.max(0, support.y - gap)},
    {x: 0, y: support.y + support.height + gap, width: 1, height: Math.max(0, 1 - support.y - support.height - gap)},
    {x: 0, y: 0, width: Math.max(0, support.x - gap), height: 1},
    {x: support.x + support.width + gap, y: 0, width: Math.max(0, 1 - support.x - support.width - gap), height: 1},
  ];
  return candidates.sort((a, b) => b.width * b.height - a.width * a.height)[0];
}
// Presenter slot eases between full canvas and its reserved region while the graphic enters and leaves.
export function lerpBox(from: EditorialBox, to: EditorialBox, t: number): EditorialBox {
  if (t >= 1) return to;
  if (t <= 0) return from;
  return {x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, width: from.width + (to.width - from.width) * t, height: from.height + (to.height - from.height) * t};
}
// Normalized source-image rectangle inside the fixed, centered contain viewport.
// The same mapping is used by Python's face-band planner, without legacy crops.
export function editorialContainedSource(viewport: EditorialBox, sourceWidth: number, sourceHeight: number, outputWidth: number, outputHeight: number): EditorialBox {
  const scale = Math.min(outputWidth * viewport.width / sourceWidth, outputHeight * viewport.height / sourceHeight);
  const width = sourceWidth * scale / outputWidth, height = sourceHeight * scale / outputHeight;
  return {x: viewport.x + (viewport.width - width) / 2, y: viewport.y + (viewport.height - height) / 2, width, height};
}
export function editorialPresenterScale(edit: OneShotEdit, sceneFrame: number, fps: number): number {
  if (edit.editorialVersion !== 1 || edit.preferences.editorial?.framingStyle !== 'gentle') return 1;
  const progress = clamp(sceneFrame / Math.max(1, Math.round(fps * .6)), 0, 1);
  return .98 + .02 * progress * progress * (3 - 2 * progress);
}
export const editorialTextBeat = (beat: EditBeat) => beat.kind === 'card' || beat.kind === 'icon';
const editorialTokens = (value: string) => value.toLocaleLowerCase('es').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean);
const connectiveWords = new Set('a al de del el la los las un una unos unas en por para con sin y o que me te se lo le les mi tu su como si estos estas este esta es son ser tiene tienen hay'.split(' '));
// A caption that repeats the visual may include a linking word from the next
// clause. Keep substantive new words visible; only discard redundant typography.
export function editorialSpokenDuplicates(spokenText: string, graphicText: string): boolean {
  const spoken = editorialTokens(spokenText), graphic = editorialTokens(graphicText);
  if (!spoken.length || !graphic.length) return false;
  const unmatched: string[] = [];
  let covered = 0, cursor = 0;
  for (const word of spoken) {
    const index = graphic.indexOf(word, cursor);
    if (index >= 0) {covered++; cursor = index + 1;} else unmatched.push(word);
  }
  return covered === spoken.length || (covered >= 3 && covered / spoken.length >= .75 && unmatched.length <= 2 && unmatched.every(word => connectiveWords.has(word)));
}
export function editorialHidesCaptions(beat: EditBeat | undefined, edit: OneShotEdit, frame = 0, spokenText = ''): boolean {
  if (edit.editorialVersion !== 1) return false;
  const intent = editorialCaptionIntent(edit);
  if (intent === 'literal') return false;
  // This is an explicit text-visibility choice; caption data/audio is untouched.
  if (intent === 'key-ideas') return true;
  if (!beat) return false;
  if (beat.kind === 'steps' || beat.kind === 'compare') {
    if (editorialPresentation(beat, edit) === 'fullscreen') return true;
    return editorialSpokenDuplicates(spokenText, beat.labels.join(' '));
  }
  if (!editorialTextBeat(beat)) return false;
  const page = editorialPageAt(beat, frame - beat.from);
  // An ASR gap leaves no spoken words: keep the shelf hidden instead of an empty box.
  return !!page && (!spokenText.trim() || editorialSpokenDuplicates(spokenText, page.page.text));
}
export function editorialTextPages(beat: EditBeat): EditorialTextPage[] {
  const pages = (beat.textPages ?? []).filter(page => page.text.trim() && Number.isFinite(page.from) && Number.isFinite(page.frames) && page.from >= 0 && page.from < beat.frames && page.frames >= 1)
    .map(page => ({...page, from: Math.floor(page.from), frames: Math.min(Math.floor(page.frames), beat.frames - Math.floor(page.from))})).sort((a, b) => a.from - b.from);
  return pages.length ? pages : [{text: beat.headline ?? beat.title, from: 0, frames: beat.frames}];
}
// Hold only a page that has already begun, inside this event. ASR gaps cannot
// reveal the source or advance a future phrase. The next event owns its frames.
export function editorialPageAt(beat: EditBeat, frame: number): {page: EditorialTextPage; index: number; until: number} | undefined {
  if (frame < 0 || frame >= beat.frames) return undefined;
  const pages = editorialTextPages(beat);
  let index = -1;
  for (let i = 0; i < pages.length; i++) if (pages[i].from <= frame) index = i;
  return index < 0 ? undefined : {page: pages[index], index, until: pages[index + 1]?.from ?? beat.frames};
}
// Fit the complete authored pages once, never resize on each active ASR word.
export function editorialTextSize(pages: EditorialTextPage[], width: number, height: number): number {
  const maxSize = Math.min(94, width * .12, height * .25);
  const usableWidth = width * .84, usableHeight = height * .70;
  let size = Math.max(12, maxSize);
  while (size > 12 && pages.some(page => {
    const words = page.text.trim().split(/\s+/);
    let lines = 1, line = 0;
    for (const word of words) {
      const wordWidth = word.length * size * .62;
      if (line && line + size * .3 + wordWidth > usableWidth) {lines++; line = 0;}
      line += (line ? size * .3 : 0) + wordWidth;
      if (wordWidth > usableWidth) return true;
    }
    return lines * size * 1.1 > usableHeight;
  })) size -= 1;
  return size;
}
