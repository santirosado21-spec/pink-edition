import { useEffect, useState } from 'react';
import { editorFont, loadEditorFont } from './editorFonts';
import { AbsoluteFill, Audio, Loop, Sequence, interpolate, useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender, OffthreadVideo, getRemotionEnvironment } from 'remotion';
import {FullScreenWords} from './FullScreenWords';
import {EditorialPanel} from './EditorialPanel';
import type { OneShotEdit } from './oneShotEdit';
import {portraitFraming} from './portraitFraming';
import { captionIndex, captionPage, captionPhrasePage } from './captionPages';
export type OneShotVideoProps = { edit: OneShotEdit; mediaBase: string; onMediaError?: (message: string) => void };
import {editorMedia as url} from './editorMedia';
export function OneShotVideo(props: OneShotVideoProps) {
  return <LoadedOneShotVideo key={`${props.edit.preferences.font}:${props.mediaBase}`} {...props} />;
}
function LoadedOneShotVideo({ edit, mediaBase, onMediaError }: OneShotVideoProps) {
  const font = editorFont(edit.preferences.font), captionFont = editorFont(edit.preferences.font, true);
  const [handle] = useState(() => delayRender('Cargando tipografía elegida'));
  const [mediaError, setMediaError] = useState('');
  const failMedia = (name: string, error: Error) => {
    const message = `No se pudo mostrar ${name}. La edición está incompleta: ${error.message}`;
    setMediaError(message); onMediaError?.(message);
    if (getRemotionEnvironment().isRendering) cancelRender(new Error(message));
  };
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const origin = mediaBase.startsWith('http') ? new URL(mediaBase).origin : '';
    Promise.all([loadEditorFont(font.id, origin), loadEditorFont(font.id, origin, true)]).then(() => { setReady(true); continueRender(handle); }).catch(cancelRender);
  }, [font.id, handle, mediaBase]);
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const horizontal = edit.width > edit.height;
  const activeBeat = edit.beats.find(b => frame >= b.from && frame < b.from + b.frames);
  const nativeV3 = edit.visualLayoutVersion === 3 && !horizontal;
  const nativeLayout = (edit.visualLayoutVersion ?? 0) >= 2 && !horizontal;
  const currentScene = edit.scenes.find(s=>frame>=s.from && frame<s.from+s.frames);
  const framing = portraitFraming(currentScene,frame);
  const captionShelf = nativeV3 && framing.captionTop === null;
  const nativeHeadline = nativeLayout && !nativeV3 && activeBeat?.kind === 'card';
  const space = activeBeat ? interpolate(frame, [activeBeat.from, activeBeat.from + 10, activeBeat.from + activeBeat.frames - 10, activeBeat.from + activeBeat.frames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const zoom = (edit.transitions ?? []).find(t=>t.variantId==='zoom-blur' && frame>=t.from && frame<t.from+t.frames);
  const zoomProgress = zoom ? (frame-zoom.from)/Math.max(1,zoom.frames-1) : 1;
  const fontFamily = font.family;
  const modernCaptions = (edit.captionLayoutVersion ?? 0) >= 2;
  const shortPages = modernCaptions && (!edit.captionAdaptations || edit.captionAdaptations.includes('short-caption-pages'));
  const activeWord = modernCaptions ? captionIndex(edit.captions, frame / fps * 1000) : edit.captions.findIndex(c => frame / fps * 1000 >= c.startMs && frame / fps * 1000 < c.endMs);
  const words = shortPages ? (nativeV3 ? captionPhrasePage : captionPage)(edit.captions, activeWord) : activeWord < 0 ? [] : edit.captions.slice(Math.floor(activeWord / 6) * 6, Math.floor(activeWord / 6) * 6 + 6);
  const fullScreenWords = edit.preferences.emphasis_mode === 'fullscreen' && activeBeat?.kind === 'card';
  const screenWords = fullScreenWords ? captionPhrasePage(edit.captions,activeWord).map(word=>word.text.trim()) : [];
  const showFullScreenWords = fullScreenWords && screenWords.length > 0;
  const emphasis = nativeV3 && activeBeat?.kind === 'card';
  const renderedCaptionFont = emphasis ? font : captionFont;
  const captionSize = Math.min(emphasis ? 64 : 56, words.map(w=>w.text.trim()).join(' ').length > 38 ? 48 : 64);
  if (!ready) return null;
  if (mediaError) return <AbsoluteFill style={{ background: '#171717', color: '#fff', padding: 40, fontSize: 28 }} role="alert">{mediaError}</AbsoluteFill>;
  return <AbsoluteFill data-editor-font={font.id} style={{ fontWeight: font.weight, fontStyle: font.fontStyle, backgroundColor: '#10141a', color: '#f9f7f0', fontFamily }}>
    <AbsoluteFill style={nativeV3 ? {width:720,height:1280,transform:`scale(${edit.width/720})`,transformOrigin:'top left'} : undefined}>
    {edit.scenes.map((scene, index) => <Sequence key={scene.id} from={scene.from} durationInFrames={scene.frames} premountFor={15}>
      <OffthreadVideo key={scene.id} src={url(mediaBase, scene.asset)} volume={.75} pauseWhenBuffering onError={error => failMedia(scene.name, error)} style={{ objectFit: 'contain', filter: zoom ? `blur(${(1-zoomProgress)*3}px)` : undefined, transform: nativeV3 && !captionShelf ? `translate(${framing.x*720}px,${framing.y*1280}px) scale(${framing.scale})` : zoom && !nativeV3 ? `scale(${.97+.03*zoomProgress})` : undefined, transformOrigin: nativeV3 ? 'top left' : undefined, position: 'absolute', left: `${nativeLayout ? 0 : horizontal ? space * 3 : 0}%`, top: `${nativeLayout ? 0 : space * (horizontal ? 10 : 3)}%`, width: `${nativeLayout ? 100 : 100 - (horizontal ? space * 45 : 0)}%`, height: `${captionShelf ? 76 : nativeLayout ? 100 : 84 - space * (horizontal ? 13 : 38)}%` }} />
      {index > 0 && !edit.transitions?.length && edit.preferences.transition === 'flash' && <AbsoluteFill style={{ background: '#fff', pointerEvents: 'none', opacity: frame - scene.from < 8 ? (1 - (frame - scene.from) / 8) * .15 : 0 }} />}
    </Sequence>)}
    {(edit.transitions ?? []).map((transition,index)=> {
      const t=frame-transition.from;
      if(t<0||t>=transition.frames) return null;
      const p=t/Math.max(1,transition.frames-1);
      return <div key={`transition-${index}`} data-transition={transition.variantId} style={{position:'absolute',inset:'0 0 16% 0',pointerEvents:'none',backdropFilter:transition.variantId==='soft-focus'?`blur(${(1-p)*8}px)`:transition.variantId==='zoom-blur'?`blur(${(1-p)*5}px)`:undefined,background:transition.variantId==='mask-wipe'?edit.preferences.brand_color:undefined,clipPath:transition.variantId==='mask-wipe'?`inset(0 0 0 ${p*100}%)`:undefined,opacity:transition.variantId==='mask-wipe'?1:1-p}}/>;
    })}
    {nativeLayout && <div style={{position:'absolute',inset:'48% 0 0',background:'linear-gradient(transparent, rgba(0,0,0,.14) 48%, rgba(0,0,0,.5))',pointerEvents:'none'}}/>}
    {edit.beats.filter(beat=>!(beat.kind==='card' && edit.preferences.emphasis_mode==='fullscreen')).map(beat => <Sequence key={beat.id} from={beat.from} durationInFrames={beat.frames}><EditorialPanel beat={beat} edit={edit} mediaBase={mediaBase} /></Sequence>)}
    <div data-caption-layout={nativeV3 ? 'phrase-pages-v3' : modernCaptions ? 'short-pages-v2' : 'legacy-v1'} style={{ position: 'absolute', left: '6%', right: '6%', top: nativeV3 ? `${(framing.captionTop ?? .79)*100}%` : undefined, bottom: nativeV3 ? undefined : nativeLayout ? '7%' : '3%', visibility: nativeHeadline || showFullScreenWords ? 'hidden' : 'visible', height: nativeV3 ? '14%' : modernCaptions ? (horizontal ? '14%' : '12%') : '10%', display: 'flex', alignItems: 'center', justifyContent: nativeV3 && ['estampa','bitacora'].includes(edit.preferences.editorialFamilyId ?? '') ? 'flex-start' : 'center', gap: 8, flexWrap: 'wrap', alignContent: 'center', fontFamily: renderedCaptionFont.family, fontStyle: renderedCaptionFont.fontStyle, textAlign: nativeV3 && edit.preferences.editorialFamilyId === 'estampa' ? 'left' : 'center', textShadow: nativeV3 ? '0 3px 12px #000e' : nativeLayout ? '0 2px 8px #000b' : undefined, WebkitTextStroke: nativeV3 ? '1.2px #000b' : undefined, paintOrder: nativeV3 ? 'stroke fill' : undefined, fontSize: nativeV3 ? captionSize : horizontal ? 32 : nativeLayout ? 40 : 34, letterSpacing: nativeV3 ? (edit.preferences.editorialFamilyId === 'umbral' ? 0 : -1.5) : undefined, lineHeight: 1.1, fontWeight: renderedCaptionFont.weight }}>
      {words.map((word, i) => {
        const on = frame / fps * 1000 >= word.startMs && frame / fps * 1000 < word.endMs;
        const accent = modernCaptions && (!edit.captionAdaptations || edit.captionAdaptations.includes('keyword-emphasis')) && on && edit.preferences.captions === 'keyword';
        return <span data-caption-active={on ? 'true' : 'false'} key={`${word.startMs}-${i}`} style={{ padding: '2px 4px', maxWidth: modernCaptions ? '100%' : undefined, overflowWrap: modernCaptions ? 'anywhere' : undefined, borderRadius: 5, background: on && edit.preferences.captions === 'karaoke' ? '#f4d653' : 'transparent', color: on && edit.preferences.captions === 'karaoke' ? '#171717' : '#fff', textDecoration: accent ? 'underline' : undefined, textDecorationColor: accent ? edit.preferences.brand_color : undefined, textDecorationThickness: accent ? '4px' : undefined, textUnderlineOffset: accent ? '6px' : undefined }}>{word.text.trim()}</span>;
      })}
    </div>
    {showFullScreenWords && <FullScreenWords words={screenWords} preferences={edit.preferences} width={nativeV3?720:edit.width} height={nativeV3?1280:edit.height}/>}
    {edit.soundEvents?.map((sound,i)=><Sequence key={`sound-${i}`} from={sound.from} durationInFrames={sound.frames}><Audio src={url(mediaBase,sound.asset)} volume={sound.volume}/></Sequence>)}
    {edit.music && <Loop durationInFrames={edit.musicFrames}><Audio src={url(mediaBase, edit.music)} volume={.18} /></Loop>}
    </AbsoluteFill>
  </AbsoluteFill>;
}
