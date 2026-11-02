import {DEFAULT_PREFERENCES, type Preferences} from './preferences';
import type {OneShotBrief} from './oneShotBrief';

// These are concrete renderer settings, not instructions for the model to invent a style.
export const INTAKE_PRESETS: {id:string; title:string; description:string; musicMood:OneShotBrief['musicMood']; preferences:Partial<Preferences>}[] = [
  {id:'clean',title:'Limpio',description:'Tu toma y subtítulos blancos. Sin gráficos, imágenes de apoyo ni efectos de sonido.',musicMood:'calm',preferences:{editorialFamilyId:'umbral',font:'cinema',captions:'pink',vibe:'clean',graphics:'none',graphic_kinds:[],support_media:'none',emphasis_mode:'none',sfx:'none',sound_pack:'soft'}},
  {id:'explain',title:'Explicativo',description:'Palabras clave, listas y comparaciones. Hasta 2 clips pertinentes; énfasis sobre tu toma.',musicMood:'documentary',preferences:{editorialFamilyId:'enlace',font:'documentary',captions:'keyword',vibe:'balanced',graphics:'few',graphic_kinds:['compare','steps'],support_media:'video',emphasis_mode:'overlay',sfx:'soft',sound_pack:'soft'}},
  {id:'impact',title:'Impacto',description:'Karaoke y palabras a pantalla completa. Hasta 4 clips pertinentes y sonidos más presentes.',musicMood:'energetic',preferences:{editorialFamilyId:'pulso',font:'anton',captions:'karaoke',vibe:'dynamic',graphics:'few',graphic_kinds:['compare','steps'],support_media:'video',emphasis_mode:'fullscreen',sfx:'full',sound_pack:'digital'}},
];
export const quickPreferences = (): Preferences => ({...DEFAULT_PREFERENCES,topic:'El tema de la grabación',language:'es',brand_color:'#f36b52',transition:'punch',...INTAKE_PRESETS[1].preferences});
export const QUICK_OBJECTIVE = 'Destacar las ideas principales sin cambiar lo que digo';
export const QUICK_AUDIENCE = 'Público general';
