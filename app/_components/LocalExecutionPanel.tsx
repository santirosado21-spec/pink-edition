'use client';
import { useEffect, useState, useRef } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { OneShotVideo } from '../../src/OneShotVideo';
import type { LocalRun, OneShotEdit } from '../../src/oneShotEdit';
export function LocalExecutionPanel({ sessionId, sources, onBusy }: { sessionId: string; sources: { id: string; name: string }[]; onBusy: (busy: boolean) => void }) {
  const player = useRef<PlayerRef>(null);
  const [order, setOrder] = useState<string[]>([...sources].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).map(s => s.id));
  const [run, setRun] = useState<LocalRun | null>(null);
  const [edit, setEdit] = useState<OneShotEdit | null>(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const busy = starting || run?.state === 'running' || run?.state === 'exporting';
  const signature = sources.map(s => s.id).join(',');
  useEffect(() => { setOrder(previous => [...previous.filter(id => sources.some(s=>s.id===id)), ...sources.filter(s=>!previous.includes(s.id)).map(s=>s.id)]); }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onBusy(busy); return () => onBusy(false); }, [busy, onBusy]);
  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      try {
        const response = await fetch('/api/local-intake/run', { headers: { 'x-cutkind-session': sessionId }, cache: 'no-store' });
        const data = await response.json(); if (!response.ok) throw Error(data.error);
        if (!stopped) { setRun(data.run); setEdit(data.edit); setError(''); }
      } catch (failure) { if (!stopped) setError((failure as Error).message); }
    };
    void poll(); const timer = setInterval(() => void poll(), 3000);
    return () => { stopped = true; clearInterval(timer); };
  }, [sessionId, signature]);
  const execute = async (action: 'edit' | 'export') => {
    setStarting(true);setError('');
    try {
      const response = await fetch('/api/local-intake/run', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cutkind-session': sessionId }, body: JSON.stringify({ order, action }) });
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      setRun(data); if(action==='edit') setEdit(null);
    } catch (failure) { setError((failure as Error).message); }
    finally { setStarting(false); }
  };
  const base = `/api/local-intake/media?session=${sessionId}`;
  return <section aria-label="Edición local">
    <h2>Crear la edición</h2>
    <p>Las grabaciones se unen en este orden, conservando toda la voz. Puedes ordenarlas antes de comenzar.</p>
    <ol>{order.map((id,index)=><li key={id} style={{ marginBottom: 8 }}>{sources.find(s=>s.id===id)?.name}
      <button type="button" className="button" aria-label={`Subir ${sources.find(s=>s.id===id)?.name} en el orden`} disabled={busy || index===0} onClick={()=>setOrder(ids=>{const next=[...ids];[next[index-1],next[index]]=[next[index],next[index-1]];return next;})}>↑</button>
      <button type="button" className="button" aria-label={`Bajar ${sources.find(s=>s.id===id)?.name} en el orden`} disabled={busy || index===order.length-1} onClick={()=>setOrder(ids=>{const next=[...ids];[next[index+1],next[index]]=[next[index],next[index+1]];return next;})}>↓</button>
    </li>)}</ol>
    <button type="button" className="button" disabled={busy} onClick={()=>setOrder([...sources].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).map(s=>s.id))}>Ordenar por nombre</button>
    <button type="button" className="button primary" disabled={busy || !sources.length} onClick={()=>void execute('edit')}>{busy ? 'Procesando…' : edit ? 'Volver a generar edición' : 'Crear edición local'}</button>
    {run && <p role="status">{run.stage}</p>}
    {busy && <p className="muted">Puedes usar otras aplicaciones. Mantén el Mac encendido y el servidor local activo; esta ejecución protege los temporales hasta terminar.</p>}
    {(error || run?.error) && <p role="alert" className="notice">{error || run?.error}</p>}
    {edit && <>
      <h2>{edit.issues.length ? 'Vista previa con pendientes' : 'Vista previa de tu edición'}</h2>
      <Player ref={player} key={edit.scenes.map(s=>s.id).join('-') + edit.beats.length} component={OneShotVideo} inputProps={{ edit, mediaBase: base, onMediaError: message => { player.current?.pause(); setError(message); } }} compositionWidth={edit.width} compositionHeight={edit.height} durationInFrames={edit.frames} fps={edit.fps} controls style={{ width:'100%', maxHeight:600 }} />
      <h3>Tomas incluidas · {edit.scenes.length} de {sources.length}</h3>
      {sources.some(s => !edit.scenes.some(scene => scene.id === s.id)) && <p role="alert">Faltan tomas en esta edición. Vuelve a generarla antes de exportar.</p>}
      <ol>{edit.scenes.map(scene => <li key={scene.id}><button type="button" className="button" onClick={() => { player.current?.seekTo(scene.from); player.current?.play(); }}>Ver {scene.name} · {(scene.from / edit.fps).toFixed(1)}–{((scene.from + scene.frames) / edit.fps).toFixed(1)} s</button></li>)}</ol>
      <p>Duración: {(edit.frames / edit.fps).toFixed(1)} s. Se recortan márgenes y pausas internas largas sin voz, conservando las palabras y las pausas breves.</p>
      <p>{edit.beats.filter(b=>b.kind==='card').length} tarjetas · {edit.beats.filter(b=>b.kind==='steps'||b.kind==='compare').length} gráficos · {edit.beats.filter(b=>b.kind==='broll' && b.mediaType!=='image').length} clips B-roll · {edit.beats.filter(b=>b.mediaType==='image').length} imágenes · Música {edit.music ? 'incluida' : 'pendiente'}</p>
      {edit.editorialNotes?.length ? <ul>{edit.editorialNotes.map(note=><li key={note}>{note}</li>)}</ul> : null}
      {edit.issues.length>0 && <ul>{edit.issues.map(issue=><li key={issue}>{issue}</li>)}</ul>}
      <details><summary>Decisiones y procedencia de recursos</summary><ul>{edit.beats.map(beat=><li key={beat.id}>{(beat.from/edit.fps).toFixed(1)} s · {beat.kind}: {beat.reason}<br/>«{beat.quote}»</li>)}</ul><ul>{edit.assets.map(asset=><li key={asset.file}>{asset.author} · {asset.license} · {asset.source.startsWith('https://') ? <a href={asset.source} target="_blank" rel="noreferrer">Fuente</a> : asset.source}</li>)}</ul></details>
      <p className="muted">Los controles verifican recursos y separación del rostro. Revisa la pertinencia y los subtítulos antes de exportar.</p>
      <button type="button" className="button primary" disabled={busy || edit.issues.length>0 || sources.some(s => !edit.scenes.some(scene => scene.id === s.id))} onClick={()=>void execute('export')}>Exportar MP4</button>
      {run?.state==='exported' && <a className="button primary" href={`${base}&asset=final.mp4&download=1`}>Descargar video editado</a>}
    </>}
  </section>;
}
