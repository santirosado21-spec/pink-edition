"use client";
import {EditorialFamilyPicker} from './EditorialFamilyPicker';
import {FontPicker} from './FontPicker';
import {VisualResourcePicker} from './VisualResourcePicker';
import {StylePreview} from './StylePreview';
import labStyles from './StylePreview.module.css';
import type {Preferences} from '../../src/preferences';
export function StyleQuestionnaire({value,onChange}:{value:Preferences;onChange:(patch:Partial<Preferences>)=>void}) {
  return (
        <div className={labStyles.layout}><div className={labStyles.controls}>
        <EditorialFamilyPicker value={value} onChange={onChange} />
        <label className="field-label">Frecuencia de apoyos<select className="field" value={value.vibe} onChange={e => onChange({ vibe: e.target.value as Preferences["vibe"] })}><option value="clean">Espaciados: mínimo 12 s · hasta 1 clip</option><option value="balanced">Equilibrados: mínimo 8 s · hasta 2 clips</option><option value="dynamic">Frecuentes: mínimo 6 s · hasta 4 clips</option></select></label>
        <FontPicker value={value.font} onChange={font => onChange({ font })} />
        <label className="field-label">Subtítulos<select className="field" value={value.captions ?? "pink"} onChange={e => onChange({ captions: e.target.value as Preferences["captions"] })}><option value="pink">Frases blancas</option><option value="keyword">Palabra clave</option><option value="karaoke">Karaoke</option></select></label>
        <details className={labStyles.optionalPreview}><summary>Ver ejemplos de estilo</summary><StylePreview value={value}/></details>
        <label className="field-label">Color para el video (hexadecimal)<input type="text" pattern="#[0-9a-fA-F]{6}" maxLength={7} className="field" value={value.brand_color} onChange={e => onChange({ brand_color: e.target.value })} /></label>
        <p className="muted">Este color se aplica al video exportado. El cuestionario y sus imágenes conservan la paleta de Cutkind.</p>
        {!value.editorialFamilyId && <label className="field-label">Transiciones<select className="field" value={value.transition} onChange={e => onChange({ transition: e.target.value as Preferences["transition"] })}><option value="punch">Acercamiento</option><option value="flash">Destello</option></select></label>}
        {value.editorialFamilyId && <p className="muted">Las transiciones siguen la familia elegida: enfoque suave, barrido o acercamiento breve. Conservan el audio y la duración de tus tomas.</p>}
        <p className="muted">La frecuencia limita los apoyos; no cambia la velocidad de tu voz. Los gráficos cuidan el rostro y los subtítulos. El texto a pantalla completa sustituye temporalmente la imagen cuando tú lo eliges.</p>
        <VisualResourcePicker value={value} onChange={onChange}/>
        </div></div>
  );
}
