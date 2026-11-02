import type {OneShotEdit, EditBeat} from './oneShotEdit';
import type {Preferences} from './preferences';
import {editorialFamily} from './editorialRecipes';
export const demoModes = [
  {id:'captions',title:'Subtítulos',description:'Compara la letra y el resaltado que elegiste.'},
  {id:'emphasis',title:'Énfasis',description:'La fuente de título destaca una frase, sin duplicar el subtítulo.'},
  {id:'compare',title:'Comparación',description:'Cifras con su unidad. Solo se usan si tu discurso compara.'},
  {id:'steps',title:'Lista',description:'Se destaca la idea activa. Solo se usa si enumeras ideas.'},
  {id:'broll',title:'Imagen de apoyo',description:'Encuadre de una ilustración; en tu edición se buscará material pertinente.'},
  {id:'transition',title:'Cambio de toma',description:'Una secuencia de imágenes ilustra el cambio de toma de la familia editorial.'},
] as const;
export type DemoMode = typeof demoModes[number]['id'];
export function styleDemo(prefs: Preferences, mode: DemoMode, sampleText='Cada historia tiene su propio ritmo. Encuentra tu forma de contar.') : OneShotEdit {
  const script = mode==='compare' ? 'Compara 20 minutos con 40 minutos. Cada cifra tiene su contexto.' : mode==='steps' ? 'Observa los detalles. Elige tu estilo. Cuenta tu historia.' : mode==='broll' ? 'Una imagen puede acompañar lo que quieres contar. Tu historia continúa.' : sampleText.trim() || 'Cada historia tiene su propio ritmo.';
  const words=script.split(/\s+/);
  const captions=words.map((text,i)=>({text:' '+text,startMs:i*700,endMs:i*700+650,timestampMs:null,confidence:null}));
  const beat: EditBeat={id:'demo',from:0,frames:240,kind:'card',quote:script,title:script,labels:[],reason:'Demostración sintética de una función implementada.',overlayTop:.65};
  const beats: EditBeat[]=mode==='emphasis'?[beat]:mode==='compare'?[{...beat,kind:'compare',labels:['20 minutos','40 minutos']}]:mode==='steps'?[{...beat,kind:'steps',labels:['Observa','Elige','Cuenta']}]:mode==='broll'?[{...beat,kind:'broll',from:24,frames:180,asset:prefs.editorialFamilyId==='estampa'?'plate.jpg':'scene-b.mp4',mediaType:prefs.editorialFamilyId==='estampa'?'image':'video'}]:[];
  // Synthetic geometry is fixed, not a claim of measured face detection.
  const scenes=[0,120].map((from,i)=>({id:`demo-${i}`,name:`Ilustración ${i+1}`,asset:`scene-${i===0?'a':'b'}.mp4`,from,frames:120,width:720,height:1280,framing:[{frame:0,scale:1,x:0,y:0,captionTop:.46,measured:false}]}));
  const family=editorialFamily(prefs);
  return {fps:30,width:720,height:1280,frames:240,preferences:prefs,scenes,captions,beats,music:null,musicFrames:1,issues:[],assets:[],checks:{},visualLayoutVersion:3,captionLayoutVersion:3,resourcePolicy:'relevant-only',transitions:mode==='transition'&&family?[{from:120,frames:16,variantId:family.transition as 'soft-focus'|'mask-wipe'|'zoom-blur',purpose:'Cambio de toma de demostración'}]:[]};
}
