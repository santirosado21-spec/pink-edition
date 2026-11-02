'use client';
import {useState} from 'react';
import {Brand} from './Brand';
import {ThemePicker} from './ThemePicker';
import {StyleQuestionnaire} from './StyleQuestionnaire';
import {DEFAULT_PREFERENCES,type Preferences} from '../../src/preferences';
import {styleSelectionUrl} from '../../src/styleSelection';
export function StylePlayground() {
  const [prefs,setPrefs]=useState<Preferences>({...DEFAULT_PREFERENCES,editorialFamilyId:'enlace',font:'documentary',captions:'keyword',brand_color:'#f36b52',transition:'punch'});
  return <main className="quiz"><header><Brand href="/app"/><ThemePicker/></header><h1>Encuentra tu forma de editar</h1><p><a className="button" href="/app?new=1">Empezar cuestionario desde cero →</a></p><p className="lead">Compara estilos, letras y efectos con imágenes fijas. Después podrás usarlos en tu propio video.</p><StyleQuestionnaire value={prefs} onChange={patch=>setPrefs(previous=>({...previous,...patch}))}/>{/^#[0-9a-f]{6}$/i.test(prefs.brand_color)?<p><a className="button primary" href={styleSelectionUrl(prefs)}>Empezar un nuevo encargo con esta combinación →</a></p>:<p role="alert">Escribe un color hexadecimal completo para el video, por ejemplo #f36b52.</p>}<p className="muted">Esta elección pasa al cuestionario. No modifica ediciones anteriores.</p></main>;
}
