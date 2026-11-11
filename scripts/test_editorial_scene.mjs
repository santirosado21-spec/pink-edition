import assert from 'node:assert/strict';
import path from 'node:path';
import {interpolate} from 'remotion';
import {loader, plain} from './test_support/load_ts.mjs';

let currentFrame = 0;
const Sequence = Symbol('Sequence');
const font = {id: 'fixture', family: 'sans-serif', fontStyle: 'normal', weight: 600};
// Real component markup, with media/font/network and React lifecycle explicitly
// doubled. These assertions verify frame contracts, not raster/font aesthetics.
const load = loader({
  react: {useEffect: () => {}, useState: initial => [typeof initial === 'function' ? initial() : initial === false ? true : initial, () => {}]},
  remotion: {Sequence, AbsoluteFill: 'absolute-fill', Audio: 'audio', Loop: 'loop', Img: 'image', OffthreadVideo: 'source-video', interpolate, useCurrentFrame: () => currentFrame, useVideoConfig: () => ({fps: 30}), delayRender: () => 1, continueRender: () => {}, cancelRender: error => {throw error;}, getRemotionEnvironment: () => ({isRendering: false})},
  '@remotion/media': {Video: 'media-video'},
  [path.resolve('src/editorFonts')]: {editorFont: () => font, loadEditorFont: async () => {}},
});
const {OneShotVideo} = load('src/OneShotVideo.tsx');
const {DEFAULT_PREFERENCES} = load('src/preferences.ts');
const {editorialPageAt, editorialTextPages, editorialTextSize, editorialSupportBox, editorialPresenterBox, editorialPresentation, editorialPresenterScale, editorialContainedSource, editorialSpokenDuplicates, EDITORIAL_CAPTION_TOP, EDITORIAL_SUPPORT_BOTTOM} = load('src/editorialSceneTiming.ts');
function tree(element, frame) {
  if (element === null || element === undefined || typeof element === 'boolean') return [];
  if (Array.isArray(element)) return element.flatMap(child => tree(child, frame));
  if (typeof element !== 'object') return [{text: String(element)}];
  if (element.type === Sequence) {
    const local = frame - (element.props.from ?? 0);
    return local < 0 || local >= element.props.durationInFrames ? [] : tree(element.props.children, local);
  }
  if (typeof element.type === 'function') {
    currentFrame = frame;
    return tree(element.type(element.props), frame);
  }
  return [{type: element.type, props: element.props}, ...tree(element.props?.children, frame)];
}
const caption = (text, startMs, endMs) => ({text, startMs, endMs, timestampMs: null, confidence: null});
const beat = {id: 'literal', kind: 'card', from: 0, frames: 120, title: 'Una idea literal.', headline: 'Una idea literal.', quote: 'Una idea literal. Otra frase.', labels: [], reason: 'Synthetic continuity fixture', presentation: 'fullscreen', textPages: [{text: 'Una idea literal.', from: 0, frames: 30}, {text: 'Otra frase.', from: 90, frames: 30}]};
const edit = {editorialVersion: 1, visualLayoutVersion: 3, captionLayoutVersion: 3, fps: 30, width: 720, height: 1280, frames: 150, preferences: {...DEFAULT_PREFERENCES, emphasis_mode: 'fullscreen'}, scenes: [{id: 'speaker', name: 'Synthetic source', asset: 'synthetic.mp4', from: 0, frames: 150, width: 720, height: 1280}], captions: [caption('Una', 0, 300), caption('idea', 300, 600), caption('literal.', 600, 900), caption('Otra', 3000, 3400), caption('frase.', 3400, 4000)], beats: [beat], music: null, musicFrames: 1, issues: [], assets: [], checks: {}};
const at = (value, frame) => tree({type: OneShotVideo, props: {edit: value, mediaBase: 'http://synthetic.invalid/'}}, frame);
const find = (nodes, key, value) => nodes.find(node => node.props?.[key] === value);
const titleSizes = new Set();

