import type {Preferences} from './preferences';
import {editorFont} from './editorFonts';
// A deliberate visual insert. The source video's audio remains mounted underneath.
export function FullScreenWords({words,preferences,width=720,height=1280}:{words:string[];preferences:Preferences;width?:number;height?:number}) {
  const font=editorFont(preferences.font);
  if (!words.length) return null;
  const size=Math.min(height*.6/(words.length*1.08),width*.22, width*1.4/Math.max(6,...words.map(word=>word.length)));
  return <div data-fullscreen-words="true" style={{position:'absolute',inset:0,background:'#f7f5ef',color:'#20211f',display:'flex',flexDirection:'column',justifyContent:'center',padding:'10%',boxSizing:'border-box',fontFamily:font.family,fontWeight:font.weight,fontStyle:font.fontStyle}}>
    <div style={{fontSize:size,lineHeight:1.08,overflowWrap:'anywhere',letterSpacing:'-.025em'}}>{words.map((word,i)=><span key={i} style={{display:'block',textDecorationLine:i===words.length-1?'underline':undefined,textDecorationColor:preferences.brand_color,textDecorationThickness:'.055em',textUnderlineOffset:'.12em'}}>{word}</span>)}</div>
    <div style={{marginTop:height*.06,height:3,width:'20%',background:preferences.brand_color}}/>
  </div>;
}
