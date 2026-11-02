'use client';
import {useEffect,useRef,useState} from 'react';
import {demoModes,type DemoMode} from '../../src/styleDemo';
import type {Preferences} from '../../src/preferences';
import {editorFont,loadEditorFont} from '../../src/editorFonts';
import {editorialFamily} from '../../src/editorialRecipes';
import {StaticStyleSample} from './StaticStyleSample';
import styles from './StylePreview.module.css';
export function StylePreview({value}: {value:Preferences}) {
  const [mode,setMode]=useState<DemoMode>('captions'),[ready,setReady]=useState(false),[error,setError]=useState('');
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{let active=true;setReady(false);setError('');Promise.all([loadEditorFont(value.font),loadEditorFont(value.font,'',true)]).then(()=>{if(active)setReady(true);}).catch(()=>{if(active)setError('No se pudo cargar la tipografía.');});return()=>{active=false;};},[value.font]);
  const selected=demoModes.find(item=>item.id===mode)!;
  const imageContent=mode==='transition'?<div className={styles.sequence}>{[0,1,2].map(stage=><figure key={stage}><StaticStyleSample value={value} mode={mode} stage={stage}/><figcaption>{['Inicio','Cambio','Resultado'][stage]}</figcaption></figure>)}</div>:<StaticStyleSample value={value} mode={mode}/>;
  return <aside className={styles.preview} aria-label="Muestras en imágenes" data-style-demo-mode={mode}>
    <h2>Compara con imágenes</h2><p className={styles.caption}>Solo imágenes fijas. Las muestras usan la paleta de Cutkind.</p>
    <div className={styles.modes} role="group" aria-label="Efecto de muestra">{demoModes.map(item=><button type="button" key={item.id} aria-pressed={mode===item.id} onClick={()=>setMode(item.id)}>{item.title}</button>)}</div>
    {error?<p role="alert">{error}</p>:!ready?<p role="status">Cargando imagen…</p>:<><div className={styles.image} aria-label={`Vista previa: ${selected.title}`}>{imageContent}</div><button type="button" className={styles.detail} onClick={()=>dialog.current?.showModal()}>Ampliar imágenes</button></>}
    <p aria-live="polite"><strong>{editorialFamily(value)?.title} · {editorFont(value.font).title}</strong><br/>{mode==='transition'?'La secuencia ilustra el cambio en tres imágenes; no reproduce movimiento.':selected.description}</p>
    <details className={styles.caption}><summary>Cómo se aplicará</summary><p>Son imágenes ilustrativas, no una garantía del encuadre final. La familia, letra y subtítulos elegidos pasan al encargo. El color para tu video se configura por separado.</p></details>
    <dialog ref={dialog} className={styles.expanded} aria-label="Imágenes de estilo ampliadas"><button type="button" className="button" onClick={()=>dialog.current?.close()}>Cerrar imágenes</button><h2>{selected.title}</h2><div className={styles.enlargedImage}>{ready&&imageContent}</div></dialog>
  </aside>;
}