for (let frame = 0; frame < beat.frames; frame++) {
  const nodes = at(edit, frame);
  assert.ok(find(nodes, 'data-editorial-scene', beat.id), `scene persists at ${frame}`);
  assert.equal(find(nodes, 'data-editorial-scene', beat.id).props.style.background, '#f7f5ef');
  assert.equal(find(nodes, 'data-editorial-text-page', frame < 90 ? 0 : 1)?.props.children, frame < 90 ? 'Una idea literal.' : 'Otra frase.');
  titleSizes.add(find(nodes, 'data-editorial-text-page', frame < 90 ? 0 : 1).props.style.fontSize);
  assert.equal(find(nodes, 'data-caption-layout', 'editorial-shelf-v1').props.style.visibility, 'hidden');
  assert.equal(nodes.filter(node => node.type === 'source-video' && !node.props.muted).length, 1, 'voice stays mounted exactly once');
  assert.equal(nodes.find(node => node.type === 'source-video' && !node.props.muted).props.volume, .75);
}
assert.equal(titleSizes.size, 1, 'headline size stays stable across words, gaps and differently sized pages');
assert.equal(find(at(edit, 120), 'data-editorial-scene', beat.id), undefined, 'no hold beyond event');
assert.equal(editorialPageAt({...beat, textPages: [{text: 'No adelantarse.', from: 20, frames: 40}]}, 19), undefined, 'never reveal a future page early');
assert.equal(editorialPageAt(beat, -1), undefined);
assert.equal(editorialPageAt(beat, 120), undefined);
assert.ok(editorialTextSize(editorialTextPages(beat), 720, 1000) > 12);

const mediaBeat = {...beat, id: 'media', kind: 'broll', asset: 'support.mp4', mediaType: 'video'};
for (const frame of [0, 25, 60, 89, 90, 119]) {
  const nodes = at({...edit, beats: [mediaBeat]}, frame);
  assert.ok(find(nodes, 'data-editorial-scene', 'media'));
  assert.equal(nodes.filter(node => node.type === 'source-video').length, 2, 'media timing independent of page/ASR changes');
  assert.equal(nodes.find(node => node.type === 'source-video' && node.props.muted)?.props.style.height, '100%');
  assert.equal(find(nodes, 'data-caption-layout', 'editorial-shelf-v1').props.style.visibility, 'visible');
  assert.ok(find(nodes, 'data-editorial-caption-protection', true));
}
const reserved = {...beat, presentation: 'reserved', layoutBox: {x: .04, y: .04, width: .82, height: .23}};
const support = editorialSupportBox(reserved, 'reserved'), presenter = editorialPresenterBox(reserved, 'reserved');
const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
assert.ok(!overlaps(support, presenter), 'reserved support never covers presenter region');
assert.ok(support.y + support.height <= EDITORIAL_SUPPORT_BOTTOM, 'support card ends above the caption shelf');
assert.ok(presenter.height > .6 && presenter.y >= support.y + support.height, 'presenter keeps the larger region below the card (captions overlay it)');
for (const layoutBox of [undefined, {x: .06, y: .54, width: .88, height: .22}]) {
  const inset = {...mediaBeat, presentation: 'inset', layoutBox};
  const insetSupport = editorialSupportBox(inset, 'inset'), insetPresenter = editorialPresenterBox(inset, 'inset');
  assert.ok(!overlaps(insetSupport, insetPresenter), 'inset support also reserves a separate presenter region');
  const unmeasured = {...edit, beats: [inset], scenes: edit.scenes.map(scene => ({...scene, framing: [{frame: 0, scale: 1, x: 0, y: 0, captionTop: null, measured: false}]}))};
  const nodes = at(unmeasured, 60), slot = find(nodes, 'data-editorial-presenter-slot', 'true');
  assert.equal(slot.props.style.height, `${insetPresenter.height * 100}%`, 'unmeasured inset uses structural reservation');
  assert.equal(find(nodes, 'data-caption-layout', 'editorial-shelf-v1').props.style.top, `${EDITORIAL_CAPTION_TOP * 100}%`);
}
const impossible = {...reserved, layoutBox: {x: 0, y: 0, width: 1, height: 1}};
assert.ok(!overlaps(editorialSupportBox(impossible, 'reserved'), editorialPresenterBox(impossible, 'reserved')), 'malformed full-canvas reserved box falls back to separate regions');
for (const presentation of ['overlay', 'inset', 'reserved']) {
  const protectedBox = editorialSupportBox({...beat, layoutBox: {x: -.2, y: .74, width: 2, height: 1}}, presentation);
  assert.ok(protectedBox.y + protectedBox.height <= .76, 'support remains above caption shelf');
  assert.ok(protectedBox.x >= 0 && protectedBox.x + protectedBox.width <= 1);
}
assert.equal(editorialPresentation({...beat, presentation: undefined, layoutBox: undefined}, {...edit, preferences: DEFAULT_PREFERENCES}), 'reserved');
for (const frame of [0, 60, 119]) {
  const nodes = at({...edit, beats: [reserved]}, frame);
  assert.equal(find(nodes, 'data-caption-layout', 'editorial-shelf-v1').props.style.top, `${EDITORIAL_CAPTION_TOP * 100}%`);
  assert.equal(find(nodes, 'data-caption-layout', 'editorial-shelf-v1').props.style.fontSize, 38, 'spoken captions stay quieter than headlines on 720 canvas');
  assert.equal(find(nodes, 'data-editorial-caption-text', 'true').props.style.textWrap, 'balance');
  assert.equal(find(nodes, 'data-editorial-caption-text', 'true').props.style.maxHeight, '2.6em');
  const slot = find(nodes, 'data-editorial-presenter-slot', 'true');
  // The presenter rectangle eases in/out over the first/last 10 frames; mid-event it is the reserved region.
  const eased = frame === 0 ? 1 : frame === 119 ? 1 + (presenter.height - 1) * .1 : presenter.height;
  assert.ok(Math.abs(parseFloat(slot.props.style.height) - eased * 100) < 1e-6, `slot height at frame ${frame}`);
  assert.equal(slot.props.style.overflow, 'hidden');
}
for (const icon of ['people', 'heart', 'brain', 'home', 'book', 'growth', 'question']) assert.ok(find(at({...edit, beats: [{...reserved, kind: 'icon', icon}]}, 60), 'data-editorial-icon', icon));

