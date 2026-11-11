import type {EditorialReviewEntry, OneShotEdit} from '../../src/oneShotEdit';
import styles from './EditorialReviewPanel.module.css';

const reasons: Record<string,string> = {
  'Resource excluded by questionnaire':'Excluiste este tipo de apoyo en el cuestionario.',
  'Maximum event budget reached':'Ya se alcanzó el máximo de apoyos permitido.',
  'Invalid source sentence':'No se pudo vincular la propuesta con una frase de tu grabación.',
  'B-roll anchor absent from exact source words':'El clip no tenía un punto de entrada vinculado a tus palabras.',
  'Minimum spacing between support events':'Se dejó más espacio entre apoyos para no saturar la edición.',
  'Display too short or overlapping an accepted event':'El apoyo duraba demasiado poco o coincidía con otro ya aplicado.',
  'Graphic labels are not literal excerpts':'Los textos del gráfico no coincidían con tus palabras.',
  'No licensed, visually relevant media candidate accepted':'No se encontró un clip pertinente con licencia comprobada.',
  'Literal support accepted within temporal and questionnaire limits':'El apoyo coincide con tus palabras y respeta tus elecciones y el tiempo disponible.',
  'Labels must be literal text excerpts':'El texto propuesto no era un extracto literal de tu grabación.',
  'Selected headline or anchor is not a literal excerpt':'El titular o su punto de entrada no coincidían con tus palabras.',
  'Every graphic label must be copied literally from the sentence':'Algún texto del gráfico no coincidía con tus palabras.',
  'Exact source word timing missing for selected excerpt':'No se pudo confirmar el instante exacto de las palabras elegidas.',
  'Icon meaning absent from the exact literal excerpt':'El icono no representaba algo nombrado en las palabras elegidas.',
  'No display interval before the next event or scene boundary':'No había tiempo suficiente antes del siguiente apoyo o cambio de toma.',
};
const kinds: Record<string,string> = {card:'Titular',steps:'Lista de ideas',compare:'Comparación',broll:'Clip de apoyo',icon:'Icono'};
const finite = (value:unknown): value is number => typeof value==='number' && Number.isFinite(value) && value>=0;
const entries = (value:unknown): EditorialReviewEntry[] => Array.isArray(value) ? value.filter((item):item is EditorialReviewEntry=>!!item && typeof item==='object' && !Array.isArray(item)) : [];

