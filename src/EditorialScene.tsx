import {Img, OffthreadVideo, interpolate, useCurrentFrame} from 'remotion';
import {editorMedia} from './editorMedia';
import {editorFont} from './editorFonts';
import {EditorialIcon} from './EditorialIcon';
import {EDITORIAL_CAPTION_TOP, editorialBeatVisible, editorialCaptionIntent, editorialPageAt, editorialPresentation, editorialSupportBox, editorialTextBeat, editorialTextPages, editorialTextSize} from './editorialSceneTiming';
import type {EditBeat, OneShotEdit} from './oneShotEdit';

// One persistent scene per event: text page changes never mount/unmount media.
export function EditorialScene({beat, edit, mediaBase}: {beat: EditBeat; edit: OneShotEdit; mediaBase: string}) {
  const frame = useCurrentFrame();
  const presentation = editorialPresentation(beat, edit), full = presentation === 'fullscreen';
  const box = editorialSupportBox(beat, presentation);
  const width = (edit.visualLayoutVersion === 3 && edit.width < edit.height ? 720 : edit.width) * box.width;
  const height = (edit.visualLayoutVersion === 3 && edit.width < edit.height ? 1280 : edit.height) * box.height;
  const title = editorFont(edit.preferences.font), accent = edit.preferences.brand_color;
  const pages = editorialTextPages(beat), active = editorialPageAt(beat, frame);
  const textScene = editorialTextBeat(beat);
  const textAreaHeight = height * (beat.kind === 'icon' ? .60 : full ? .80 : 1);
  const size = editorialTextSize(pages, width, textAreaHeight);
  const ramp = Math.max(1, Math.min(4, Math.floor(beat.frames / 6)));
  const contentOpacity = interpolate(frame, [0, ramp, Math.max(ramp + 1, beat.frames - ramp), Math.max(ramp + 2, beat.frames)], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const paper = full || presentation === 'reserved' || presentation === 'inset';
  if (!editorialBeatVisible(beat, edit)) return null;
  return <div data-editorial-scene={beat.id} data-editorial-presentation={presentation} style={{position: 'absolute', left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%`, overflow: 'hidden', boxSizing: 'border-box', background: beat.kind !== 'broll' && paper ? '#f7f5ef' : undefined, color: paper ? '#20211f' : '#fff', fontFamily: title.family, fontStyle: title.fontStyle, fontWeight: title.weight, borderRadius: !full && presentation === 'inset' ? 20 : 0}}>
    {beat.kind === 'broll' && beat.asset && <>
      {beat.mediaType === 'image' ? <Img src={editorMedia(mediaBase, beat.asset)} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover'}}/> : <OffthreadVideo src={editorMedia(mediaBase, beat.asset)} muted style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover'}}/>}
      {full && <div data-editorial-caption-protection style={{position: 'absolute', top: `${(EDITORIAL_CAPTION_TOP - .04) * 100}%`, bottom: 0, width: '100%', background: 'linear-gradient(transparent, #000d 35%)'}}/>}
    </>}
    {textScene && <div style={{position: 'absolute', inset: full ? (editorialCaptionIntent(edit) === 'literal' ? '9% 8% 26%' : '9% 8% 15%') : '7% 8%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: Math.min(28, height * .05), opacity: contentOpacity}}>
      {beat.kind === 'icon' && beat.icon && <EditorialIcon kind={beat.icon} color={accent} size={Math.min(width * .24, height * .23, 150)}/>}
      <div data-editorial-text-page={active?.index ?? -1} style={{fontSize: size, lineHeight: 1.1, letterSpacing: '-.025em', overflowWrap: 'anywhere', whiteSpace: 'pre-line', textWrap: 'pretty', opacity: active ? interpolate(frame, [active.page.from, active.page.from + Math.min(7, Math.max(1, active.until - active.page.from - 1))], [.25, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0, translate: active ? `0 ${interpolate(frame, [active.page.from, active.page.from + 8], [10, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px` : undefined}}>{active?.page.text}</div>
      <div style={{height: 3, width: Math.min(width * .15, 90), background: accent, flexShrink: 0}}/>
    </div>}
    {beat.kind === 'compare' && <div style={{position: 'absolute', inset: full ? '22% 8%' : '7% 8%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, opacity: contentOpacity}}>
      <div style={{display: 'grid', gridTemplateColumns: beat.labels.length > 1 ? '1fr 1fr' : '1fr', gap: 16, width: '100%', maxWidth: 880}}>
        {beat.labels.map((label, index) => (
          <div key={index} style={{background: index === 1 ? '#f7f5ef' : '#fffffff2', border: index === 1 ? `2.5px solid ${accent}` : '2px solid rgba(32,33,31,0.12)', borderRadius: 16, padding: '28px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 140, boxShadow: '0 4px 16px rgba(0,0,0,0.05)'}}>
            <div style={{fontSize: Math.min(44, Math.max(26, Math.round(520 / Math.max(10, label.length)))), fontWeight: 700, color: '#20211f', lineHeight: 1.15, textWrap: 'balance'}}>{label}</div>
          </div>
        ))}
      </div>
    </div>}
    {beat.kind === 'steps' && (() => {
      const totalSteps = beat.labels.length;
      const stepDuration = beat.frames / Math.max(1, totalSteps);
      // Rows never outgrow the card: size from the inner height (row = 36px padding + 1.2 line), then from label length.
      const innerHeight = full ? height * .68 : height * .86;
      const rowFont = Math.max(18, Math.floor(((innerHeight - (totalSteps - 1) * 16) / totalSteps - 36) / 1.2));
      return <div style={{position: 'absolute', inset: full ? '16% 8%' : '7% 8%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, opacity: contentOpacity}}>
        {beat.labels.map((label, index) => {
          const revealFrame = Math.round(index * stepDuration);
          if (frame < revealFrame) return null;
          const isLast = index === totalSteps - 1;
          const isActive = frame >= revealFrame && (isLast || frame < Math.round((index + 1) * stepDuration));
          const stepProgress = interpolate(frame, [revealFrame, revealFrame + 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return <div key={index} style={{display: 'flex', alignItems: 'center', gap: 16, background: isActive ? '#fffffffa' : '#f4f2eaf2', borderLeft: `5px solid ${isActive ? accent : '#20211f33'}`, borderRadius: '0 14px 14px 0', padding: '18px 24px', opacity: isActive ? 1 : 0.92, transform: `translateX(${(1 - stepProgress) * 16}px)`, boxShadow: isActive ? '0 4px 16px rgba(0,0,0,0.06)' : 'none'}}>
            <span style={{fontFamily: 'CutkindBebas', fontSize: 26, fontWeight: 700, color: isActive ? accent : '#20211f99', minWidth: 28}}>0{index + 1}</span>
            <span style={{fontSize: Math.min(rowFont, 42, Math.max(22, Math.round(750 / Math.max(15, label.length)))), fontWeight: isActive ? 700 : 600, color: '#20211f', lineHeight: 1.2, letterSpacing: '-0.01em'}}>{label}</span>
          </div>;
        })}
      </div>;
    })()}
  </div>;
}
