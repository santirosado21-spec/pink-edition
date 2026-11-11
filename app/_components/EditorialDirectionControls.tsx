'use client';
import {useId} from 'react';
import {newEditorialDirection, type EditorialDirection, type ReferenceAspect} from '../../src/editorialDirection';
import type {Preferences} from '../../src/preferences';
import styles from './EditorialDirectionControls.module.css';

type SingleKey = Exclude<keyof EditorialDirection, 'version' | 'referenceAspects'>;
type Choice = {id:string; label:string; help:string};
const groups: {key:SingleKey; title:string; help:string; choices:Choice[]}[] = [
  {key:'presence',title:'¿Cuánto se te ve en pantalla?',help:'Marca un límite para los apoyos; nunca obliga a añadirlos.',choices:[
    {id:'presenter',label:'Siempre protagonista',help:'Tu imagen ocupa más tiempo.'},
    {id:'balanced',label:'Equilibrado',help:'Alterna tu imagen y apoyos pertinentes.'},
    {id:'visual',label:'Más apoyo visual',help:'Da más espacio a lo que explicas.'},
  ]},
  {key:'readingPace',title:'Ritmo de lectura del texto',help:'Cambia el tiempo para leer cada frase, sin acelerar tu voz.',choices:[
    {id:'calm',label:'Pausado',help:'Más tiempo por frase.'},
    {id:'balanced',label:'Normal',help:'Lectura equilibrada.'},
    {id:'brisk',label:'Ágil',help:'Frases breves, cambios más seguidos.'},
  ]},
  {key:'emphasisStyle',title:'Cómo destacar ideas clave',help:'Usamos extractos literales. El texto se ajusta al espacio disponible.',choices:[
    {id:'overlay',label:'Sobre tu toma',help:'Titular junto a tu imagen.'},
    {id:'composed',label:'Persona y titular',help:'Reserva espacio para ambos.'},
    {id:'fullscreen',label:'Pantalla completa',help:'El texto cubre temporalmente la imagen; tu voz continúa.'},
  ]},
  {key:'resourceStyle',title:'Recursos que prefieres',help:'Da prioridad entre los recursos permitidos. Tus exclusiones siempre mandan.',choices:[
    {id:'real',label:'Clips reales',help:'Acciones u objetos relacionados con tu discurso.'},
    {id:'diagram',label:'Iconos y diagramas',help:'Gráficos sencillos que expliquen tu idea.'},
    {id:'mixed',label:'Combinar ambos',help:'El recurso que mejor explique cada frase.'},
  ]},
  {key:'framingStyle',title:'Movimiento de cámara',help:'Mantiene el encuadre dentro de cada escena y conserva tu fondo.',choices:[
    {id:'stable',label:'Fijo',help:'Sin acercamientos añadidos.'},
    {id:'gentle',label:'Suave',help:'Cambios de encuadre suaves entre escenas.'},
  ]},
  {key:'captionIntent',title:'Texto que acompaña tu voz',help:'Define la intención del texto. La voz y las palabras grabadas se conservan.',choices:[
    {id:'literal',label:'Subtítulos literales',help:'Lo que dices, como subtítulos.'},
    {id:'key-ideas',label:'Ideas clave',help:'Extractos literales como titulares.'},
    {id:'both',label:'Ambos',help:'Subtítulos y titulares sin duplicarlos.'},
  ]},
];
const aspects: {id:ReferenceAspect; label:string}[] = [
  {id:'rhythm',label:'Ritmo'}, {id:'typography',label:'Tipografía'},
  {id:'composition',label:'Composición'}, {id:'resources',label:'Recursos'},
];

