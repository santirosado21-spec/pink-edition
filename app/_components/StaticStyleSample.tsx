'use client';
import type {Preferences} from '../../src/preferences';
import type {DemoMode} from '../../src/styleDemo';
import {editorialFamily} from '../../src/editorialRecipes';
import {ResourceSample} from './ResourceSample';
export function StaticStyleSample({value,mode,stage=2}:{value:Preferences;mode:DemoMode;stage?:number}) {
  if(mode!=='transition') return <ResourceSample value={value} kind={mode==='emphasis'?(value.emphasis_mode==='fullscreen'?'fullscreen':'overlay'):mode==='broll'?(value.support_media==='video'?'video':'still'):mode}/>;
  const family=editorialFamily(value),mid=stage===1;
  return <svg viewBox="0 0 360 440" role="img" aria-label={`Cambio de toma: ${['inicio','cambio','resultado'][stage]}`} style={{width:'100%',height:'auto',display:'block'}}>
    <rect width="360" height="440" rx="12" fill="#f7f5ef"/>
    <g style={{filter:mid&&family?.transition!=='mask-wipe'?'blur(5px)':undefined}}>
      <rect x="30" y="100" width="300" height="240" rx="12" fill={stage===2?'#deded5':'#efede6'}/>
      <text x="180" y="235" textAnchor="middle" fontFamily="sans-serif" fontSize="38" fill="#20211f">Toma {stage===2?'2':'1'}</text>
    </g>
    {mid&&family?.transition==='mask-wipe'&&<rect x="180" y="100" width="150" height="240" fill="#f36b52"/>}
  </svg>;
}