const direction = (value, fields) => ({...value, preferences: {...value.preferences, editorial: {version: 1, ...fields}}});
const stable = direction(edit, {framingStyle: 'stable'}), gentle = direction(edit, {framingStyle: 'gentle'});
for (let frame = 0; frame < 150; frame++) {
  const stableSource = find(at(stable, frame), 'data-editorial-presenter', 'true');
  const gentleSource = find(at(gentle, frame), 'data-editorial-presenter', 'true');
  assert.equal(stableSource.props.style.scale, 1, 'stable never moves');
  assert.ok(gentleSource.props.style.scale >= .98 && gentleSource.props.style.scale <= 1, 'gentle preserves every source edge within clipped slot');
  assert.equal(gentleSource.props.style.transformOrigin, 'center');
}
assert.equal(editorialPresenterScale(gentle, 0, 30), .98);
assert.ok(editorialPresenterScale(gentle, 9, 30) > .98 && editorialPresenterScale(gentle, 9, 30) < 1);
assert.equal(editorialPresenterScale(gentle, 18, 30), 1);
assert.equal(editorialPresenterScale(gentle, 36, 60), 1, 'gentle timing follows fps');
assert.equal(editorialPresenterScale({...gentle, editorialVersion: undefined}, 0, 30), 1, 'no legacy framing reinterpretation');
const contained = editorialContainedSource({x: 0, y: 0, width: 1, height: .76}, 720, 1280, 720, 1280);
assert.ok(Math.abs(contained.x - .12) < 1e-9);
assert.ok(Math.abs(contained.width - .76) < 1e-9);
assert.equal(contained.y, 0); assert.equal(contained.height, .76);
const wideContained = editorialContainedSource({x: 0, y: 0, width: 1, height: .76}, 1280, 720, 720, 1280);
assert.equal(wideContained.x, 0); assert.equal(wideContained.width, 1);
assert.ok(Math.abs(wideContained.y - (.76 - wideContained.height) / 2) < 1e-9);

