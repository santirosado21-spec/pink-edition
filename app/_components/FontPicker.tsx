'use client';
import { useEffect, useState } from 'react';
import { catalog, type Preferences } from '../../src/preferences';
import { editorFont, loadEditorFont } from '../../src/editorFonts';
export function FontPicker({ value, onChange, accent: _accent }: { value: Preferences['font']; onChange: (font: Preferences['font']) => void; accent?: string }) {
  const [ready, setReady] = useState(false), [error, setError] = useState(false);
  const selected = editorFont(value), caption = editorFont(value, true);
  const [category, setCategory] = useState('all');
  const choices = catalog.fonts.filter(font => category === 'all' || (category === 'pairs' ? Boolean(font.captionFile) : !font.captionFile));
  useEffect(() => { let active = true; Promise.all(catalog.fonts.flatMap(font => [loadEditorFont(font.id), loadEditorFont(font.id, '', true)])).then(() => { if (active) setReady(true); }).catch(() => { if (active) setError(true); }); return () => { active = false; }; }, []);
  return <fieldset style={{ border: 0, padding: 0, margin: '24px 0', minWidth: 0 }}>
    <legend style={{ fontWeight: 700, fontSize: 22 }}>2. Elige la letra de tu video</legend>
    <p className="muted">Elige una fuente o una pareja para tus títulos y subtítulos. Las muestras usan las mismas fuentes que tu video.</p>
    {error ? <p role="alert">No se pudieron cargar las fuentes. Recarga la página para verlas.</p> : !ready ? <p role="status">Cargando muestras de tipografía…</p> : <>
      <label className="field-label">Explorar letras<select className="field" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Todas las opciones ({catalog.fonts.length})</option><option value="pairs">Parejas de título y subtítulo</option><option value="single">Una misma familia tipográfica</option></select></label>
      <div role="radiogroup" aria-label="Tipografía" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 12 }}>
        {choices.map(font => <button type="button" role="radio" aria-label={font.title} aria-checked={selected.id === font.id} key={font.id} onClick={() => onChange(font.id as Preferences['font'])} style={{ textAlign: 'left', padding: 20, borderRadius: 16, border: `2px solid ${selected.id === font.id ? 'var(--coral)' : 'var(--line)'}`, background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', minWidth: 0 }}>
          <span data-font-sample={font.id} style={{ display: 'block', fontFamily: editorFont(font.id).family, fontWeight: font.weight, fontStyle: font.fontStyle ?? 'normal', fontSize: 26, lineHeight: 1.2, minHeight: 76 }}>Tu historia.<br />A tu manera.</span>
          <strong style={{ display: 'block', marginTop: 14 }}>{font.title}{selected.id === font.id ? ' ✓' : ''}</strong>
          <span style={{ display: 'block', fontSize: 13, marginTop: 6, opacity: .75 }}>{font.description}</span>
        </button>)}
      </div>

      <p className="muted">Elegida: {selected.title}. {selected.description}</p>
      <div aria-label="Muestra de subtítulos" data-selected-font={selected.id} style={{ marginTop: 16, padding: 24, borderRadius: 16, background: 'var(--panel-2)', color: 'var(--text)', textAlign: 'center', fontFamily: caption.family, fontWeight: caption.weight, fontSize: 28, lineHeight: 1.45 }}>
        Cada historia tiene <span style={{ background: 'var(--coral)', color: '#20211f', padding: '2px 6px', borderRadius: 4 }}>su propio ritmo.</span>
        <div style={{ marginTop: 12, fontSize: 20 }}>Así se ven las tildes: edición, México, mañana.</div>
      </div>
    </>}
  </fieldset>;
}
