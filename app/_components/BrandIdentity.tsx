'use client';
import { useEffect, useId, useState } from 'react';
import type { BrandKit } from '../../src/brandKit';
import { ColorPicker } from './ColorPicker';

const MEMORY_KEY = 'cutkind-brand-kit-v1';
export function BrandIdentity({ kit, onChange, color, onColor, onBusy }: {
  kit: BrandKit | null; onChange: (kit: BrandKit | null) => void; color: string; onColor: (color: string) => void; onBusy: (busy: boolean) => void;
}) {
  const id = useId();
  const [working, setWorking] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const analyzing = kit?.analysis?.state === 'running';
  useEffect(() => {
    let stopped = false;
    async function restore() {
      try {
        const saved = JSON.parse(localStorage.getItem(MEMORY_KEY) ?? 'null');
        if (saved?.id && /^[a-f0-9-]{36}$/.test(saved.id)) {
          const response = await fetch(`/api/local-brand?id=${encodeURIComponent(saved.id)}`, { cache: 'no-store' });
          const data = await response.json();
          if (!response.ok) throw Error(data.error);
          if (!stopped) {
            onChange(data);
          }
        }
        if (!stopped && typeof saved?.color === 'string' && /^#[0-9a-f]{6}$/i.test(saved.color) && !new URLSearchParams(window.location.search).has('style')) onColor(saved.color);
      } catch { if (!stopped) setError('No se pudo recuperar tu marca guardada. Puedes volver a cargar los archivos.'); }
      finally { if (!stopped) setLoaded(true); }
    }
    void restore(); return () => { stopped = true; };
  }, [onChange, onColor]);
  useEffect(() => {
    if (!loaded) return;
    try {
      if (remember) localStorage.setItem(MEMORY_KEY, JSON.stringify({ id: kit?.id ?? null, color }));
      else if (!remember) localStorage.removeItem(MEMORY_KEY);
    } catch { setError('El navegador no permite recordar esta marca. Tus archivos siguen disponibles en este encargo.'); }
  }, [kit, color, remember, loaded]);
  useEffect(() => { onBusy(working || !!analyzing || !loaded); return () => onBusy(false); }, [working, analyzing, loaded, onBusy]);
  useEffect(() => {
    if (!kit || !analyzing) return;
    let stopped = false;
    const timer = setInterval(() => {
      void fetch(`/api/local-brand?id=${kit.id}`, { cache: 'no-store' }).then(async response => {
        const data = await response.json(); if (!response.ok) throw Error(data.error);
        if (!stopped) { onChange(data); setError(''); }
      }).catch(() => { if (!stopped) setError('No se pudo consultar el análisis. Se reintentará automáticamente.'); });
    }, 2000);
    return () => { stopped = true; clearInterval(timer); };
  }, [kit?.id, analyzing, onChange]);
  async function upload(file: File, kind: 'logo' | 'reference') {
    setWorking(true); setError('');
    try {
      const maximum = (kind === 'logo' ? 10 : 300) * 1024 * 1024;
      if (file.size > maximum) throw Error(kind === 'logo' ? 'El logo admite hasta 10 MB.' : 'La referencia admite hasta 300 MB.');
      let current = kit;
      if (!current) {
        const response = await fetch('/api/local-brand', { method: 'POST' });
        const data = await response.json(); if (!response.ok) throw Error(data.error);
        current = data as BrandKit; onChange(current);
      }
      const response = await fetch(`/api/local-brand?kind=${kind}&name=${encodeURIComponent(file.name)}`, { method: 'PUT', headers: { 'x-cutkind-brand': current.id }, body: file });
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      onChange(data);
    } catch (failure) { setError((failure as Error).message); }
    finally { setWorking(false); }
  }
  async function change(action: string, extra: Record<string, unknown> = {}) {
    if (!kit) return;
    setWorking(true); setError('');
    try {
      const response = await fetch('/api/local-brand', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-cutkind-brand': kit.id }, body: JSON.stringify({ action, ...extra }) });
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      onChange(data);
    } catch (failure) { setError((failure as Error).message); }
    finally { setWorking(false); }
  }
  return <section className="brand-identity" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>Tu marca y referencias</h2>
    <p>Enséñanos los colores de tu marca y el estilo de un video que ya te gusta. Todo es opcional.</p>
    <ColorPicker value={color} onChange={onColor} colors={kit?.logo?.colors} />
    <div className="brand-upload-grid">
      <fieldset><legend>Tu logo</legend>
        <p>Extraemos sus colores para que puedas elegirlos. El logo no se coloca en el video.</p>
        <label className="field-label" htmlFor={`${id}-logo`}>Subir logo · PNG, JPG o WebP, hasta 10 MB</label>
        <input id={`${id}-logo`} type="file" accept="image/png,image/jpeg,image/webp" disabled={working || !loaded || analyzing} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file, 'logo'); event.target.value = ''; }} />
        {kit?.logo && <div className="brand-logo-receipt"><img src={`/api/local-brand?id=${kit.id}&logo=1&v=${kit.logo.id}`} alt="Tu logo de marca" width={120} height={90} /><p>{kit.logo.name}</p><button type="button" className="button" disabled={working || analyzing} onClick={() => void change('remove-logo')}>Quitar logo</button></div>}
      </fieldset>
      <fieldset><legend>Video anterior de referencia</legend>
        <p>Sube un video editado que represente tu estilo. Se analiza como referencia; no se mezcla con las grabaciones del encargo.</p>
        <label className="field-label" htmlFor={`${id}-reference`}>Subir referencia · MP4, MOV o WebM, hasta 3 min y 300 MB</label>
        <input id={`${id}-reference`} type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" disabled={working || !loaded || analyzing} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file, 'reference'); event.target.value = ''; }} />
        {kit?.reference && <>
          <p>{kit.reference.name} · {kit.reference.seconds?.toFixed(1)} s</p>
          <p className="muted">Sol revisará fotogramas mediante tu sesión de ChatGPT. También medimos cambios visuales y niveles de sonido en este Mac. No identificamos canciones ni copiamos efectos automáticamente.</p>
          {kit.analysis?.state !== 'ready' && <button type="button" className="button primary" disabled={working || analyzing} onClick={() => void change('analyze')}>{analyzing ? 'Analizando referencia…' : 'Analizar mi referencia'}</button>}
          <button type="button" className="button" disabled={working || analyzing} onClick={() => void change('remove-reference')}>Quitar referencia</button>
        </>}
      </fieldset>
    </div>
    {working && <p role="status">Guardando tu marca…</p>}
    {analyzing && <p role="status">Revisando el estilo de tu video. Puede tardar unos minutos.</p>}
    {kit?.analysis?.state === 'failed' && <p className="notice" role="alert">{kit.analysis.error}</p>}
    {kit?.analysis?.state === 'ready' && <div className="brand-patterns">
      <h3>Qué aprendimos de tu referencia</h3>
      <p>{kit.analysis.reason}</p>
      {kit.analysis.evidence && <details><summary>Movimiento y sonido de la referencia</summary>
        <p>Cambios visuales destacados: {kit.analysis.evidence.picture.strongChangeSeconds.length ? kit.analysis.evidence.picture.strongChangeSeconds.map(t => `${t.toFixed(1)} s`).join(', ') : 'no se detectaron cambios fuertes'}.</p>
        <p className="muted">Un cambio puede ser una transición, movimiento de cámara o iluminación. Estas mediciones no se convierten en preferencias automáticamente.</p>
        <p>{!kit.analysis.evidence.audio.present ? 'La referencia no tiene pista de audio.' : kit.analysis.evidence.audio.integratedLufs == null ? 'La pista no tiene un nivel de sonido medible.' : `Nivel de sonido: ${kit.analysis.evidence.audio.integratedLufs.toFixed(1)} LUFS. Momento con mayor energía: ${kit.analysis.evidence.audio.loudestSeconds?.toFixed(1)} s.`}</p>
      </details>}
      {kit.analysis.measurementError && <p className="notice">{kit.analysis.measurementError}</p>}
      {!kit.analysis.patterns?.length && <p>No encontramos patrones de edición suficientemente claros. Puedes probar con otro video ya editado.</p>}
      {kit.analysis.patterns?.map((pattern, index) => <div key={`${kit.reference?.id}-${index}`}>
        <label><input type="checkbox" checked={kit.selected.includes(index)} disabled={working || pattern.implementation !== 'available'} onChange={event => void change('select', { referenceId: kit.reference?.id, selected: event.target.checked ? [...kit.selected, index] : kit.selected.filter(i => i !== index) })} /> {pattern.name}{pattern.implementation === 'available' ? ' · Recordar este patrón' : ' · Observado, aún no disponible'}</label>
        <p>{pattern.description}</p><p className="muted">Observado en {pattern.evidenceSeconds.map(seconds => `${seconds.toFixed(1)} s`).join(', ')}.</p>
      </div>)}
      <p className="muted">Solo se usan los patrones que marques. Tus elecciones del cuestionario tienen prioridad.</p>
      {!!kit.analysis.patterns?.length && <p className="muted">En el estilo nuevo, los patrones que marques aquí se aplican cuando también eliges su aspecto en «Afinar estilo». Esto incluye subtítulos, titulares, composición y recursos. Confirmar un encargo congela estas decisiones para ese video.</p>}
    </div>}
    <label className="brand-remember"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /> Recordar mi marca, color y patrones elegidos en este navegador para próximos encargos</label>
    <p className="muted">Los archivos se guardan en este Mac. Puedes quitar el logo o la referencia de tu marca en cualquier momento.</p>
    {error && <p className="notice" role="alert">{error}</p>}
  </section>;
}
