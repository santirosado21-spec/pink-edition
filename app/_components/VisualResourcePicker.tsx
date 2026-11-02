'use client';
import {useRef,useState} from 'react';
import type {Preferences} from '../../src/preferences';
import {ResourceSample,type ResourceSampleKind} from './ResourceSample';
import styles from './StylePreview.module.css';
type Option={id:string;kind:ResourceSampleKind;title:string;description:string;pending?:boolean};
const graphicOptions:Option[]=[
  {id:'compare',kind:'compare',title:'Comparaciones',description:'Dos cifras o conceptos que realmente compares en tu discurso.'},
  {id:'steps',kind:'steps',title:'Listas de ideas',description:'Dos o tres pasos o ideas que hayas mencionado.'},
];
const mediaOptions:Option[]=[
  {id:'none',kind:'none',title:'Solo mi grabación',description:'Sin imágenes ni clips de apoyo.'},
  {id:'video',kind:'video',title:'Clips de apoyo',description:'Video ilustrativo en un recuadro. Tu voz continúa.'},
  {id:'still',kind:'still',title:'Láminas fijas',description:'Un fotograma del clip revisado, presentado como imagen fija.'},
];
const textOptions:Option[]=[
  {id:'none',kind:'captions',title:'Solo subtítulos',description:'Sin énfasis adicional de palabras.'},
  {id:'overlay',kind:'overlay',title:'Sobre mi grabación',description:'Frases destacadas sin ocultar tu rostro.'},
  {id:'fullscreen',kind:'fullscreen',title:'Palabras a pantalla completa',description:'La imagen da paso al texto por unos instantes. Tu voz continúa.'},
];
const futureOptions:Option[]=[
  {id:'photo',kind:'photo',title:'Fotografías de archivo',description:'Banco de fotografías independientes. Falta conectar selección y revisión.',pending:true},
  {id:'color-background',kind:'color-background',title:'Color detrás de la persona',description:'Requiere recorte de la persona y revisión de sus bordes.',pending:true},
  {id:'image-background',kind:'image-background',title:'Imagen detrás de la persona',description:'Requiere recorte y una imagen de fondo pertinente.',pending:true},
];
export function VisualResourcePicker({value,onChange}:{value:Preferences;onChange:(patch:Partial<Preferences>)=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [detail,setDetail]=useState<Option>(graphicOptions[0]);
  const kinds=value.graphic_kinds ?? ['compare','steps'];
  const expand=(option:Option)=>{setDetail(option);dialog.current?.showModal();};
  const tile=(option:Option,selected:boolean,choose?:()=>void)=><div key={option.id} className={styles.resourceCard} data-selected={selected}>
    <button type="button" className={styles.sampleButton} aria-label={`Ver ejemplo: ${option.title}`} onClick={()=>expand(option)}><ResourceSample kind={option.kind} value={value}/><span>Ampliar imagen</span></button>
    {choose?<button type="button" className={styles.resourceChoice} aria-pressed={selected} onClick={choose}>{selected?'✓ ':''}{option.title}</button>:<strong>{option.title}</strong>}
    <p>{option.description}</p>{option.pending&&<small>En investigación · aún no se aplica</small>}
  </div>;
  return <section className={styles.resources} aria-label="Recursos visuales">
    <h2>¿Qué puede aparecer en tu video?</h2>
    <p className="muted">Elige los apoyos que permites. Se usarán solo cuando expliquen lo que dices. Todos los ejemplos son ilustraciones fijas.</p>
    <fieldset className={styles.resourceGroup}><legend>Gráficos que explican</legend><p className="muted">Puedes activar ambos, uno o ninguno. Las cifras del ejemplo no se añaden a tu video.</p>
      <div className={styles.resourceGrid}>{graphicOptions.map(option=>tile(option,value.graphics!=='none'&&kinds.includes(option.id),()=>{
        const current=value.graphics==='none'?[]:kinds;
        const next=current.includes(option.id)?current.filter(id=>id!==option.id):[...current,option.id];
        onChange({graphic_kinds:next,graphics:next.some(id=>id==='compare'||id==='steps')?'few':'none'});
      }))}</div>
    </fieldset>
    <fieldset className={styles.resourceGroup}><legend>Videos e imágenes de apoyo</legend>
      <div className={styles.resourceGrid}>{mediaOptions.map(option=>tile(option,value.support_media===option.id,()=>onChange({support_media:option.id as Preferences['support_media']})))}{tile(futureOptions[0],false)}</div>
      <button type="button" className={styles.autoChoice} aria-pressed={!value.support_media||value.support_media==='auto'} onClick={()=>onChange({support_media:'auto'})}>Según la familia editorial: clips o láminas</button>
      <p className="muted">Se colocan junto a tu imagen, respetando el rostro y los subtítulos. Si no hay un recurso pertinente o espacio seguro, conservamos tu grabación.</p>
    </fieldset>
    <fieldset className={styles.resourceGroup}><legend>Momentos de palabras</legend><div className={styles.resourceGrid}>{textOptions.map(option=>tile(option,(value.emphasis_mode??'overlay')===option.id,()=>onChange({emphasis_mode:option.id as Preferences['emphasis_mode']})))}</div></fieldset>
    <fieldset className={styles.resourceGroup}><legend>Fondo detrás de la persona</legend><p>Se conserva el fondo original de tu grabación.</p><p className="muted">Estas imágenes muestran las siguientes opciones que estamos investigando. Todavía no se pueden seleccionar para una edición.</p><div className={styles.resourceGrid}>{futureOptions.slice(1).map(option=>tile(option,false))}</div></fieldset>
    <dialog ref={dialog} className={styles.expanded} aria-label="Ejemplo de recurso ampliado"><button type="button" className="button" onClick={()=>dialog.current?.close()}>Cerrar ejemplo</button><h2>{detail.title}</h2><p>{detail.description}</p>{detail.pending&&<p>Concepto en investigación. Aún no disponible para editar.</p>}<div className={styles.resourceEnlarged}><ResourceSample kind={detail.kind} value={value}/></div><p className="muted">Ilustración de composición con los colores de Cutkind; no es una fotografía ni una captura de otro editor.</p></dialog>
  </section>;
}