/** Fixed schematic: neutral subject only explains placement; every example stays Cutkind. */
function DirectionSample({kind,choice}:{kind:SingleKey | 'referenceAspects';choice:string}) {
  const fullscreen = kind === 'emphasisStyle' && choice === 'fullscreen';
  const composed = (kind === 'emphasisStyle' && choice === 'composed') || (kind === 'presence' && choice === 'visual');
  const diagram = kind === 'resourceStyle' && choice !== 'real';
  const isReference = kind === 'referenceAspects';
  const personX = composed ? 142 : 105;
  return <svg viewBox="0 0 210 112" className={styles.sample} aria-hidden="true" focusable="false">
    <rect width="210" height="112" fill="#efede6"/>
    {!fullscreen && <g fill="#a5a69e"><circle cx={personX} cy="33" r="12"/><path d={`M${personX-26} 85 Q${personX-26} 51 ${personX} 51 Q${personX+26} 51 ${personX+26} 85Z`}/></g>}
    {kind === 'presence' && choice === 'presenter' ? <path d="M63 13H43V87H63M147 13H167V87H147" fill="none" stroke="#20211f" strokeWidth="2"/> : null}
    {(kind === 'resourceStyle' || (kind === 'presence' && choice !== 'presenter')) && <g>
      <rect x="15" y="14" width="67" height="58" rx="4" fill="#fffefa"/>
      {diagram ? <g fill="none" stroke="#20211f" strokeWidth="2"><circle cx="36" cy="33" r="7"/><circle cx="62" cy="52" r="7"/><path d="M41 38L57 47" stroke="#f36b52"/>{choice==='mixed'&&<rect x="26" y="51" width="15" height="11" rx="1" fill="#f36b52" stroke="none"/>}</g> : <g><rect x="25" y="26" width="18" height="33" rx="2" fill="#f36b52"/><path d="M52 29H71M52 39H67M52 49H70" stroke="#20211f" strokeWidth="3"/></g>}
    </g>}
    {(kind === 'readingPace' || kind === 'emphasisStyle' || (kind === 'captionIntent' && choice!=='literal') || isReference) && <g>
      <rect x={composed?9:fullscreen?12:24} y={composed?19:fullscreen?18:48} width={composed?83:fullscreen?186:162} height={composed?54:fullscreen?66:30} rx="4" fill="#fffefa"/>
      <text x={composed?17:fullscreen?105:105} y={composed?42:fullscreen?46:68} textAnchor={composed?'start':'middle'} fill="#20211f" fontFamily="DMSans, sans-serif" fontWeight="700" fontSize={fullscreen?17:13}>{kind==='readingPace'&&choice==='brisk'?'Cada idea':composed?'Cada idea':'Cada idea cuenta'}</text>
      {fullscreen && <text x="105" y="67" textAnchor="middle" fill="#20211f" fontFamily="DMSans, sans-serif" fontSize="17" fontWeight="700">cuenta</text>}
      {composed && <text x="17" y="60" fill="#20211f" fontFamily="DMSans, sans-serif" fontSize="13" fontWeight="700">cuenta</text>}
    </g>}
    {kind === 'framingStyle' && <g stroke="#20211f" fill="none" strokeWidth="1.5"><rect x={choice==='stable'?65:60} y="9" width={choice==='stable'?80:90} height="80" rx="2"/>{choice==='gentle'&&<path d="M67 18H78M67 18V29M143 80H132M143 80V69" stroke="#f36b52" strokeWidth="3"/>}</g>}
    {!(kind === 'captionIntent' && choice === 'key-ideas') && (kind==='captionIntent'?<text x="105" y="103" textAnchor="middle" fill="#20211f" fontFamily="DMSans, sans-serif" fontSize="9">Cada idea cuenta</text>:<rect x="50" y="95" width="110" height="4" rx="2" fill="#20211f"/>)}
    {kind === 'readingPace' && <g fill="#f36b52">{Array.from({length:choice==='calm'?1:choice==='balanced'?2:3},(_,i)=><rect key={i} x={14+i*10} y="97" width="6" height="3"/>)}</g>}
    {isReference && <path d={choice==='rhythm'?'M15 15V33M22 15V33M34 15V33':choice==='typography'?'M15 15H40M27 15V35':choice==='composition'?'M14 14H41V37H14ZM24 14V37':'M15 16H39V35H15ZM20 21L33 30'} fill="none" stroke="#f36b52" strokeWidth="2"/>}
  </svg>;
}

