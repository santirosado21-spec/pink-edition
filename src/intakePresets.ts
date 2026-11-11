import {DEFAULT_PREFERENCES, type Preferences} from './preferences';
import type {OneShotBrief} from './oneShotBrief';
import {newEditorialDirection} from './editorialDirection';

// These are concrete renderer settings, not instructions for the model to invent a style.
export const INTAKE_PRESETS: {id:string; title:string; description:string; musicMood:OneShotBrief['musicMood']; preferences:Partial<Preferences>}[] = [
  {id:'clean',title:'Limpio',description:'Tu toma y subtítulos blancos. Sin gráficos, imágenes de apoyo ni efectos de sonido.',musicMood:'none',preferences:{editorial:newEditorialDirection({presence:'presenter',readingPace:'calm',framingStyle:'stable',captionIntent:'literal'}),editorialFamilyId:'umbral',font:'cinema',captions:'pink',vibe:'clean',graphics:'none',graphic_kinds:[],support_media:'none',emphasis_mode:'none',sfx:'none',sound_pack:'soft'}},
  {id:'explain',title:'Explicativo',description:'Palabras clave, listas y comparaciones. Hasta 2 clips pertinentes; énfasis sobre tu toma.',musicMood:'none',preferences:{editorial:newEditorialDirection(),editorialFamilyId:'enlace',font:'documentary',captions:'keyword',vibe:'balanced',graphics:'few',graphic_kinds:['compare','steps'],support_media:'video',emphasis_mode:'overlay',sfx:'soft',sound_pack:'soft'}},
  {id:'impact',title:'Impacto',description:'Karaoke y palabras a pantalla completa. Hasta 4 clips pertinentes y sonidos más presentes.',musicMood:'none',preferences:{editorial:newEditorialDirection({presence:'visual',readingPace:'brisk',emphasisStyle:'fullscreen'}),editorialFamilyId:'pulso',font:'anton',captions:'karaoke',vibe:'dynamic',graphics:'few',graphic_kinds:['compare','steps'],support_media:'video',emphasis_mode:'fullscreen',sfx:'full',sound_pack:'digital'}},
];
// Nested arrays belong to the draft, never to the reusable preset or another session.
export const copyPreferencePatch = (value: Partial<Preferences>): Partial<Preferences> => ({
  ...value,
  ...(value.graphic_kinds ? {graphic_kinds:[...value.graphic_kinds]} : {}),
  ...(value.editorial ? {editorial:newEditorialDirection(value.editorial)} : {}),
});
export const quickPreferences = (): Preferences => ({...DEFAULT_PREFERENCES,topic:'El tema de la grabación',language:'es',brand_color:'#f36b52',transition:'punch',...copyPreferencePatch(INTAKE_PRESETS[1].preferences)});
export const initialIntakePreferences = (initial: Preferences | null): Preferences => {
  const value = {...quickPreferences(), ...copyPreferencePatch(initial ?? {}), topic:initial?.topic || quickPreferences().topic,
    transition:initial?.transition && initial.transition!=='none' ? initial.transition : 'punch'} as Preferences;
  // Applying defaults must never opt an existing profile into the new renderer.
  if (initial && !initial.editorial) delete value.editorial;
  return value;
};
const sameValue = (actual: unknown, expected: unknown): boolean => {
  if (Array.isArray(expected)) return Array.isArray(actual) && actual.length===expected.length && expected.every((item,index)=>sameValue(actual[index],item));
  if (expected && typeof expected==='object') return !!actual && typeof actual==='object' && !Array.isArray(actual) &&
    Object.keys(actual).length===Object.keys(expected).length && Object.entries(expected).every(([key,item])=>sameValue((actual as Record<string,unknown>)[key],item));
  return actual===expected;
};
export const matchesIntakePreset = (value: Preferences, preset: (typeof INTAKE_PRESETS)[number], mood: OneShotBrief['musicMood']): boolean =>
  Object.entries(preset.preferences).every(([key, expected]) => sameValue(value[key as keyof Preferences],expected)) && mood === preset.musicMood;
export const QUICK_OBJECTIVE = 'Destacar las ideas principales sin cambiar lo que digo';
export const QUICK_AUDIENCE = 'Público general';