/** Translate internal reasons without exposing implementation details or local file paths. */
export function editorialReviewReason(value:unknown):string {
  const reason=typeof value==='string'?value.trim():'';
  if(reasons[reason]) return reasons[reason];
  if(/reserved|reserve|free band|layout|face measurement|framing|caption space/i.test(reason)) {
    if(/landscape/i.test(reason)) return 'En este formato horizontal, reservamos zonas separadas para la persona, el apoyo y los subtítulos.';
    if(/missing|unavailable|unmeasured/i.test(reason)) return 'No pudimos medir un espacio libre junto al rostro. Separamos a la persona, el apoyo y los subtítulos.';
    return 'El apoyo no cabía en el espacio previsto. Adaptamos la composición para separar a la persona, el apoyo y los subtítulos.';
  }
  if(/Reading budget/i.test(reason)) return 'El texto dispone de menos tiempo del estimado para leerlo. Revisa su legibilidad; se mantienen tus palabras y tu voz.';
  // Director reasons are normally Spanish. Unknown technical/English messages get a useful neutral explanation.
  if(reason.length<=450 && !/[\\/`]|https?:|\b(?:frames?|ASR|overlay|fullscreen|stock|traceback|error|exception)\b/i.test(reason) && /\b(?:el|la|los|las|un|una|para|porque|con|del|explica|ilustra|idea|palabras|discurso)\b/i.test(reason)) return reason;
  return 'Revisa la relación de este apoyo con tus palabras en la vista previa.';
}

export function EditorialReviewPanel({edit}:{edit:OneShotEdit}) {
  if(edit.editorialVersion!==1) return null;
  const review=edit.editorialReview;
  const applied=Array.isArray(edit.beats)?edit.beats:[];
  if(!review || review.version!==1) return <section className={styles.panel} aria-label="Revisión editorial">
    <h3>Revisión editorial</h3><p>El detalle de las propuestas todavía no está disponible. Hay {applied.length} apoyos en esta edición.</p>
    <p className="muted">Aprobación estética pendiente: mira y escucha el video completo.</p>
  </section>;
  const proposals=entries(review.proposals);
  const rejected=proposals.filter(item=>item.status==='rejected');
  const unapplied=proposals.filter(item=>item.status==='accepted' && !applied.some(beat=>beat.id===item.beatId));
  const warnings=entries(review.warnings);
  const seconds=(frames:number)=>(frames/edit.fps).toFixed(1);
  const start=(item:EditorialReviewEntry)=>finite(item.from) && edit.fps>0 ? `En ${seconds(item.from)} s. ` : '';
  const warningText=(item:EditorialReviewEntry)=>{
    const scope=typeof item.beatId==='string' && !applied.some(beat=>beat.id===item.beatId)?'Propuesta sin aplicar. ':'';
    if(finite(item.requiredFrames) && finite(item.frames) && edit.fps>0) return `${scope}${start(item)}Tiempo de lectura estimado: necesita ${seconds(item.requiredFrames)} s y dispone de ${seconds(item.frames)} s. ${scope?'Este apoyo no aparece en la edición actual.':'Conservamos el texto literal y tu voz; revisa su legibilidad.'}`;
    return scope+start(item)+editorialReviewReason(item.reason);
  };
  return <section className={styles.panel} aria-label="Revisión editorial">
    <h3>Revisión editorial</h3>
    <dl className={styles.counts}>
      <div><dt>Propuestos</dt><dd>{proposals.length}</dd></div>
      <div><dt>Aplicados</dt><dd>{applied.length}</dd></div>
      <div><dt>Descartados</dt><dd>{rejected.length}</dd></div>
    </dl>
    {edit.resourcePolicy==='relevant-only' && <p className={styles.note}>{applied.length===0?'Esta edición conserva tu grabación sin apoyos adicionales. ':''}Los apoyos son opcionales: puede haber cero sin que eso sea un fallo técnico.</p>}
    <p className={styles.approval}>Aprobación estética pendiente: mira y escucha el video completo. Esta revisión explica decisiones; no aprueba el resultado visual.</p>
    {warnings.length>0 && <details className={styles.details}><summary>Ver avisos de lectura y composición ({warnings.length})</summary>
      <ul>{warnings.map((item,index)=><li key={index}>{warningText(item)}</li>)}</ul>
    </details>}
    {(proposals.length>0 || applied.length>0) && <details className={styles.details}><summary>Ver apoyos aplicados y descartados</summary>
      {applied.length>0 && <><h4>Aplicados en esta edición</h4><ul>{applied.map(beat=>{
        const decision=proposals.find(item=>item.status==='accepted' && item.beatId===beat.id);
        return <li key={beat.id}><strong>{kinds[beat.kind] ?? 'Apoyo'}</strong>{edit.fps>0?` · ${seconds(beat.from)} s`:''}. {editorialReviewReason(decision?.reason ?? beat.reason)}</li>;
      })}</ul></>}
      {rejected.length>0 && <><h4>Descartados antes de componer</h4><ul>{rejected.map((item,index)=><li key={index}><strong>{typeof item.kind==='string'?kinds[item.kind] ?? 'Apoyo':'Apoyo'}</strong>. {editorialReviewReason(item.reason)}</li>)}</ul></>}
      {unapplied.length>0 && <p>{unapplied.length} propuestas registradas como aceptadas no aparecen en la composición actual. Revisa el resultado antes de exportar.</p>}
    </details>}
  </section>;
}