export function EditorialDirectionControls({value,onChange,referenceName}:{value:Preferences;onChange:(patch:Partial<Preferences>)=>void;referenceName?:string}) {
  const id = useId();
  const direction = value.editorial;
  if (!direction) return <section className={styles.legacy} aria-label="Dirección editorial">
    <h2>Tu estilo anterior se conserva</h2>
    <p>Activa los controles nuevos para ajustar presencia, lectura y composición en este encargo. Se mantienen tus letras, colores y recursos excluidos.</p>
    <button type="button" className="button" onClick={()=>onChange({editorial:newEditorialDirection({
      emphasisStyle:value.emphasis_mode==='fullscreen'?'fullscreen':'overlay',
    })})}>Actualizar a estilo nuevo</button>
  </section>;
  const choose = (key:SingleKey, choice:string) => {
    const editorial = {...direction,[key]:choice} as EditorialDirection;
    onChange({editorial,...(key==='emphasisStyle' && value.emphasis_mode!=='none' ? {emphasis_mode:choice==='fullscreen'?'fullscreen':'overlay'} : {})});
  };
  return <section className={styles.controls} aria-label="Dirección editorial">
    <p className={styles.intro}>Ajusta cómo se presenta cada idea. Si falta espacio o un recurso pertinente, adaptamos la composición y dejamos constancia en la revisión.</p>
    {groups.map(group=><fieldset className={styles.group} key={group.key} aria-describedby={`${id}-${group.key}-help`}>
      <legend>{group.title}</legend><p id={`${id}-${group.key}-help`} className={styles.help}>{group.help}</p>
      <div className={styles.choices}>{group.choices.map(choice=><button key={choice.id} type="button" className={styles.choice} aria-pressed={direction[group.key]===choice.id}
        disabled={group.key==='emphasisStyle' && value.emphasis_mode==='none'} onClick={()=>choose(group.key,choice.id)}>
        <DirectionSample kind={group.key} choice={choice.id}/><span className={styles.label}>{choice.label}<span className={styles.check} aria-hidden="true">{direction[group.key]===choice.id?'✓':''}</span></span><span className={styles.description}>{choice.help}</span>
      </button>)}</div>
      {group.key==='emphasisStyle' && value.emphasis_mode==='none' && <p className={styles.help}>Elegiste solo subtítulos. Para añadir titulares, permite momentos de palabras en los recursos visuales.</p>}
      {group.key==='readingPace' && direction.readingPace==='brisk' && direction.emphasisStyle!=='overlay' && <p className={styles.help}>Ajustamos las páginas para que se puedan leer, sin cambiar tu voz.</p>}
      {group.key==='resourceStyle' && value.support_media==='none' && value.graphics==='none' && <p className={styles.help}>Excluiste clips y gráficos: conservamos tu toma y el texto permitido.</p>}
    </fieldset>)}
    <fieldset className={styles.group} aria-describedby={`${id}-reference-help`}>
      <legend>Qué aprender de tu referencia</legend>
      <p id={`${id}-reference-help`} className={styles.help}>{referenceName ? `Referencia: ${referenceName}. Solo se usa como guía; no se copia contenido.` : 'No hay una referencia activa. Añade una en Tu marca y referencias para elegir qué aprender.'}</p>
      <div className={styles.references}>{aspects.map(aspect=><label className={styles.reference} key={aspect.id}>
        <DirectionSample kind="referenceAspects" choice={aspect.id}/><span><input type="checkbox" disabled={!referenceName} checked={direction.referenceAspects.includes(aspect.id)} onChange={event=>onChange({editorial:{...direction,referenceAspects:event.target.checked?[...direction.referenceAspects,aspect.id]:direction.referenceAspects.filter(item=>item!==aspect.id)}})}/>{aspect.label}</span>
      </label>)}</div>
      <p className={styles.help}>Se aplican solo los patrones observados que marques en Tu marca y referencias. Elegir estos aspectos no aprueba patrones ni cambia tus letras o colores.</p>
    </fieldset>
    <p className={styles.help}>Ilustraciones fijas de composición. El resultado depende de tu grabación y de los recursos que permitas.</p>
  </section>;
}
