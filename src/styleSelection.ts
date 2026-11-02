import {DEFAULT_PREFERENCES,checkPreferences,type Preferences} from './preferences';
const keys=['editorialFamilyId','font','captions','brand_color','vibe','graphic_material','transition','graphics','graphic_kinds','support_media','emphasis_mode'] as const;
export function styleSelectionUrl(prefs:Preferences): string {
  const selection=Object.fromEntries(keys.map(key=>[key,prefs[key]]));
  return '/app?'+new URLSearchParams({style:JSON.stringify(selection)}).toString();
}
export function readStyleSelection(search:string): Partial<Preferences>|null {
  try {
    const serialized=new URLSearchParams(search).get('style');
    if(!serialized || serialized.length>2000)return null;
    const selection=JSON.parse(serialized);
    if(!selection || typeof selection!=='object' || Array.isArray(selection) || Object.keys(selection).some(key=>!keys.some(allowed=>allowed===key)))return null;
    if(checkPreferences({...DEFAULT_PREFERENCES,...selection}).length)return null;
    return selection;
  } catch {return null;}
}