const literal = direction(edit, {captionIntent: 'literal'});
for (const frame of [0, 15, 60, 100, 130]) {
  const nodes = at(literal, frame);
  assert.equal(find(nodes, 'data-editorial-scene', beat.id), undefined, 'literal ignores an imported text-only card without blank fullscreen');
  assert.equal(find(nodes, 'data-caption-layout', 'editorial-shelf-v1').props.style.visibility, 'visible', 'literal speech captions stay visible');
}
const ideas = direction(edit, {captionIntent: 'key-ideas'});
assert.ok(find(at(ideas, 60), 'data-editorial-text-page', 0), 'ideas retains authored highlight during silence');
assert.equal(find(at(ideas, 130), 'data-editorial-scene', beat.id), undefined, 'ideas adds no synthetic highlight outside event');
for (const frame of [15, 60, 130]) assert.equal(find(at(ideas, frame), 'data-caption-layout', 'editorial-shelf-v1').props.style.visibility, 'hidden', 'explicit key ideas choice suppresses spoken shelf');
const both = direction({...edit, beats: [{...reserved, textPages: [{text: 'Una idea literal.', from: 0, frames: 120}]}]}, {captionIntent: 'both'});
assert.equal(find(at(both, 15), 'data-caption-layout', 'editorial-shelf-v1').props.style.visibility, 'hidden', 'exact repeated page is shown once');
assert.equal(find(at(both, 100), 'data-caption-layout', 'editorial-shelf-v1').props.style.visibility, 'visible', 'different spoken page is retained with headline');
assert.ok(editorialSpokenDuplicates('Una lección sobre la familia que', 'UNA LECCIÓN SOBRE LA FAMILIA'));
assert.ok(editorialSpokenDuplicates('vez de apoyarlos, los limitan. Y', 'En vez de apoyarlos Los limitan'));
assert.ok(editorialSpokenDuplicates('Más resilientes, tienen mejor salud mental', 'Más resilientes Mejor salud mental Más inmunes a las adicciones'));
assert.ok(!editorialSpokenDuplicates('Una lección sobre la violencia', 'Una lección sobre la familia'), 'new meaningful words remain visible');
assert.ok(!editorialSpokenDuplicates('La familia atraviesa conflictos económicos', 'Una lección sobre la familia'));
assert.ok(!editorialSpokenDuplicates('Los hijos limitan a los padres', 'Los padres limitan a los hijos'), 'reordered words can change meaning');
const repeatedGraphic = {...edit, captions: [caption('Más resilientes, tienen mejor salud mental', 0, 4000)], beats: [{...reserved, kind: 'steps', labels: ['Más resilientes', 'Mejor salud mental', 'Más inmunes a las adicciones']}]};
assert.equal(find(at(repeatedGraphic, 15), 'data-caption-layout', 'editorial-shelf-v1').props.style.visibility, 'hidden', 'dedup uses all visible graphic labels');
for (const choice of [literal, ideas, both]) {
  assert.strictEqual(choice.captions, edit.captions, 'caption intent never modifies source tokens/timing');
  assert.strictEqual(choice.scenes, edit.scenes, 'caption intent never modifies source voice/timeline');
  assert.equal(at(choice, 15).filter(node => node.type === 'source-video' && !node.props.muted).length, 1);
}

const legacy = {...edit, editorialVersion: undefined};
assert.ok(find(at(legacy, 15), 'data-fullscreen-words', 'true'), 'old fullscreen path retained');
assert.equal(find(at(legacy, 60), 'data-fullscreen-words', 'true'), undefined, 'no silent upgrade of historic ASR-gap behavior');
assert.equal(find(at(legacy, 60), 'data-editorial-scene', beat.id), undefined);
const strippedLegacy = {...legacy, beats: [{...beat, presentation: undefined, headline: undefined, textPages: undefined, layoutBox: undefined}]};
const markup = nodes => plain(nodes.map(node => ({type: String(node.type), props: node.props ? Object.fromEntries(Object.entries(node.props).filter(([key]) => !['children', 'onError'].includes(key))) : undefined, text: node.text})));
assert.deepEqual(markup(at(legacy, 15)), markup(at(strippedLegacy, 15)), 'new fields have no effect without explicit version');
console.log('PASS editorial scene: continuous gaps, exact pages, stable media/voice, legacy compatibility, seven icons, separate regions, centered contain mapping, bounded gentle/stable framing, and literal/key-ideas/both visibility preserving original tokens/audio. Synthetic component contract checks; no raster, audio decode or aesthetic claim.');

