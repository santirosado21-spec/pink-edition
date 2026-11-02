import {editorMedia} from './editorMedia';
import {activeEditorialStep} from './editorialStep';
import {Img, OffthreadVideo, interpolate, useCurrentFrame} from 'remotion';
import {captionIndex, captionPage} from './captionPages';
import {editorFont} from './editorFonts';
import type {EditBeat, OneShotEdit} from './oneShotEdit';

// Portrait overlays use the measured safe band below the face and caption block.
export function NativeEditorial({beat, edit, mediaBase}: {beat: EditBeat; edit: OneShotEdit; mediaBase: string}) {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 9], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const exit = interpolate(frame, [beat.frames - 9, beat.frames - 1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const title = editorFont(edit.preferences.font), caption = editorFont(edit.preferences.font, true);
  const family = edit.preferences.editorialFamilyId;
  const accent = edit.preferences.brand_color;
  const timeMs = (beat.from + frame) / edit.fps * 1000;
  const active = captionIndex(edit.captions, timeMs);
  const shortPages = edit.captionLayoutVersion === 2 && (!edit.captionAdaptations || edit.captionAdaptations.includes('short-caption-pages'));
  const page = shortPages ? captionPage(edit.captions, active) : active < 0 ? [] : edit.captions.slice(Math.floor(active / 6) * 6, Math.floor(active / 6) * 6 + 6);
  const lineBudget = Math.max(3.5, Math.ceil(page.map(w=>w.text.trim()).join(' ').length / 12) * 1.2);
  const top = beat.overlayTop!;
  const height = (edit.visualLayoutVersion === 3 && beat.kind === 'broll' ? .88 : .83) - top;
  const poster = family === 'pulso';
  const literary = family === 'estampa' || family === 'umbral';
  const mediaUrl = beat.asset ? editorMedia(mediaBase, beat.asset) : '';
  const activeStep = beat.kind === 'steps' ? activeEditorialStep(beat.labels, edit.captions, active, beat.from / edit.fps * 1000, (beat.from + beat.frames) / edit.fps * 1000) : -1;
  if (edit.visualLayoutVersion === 3 && beat.kind === 'card') return null;
  return <div data-native-editorial={beat.kind} style={{position:'absolute', top:`${top * 100}%`, left:'7%', width:'86%', height:`${height * 100}%`, opacity:enter * exit, transform:`translateY(${(1-enter)*14}px)`, color:'#fff', fontFamily:title.family, fontStyle:title.fontStyle, fontWeight:title.weight, textShadow:'0 2px 16px #0009'}}>
    {beat.kind === 'card' && <div style={{height:'100%', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:literary?'flex-start':'center', textAlign:literary?'left':'center', lineHeight:literary?1.06:.98, fontSize:Math.min(literary?76:poster?88:72, height*1280/lineBudget), letterSpacing:literary?-2:-3}}>
      <div style={{display:'flex', flexWrap:'wrap', justifyContent:literary?'flex-start':'center', columnGap:16, rowGap:5}}>{page.map((word,i) => <span key={word.startMs} style={{maxWidth:'100%', overflowWrap:'anywhere', textTransform:poster?'uppercase':undefined, color:poster && i===page.length-1 ? accent:'#fff'}}>{word.text.trim()}</span>)}</div>
      {family==='enlace' && page.length > 0 && <div style={{marginTop:18, width:70*enter, height:4, background:accent, boxShadow:'0 2px 10px #0005'}}/>}
    </div>}
    {beat.kind === 'compare' && <div style={{height:'100%', display:'flex', alignItems:'center', gap:22}}>{beat.labels.map((label,i) => {
      const match = label.match(/^(\d+(?:[.,]\d+)?)(.*)$/);
      return <div key={i} style={{flex:1, minWidth:0, textAlign:'center', borderLeft:i===0?undefined:'1px solid #ffffff70', paddingLeft:i===0?0:22, opacity:interpolate(frame,[i*7,i*7+9],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}>
        <div style={{fontSize:match?Math.min(108,height*1280*.52):Math.min(44,height*1280/5), letterSpacing:-4, lineHeight:1.02, color:i===0?accent:'#fff', overflowWrap:'anywhere'}}>{match?match[1]:label}</div>
        {match && <div style={{marginTop:9, fontSize:edit.visualLayoutVersion === 3?30:24, letterSpacing:0, lineHeight:1.1, fontFamily:caption.family, fontWeight:caption.weight, fontStyle:caption.fontStyle}}>{match[2].trim()}</div>}
      </div>;
    })}</div>}
    {beat.kind === 'steps' && <div style={{height:'100%', display:'flex', flexDirection:'column', justifyContent:'center', gap:16}}>{beat.labels.map((label,i) => <div key={i} style={{display:'flex', alignItems:'center', gap:18, fontSize:Math.min(edit.visualLayoutVersion===3?40:48,(height*1280-(beat.labels.length-1)*16)/(beat.labels.reduce((sum,label)=>sum+Math.ceil(label.length/22),0)*1.1)), lineHeight:1.1, opacity:interpolate(frame,[i*7,i*7+9],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})*(edit.visualLayoutVersion===3 && i!==activeStep ? .72 : 1)}}><span style={{width:7,height:34,background:edit.visualLayoutVersion===3 && i!==activeStep?'#ffffff70':accent,flexShrink:0}}/>{label}</div>)}</div>}
    {beat.kind === 'broll' && beat.asset && <div style={{width:'100%',maxWidth:'100%',margin:edit.preferences.editorialFamilyId==='estampa'?'0':'0 auto',height:'100%',borderRadius:family==='bitacora'?12:24,overflow:'hidden',boxShadow:'0 10px 35px #0006',border:family==='estampa'?'7px solid #f5efe1':'1px solid #ffffff55',boxSizing:'border-box'}}>
      {beat.mediaType === 'image' ? <Img src={mediaUrl} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <OffthreadVideo src={mediaUrl} muted style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
    </div>}
  </div>;
}
