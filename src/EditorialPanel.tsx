import {editorMedia} from './editorMedia';
import {NativeEditorial} from './NativeEditorial';
import {Video} from '@remotion/media';
import {Img, useCurrentFrame, interpolate} from 'remotion';
import type {EditBeat, OneShotEdit} from './oneShotEdit';
import {editorialFamily, editorialVariant} from './editorialRecipes';
import {editorFont} from './editorFonts';

export function EditorialPanel({beat, edit, mediaBase}: {beat: EditBeat; edit: OneShotEdit; mediaBase: string}) {
  const frame=useCurrentFrame(), family=editorialFamily(edit.preferences), variant=editorialVariant(beat,edit.preferences);
  const horizontal=edit.width>edit.height, accent=edit.preferences.brand_color;
  const progress=interpolate(frame,[10,family?.id==='pulso'?19:32],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const exit=interpolate(frame,[beat.frames-18,beat.frames-10],[1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const paper=family?.texture==='paper'||edit.preferences.graphic_material==='paper';
  const floating=beat.kind==='card' && ['umbral','pulso'].includes(family?.id ?? '');
  const ink=paper&&!floating?'#17191d':'#f5f0e7';
  const textSize=(horizontal?31:36)*Math.min(1,Math.sqrt(95/Math.max(95,beat.title.length)));
  const words=beat.title.split(/\s+/), groups=Array.from({length:Math.ceil(words.length/5)},(_,i)=>words.slice(i*5,i*5+5).join(' '));
  if ((edit.visualLayoutVersion ?? 0) >= 2 && !horizontal && beat.overlayTop === undefined) return null;
  if ((edit.visualLayoutVersion ?? 0) >= 2 && !horizontal && beat.overlayTop !== undefined) return <NativeEditorial beat={beat} edit={edit} mediaBase={mediaBase}/>;
  return <div data-editorial-variant={variant} style={{position:'absolute',left:horizontal?'61%':'6%',top:horizontal?'16%':'51%',width:horizontal?'35%':'88%',height:horizontal?'61%':'33%',boxSizing:'border-box',padding:family?.id==='pulso'?28:24,color:ink,background:floating?'transparent':paper?'#f1ebdf':'#202730',borderRadius:family?.id==='bitacora'?12:0,borderTop:family?.id==='enlace'?`3px solid ${accent}`:undefined,opacity:exit,display:'flex',flexDirection:'column',justifyContent:family?.id==='bitacora'?'flex-end':'center',overflow:'hidden',overflowWrap:'anywhere',fontSize:textSize,lineHeight:1.22,fontWeight:editorFont(edit.preferences.font).weight}}>
    {family?.texture==='paper'&&<div style={{position:'absolute',inset:0,opacity:.045,backgroundImage:'repeating-linear-gradient(9deg, transparent 0 3px, #786449 3px 4px)',pointerEvents:'none'}}/>}
    {family?.texture==='grain'&&<svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.07,pointerEvents:'none'}}><filter id={`grain-${beat.id}`}><feTurbulence baseFrequency=".7" numOctaves="2" seed={7}/></filter><rect width="100%" height="100%" filter={`url(#grain-${beat.id})`}/></svg>}
    {beat.kind==='card'&&<div style={{position:'relative',opacity:variant==='mask'?1:progress,clipPath:variant==='mask'?`inset(0 ${100-progress*100}% 0 0)`:undefined,transform:variant==='word-accent'?`scale(${.94+.06*progress})`:undefined}}>
      {variant==='chapter'&&<div style={{fontFamily:editorFont(edit.preferences.font,true).family,fontStyle:'normal',fontSize:14,letterSpacing:3,marginBottom:24,borderBottom:`1px solid ${ink}`,paddingBottom:12}}>EN ESTE MOMENTO</div>}
      {variant==='quote'&&<div aria-hidden style={{fontSize:80,lineHeight:.6,marginBottom:18,color:accent}}>“</div>}
      {variant==='line-reveal'?groups.map((line,i)=><div key={i} style={{overflow:'hidden'}}><div style={{transform:`translateY(${100*(1-Math.max(0,Math.min(1,(frame-10-i*4)/12)))}%)`}}>{line}</div></div>):variant==='word-accent'?words.map((word,i)=><span key={i} style={{display:'inline-block',marginRight:8,background:i===words.length-1?accent:undefined,color:i===words.length-1?'#fff':ink,padding:i===words.length-1?'2px 6px':undefined}}>{word}</span>):beat.title}
      {variant==='underline'&&<svg width="100%" height="18" viewBox="0 0 400 18" preserveAspectRatio="none"><path d="M2 12 Q140 3 398 10" fill="none" stroke={accent} strokeWidth="4" pathLength="1" strokeDasharray="1" strokeDashoffset={1-progress}/></svg>}
      {variant==='quote'&&<div style={{marginTop:24,width:50,height:2,background:accent}}/>}
    </div>}
    {(beat.kind==='compare'||beat.kind==='steps')&&<div style={{position:'relative',display:'flex',flexDirection:'column',gap:18,opacity:progress}}>
      {beat.labels.map((label,index)=><div key={index} style={{display:'flex',alignItems:'center',gap:16,opacity:Math.max(0,Math.min(1,(frame-12-index*9)/15)),padding:'12px 0',borderBottom:beat.kind==='compare'?`1px solid ${ink}44`:undefined}}>
        {beat.kind==='steps'&&<svg width="36" height="46" viewBox="0 0 36 46" style={{flexShrink:0}}><path d="M6 0 V23 H25" stroke={accent} strokeWidth="2" fill="none"/><circle cx="27" cy="23" r="5" fill={accent}/></svg>}
        <span style={{fontSize:(horizontal?28:31)*Math.min(1,Math.sqrt(60/Math.max(60,label.length)))}}>{label}</span>
      </div>)}
    </div>}
    {beat.kind==='broll'&&beat.asset&&<div style={{position:'relative',height:'100%',display:'flex',flexDirection:variant==='split'?'row':'column',alignItems:'center',gap:14,opacity:progress}}>
      {beat.mediaType==='image'?<Img src={editorMedia(mediaBase, beat.asset)} style={{width:variant==='split'?'65%':'100%',height:variant==='split'?'100%':'80%',objectFit:'contain'}}/>:<Video src={editorMedia(mediaBase, beat.asset)} muted loop durationInFrames={beat.frames} objectFit="contain" style={{width:variant==='split'?'65%':'100%',height:variant==='split'?'100%':'80%',border:variant==='framed'?`8px solid ${paper?'#fff':ink}`:undefined,boxSizing:'border-box'}}/>}
      <div style={{fontFamily:editorFont(edit.preferences.font,true).family,fontStyle:'normal',fontSize:16,lineHeight:1.3,flex:1}}>{beat.quote.length<=100?beat.quote:beat.quote.slice(0,97).replace(/\s+\S*$/,'')+'…'}</div>
    </div>}
  </div>;
}