// Contrast contract for comparison chips and list rows: dark ink must stay readable on the
// worst possible video behind a translucent card (black or white), using the real styles.
{
  const lum = ([r, g, b]) => [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + .05) / (lo + .05); };
  const hex = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
  const ink = hex('#20211f');
  const graphic = (kind, labels) => ({...beat, id: kind, kind, labels, title: labels[0], headline: labels[0], textPages: undefined, presentation: 'overlay', layoutBox: {x: .04, y: .04, width: .82, height: .23}});
  for (const [kind, labels] of [['compare', ['apoyarlos', 'los limitan']], ['steps', ['más resilientes', 'mejor salud mental', 'más inmunes']]]) {
    const nodes = at({...edit, beats: [graphic(kind, labels)]}, 100);
    const cards = nodes.filter(node => typeof node.props?.style?.background === 'string' && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(node.props.style.background)
      && node.props.style.borderRadius && !node.props['data-editorial-scene']);
    assert.ok(cards.length >= labels.length, `${kind} renders its cards`);
    for (const card of cards) {
      const value = card.props.style.background, alpha = (value.length === 9 ? parseInt(value.slice(7, 9), 16) / 255 : 1) * (card.props.style.opacity ?? 1);
      for (const behind of [[0, 0, 0], [255, 255, 255]]) {
        const rgb = hex(value).map((channel, i) => channel * alpha + behind[i] * (1 - alpha));
        assert.ok(ratio(ink, rgb) >= 7, `${kind} card ${value} (effective alpha ${alpha.toFixed(2)}) keeps AAA contrast over ${behind}`);
      }
    }
  }
}

// Reserved composition: ramped presenter rectangle, anchored crop, readable captions, shelf clear of platform UI.
{
  const slotHeights = [];
  for (let frame = 0; frame <= 12; frame++) {
    const nodes = at({...edit, beats: [reserved]}, frame);
    slotHeights.push(parseFloat(find(nodes, 'data-editorial-presenter-slot', 'true').props.style.height));
  }
  assert.equal(slotHeights[0], 100);
  assert.ok(slotHeights.every((h, i) => i === 0 || h <= slotHeights[i - 1] + 1e-9), 'slot only shrinks while entering');
  assert.ok(slotHeights.every((h, i) => i === 0 || slotHeights[i - 1] - h <= 15), 'no jump cut: at most 15% of the canvas per frame');
  assert.equal(slotHeights[10], presenter.height * 100);
  const focused = at({...edit, beats: [{...reserved, presenterFocusY: .4}]}, 60);
  assert.equal(find(focused, 'data-editorial-presenter', 'true').props.style.objectPosition, '50% 40%');
  assert.equal(find(at({...edit, beats: [reserved]}, 60), 'data-editorial-presenter', 'true').props.style.objectPosition, '50% 0%', 'unmeasured crop anchors to the head');
  assert.equal(find(focused, 'data-editorial-presenter', 'true').props.style.scale, 1, 'no zoom pose inside a reserved slot');
  const shelf = find(focused, 'data-caption-layout', 'editorial-shelf-v1').props.style;
  assert.ok(parseFloat(shelf.top) + parseFloat(shelf.height) <= 85, 'caption shelf ends above the bottom platform UI (.84-.85)');
  assert.ok(support.y + support.height <= EDITORIAL_CAPTION_TOP, 'support card stays above the caption shelf');
  const words = at({...edit, beats: [reserved]}, 15).filter(node => node.props?.['data-caption-active'] !== undefined);
  assert.ok(words.length > 0 && words.every(node => node.props.style.color !== '#20211f'), 'captions over the presenter are never dark ink');
}

// Opening hook: real subject only, never fixed copy, only during the first 26 frames.
const hookNodes = at(edit, 10);
const hook = find(hookNodes, 'data-editorial-opening-hook', true);
assert.ok(hook, 'hook visible during the opening');
const hookText = hookNodes.slice(hookNodes.indexOf(hook), hookNodes.indexOf(hook) + 8).filter(node => node.text).map(node => node.text);
assert.deepEqual(hookText, ['Una idea literal.'], 'hook shows the real subject, never fixed demo copy');
assert.equal(find(at(edit, 26), 'data-editorial-opening-hook', true), undefined, 'hook gone after the opening');
const noSubject = {...edit, beats: [], preferences: {...edit.preferences, topic: ''}};
assert.equal(find(at(noSubject, 10), 'data-editorial-opening-hook', true), undefined, 'no hook without a real subject');
