"use client";
import { useEffect, useRef, useState } from "react";
import { LocalExecutionPanel } from "./LocalExecutionPanel";
import {editorialFamily} from "../../src/editorialRecipes";
import {StyleQuestionnaire} from "./StyleQuestionnaire";
import {readStyleSelection} from "../../src/styleSelection";
import { editorFont } from "../../src/editorFonts";
import { Brand } from "./Brand";
import { ThemePicker } from "./ThemePicker";
import { catalog, type Preferences } from "../../src/preferences";
import { checkOneShotBrief, type OneShotBrief } from "../../src/oneShotBrief";

import {INTAKE_PRESETS, quickPreferences, QUICK_OBJECTIVE, QUICK_AUDIENCE} from '../../src/intakePresets';
import {ResourceSample} from './ResourceSample';
import labStyles from './StylePreview.module.css';

type Readiness = { ready: boolean; missing: string[]; error: string; uploadAllowed: boolean; sessionId: string; expiresAt: number };
const moods = { calm: "Tranquila", energetic: "Energética", documentary: "Documental", cinematic: "Cinematográfica" };
export function LocalIntake({ initial }: { initial: Preferences | null }) {
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<Preferences>({...quickPreferences(),...initial,topic:initial?.topic || quickPreferences().topic,transition:initial?.transition && initial.transition!=='none'?initial.transition:'punch'});
  const [objective, setObjective] = useState(QUICK_OBJECTIVE);
  const [audience, setAudience] = useState(QUICK_AUDIENCE);
  const [musicMood, setMusicMood] = useState<OneShotBrief["musicMood"]>('documentary');
  const [musicSource, setMusicSource] = useState<OneShotBrief["musicSource"]>('licensed-library');
  const [brollSource, setBrollSource] = useState<OneShotBrief["brollSource"]>('licensed-library');
  const [resourcePolicy, setResourcePolicy] = useState<NonNullable<OneShotBrief["resourcePolicy"]>>("relevant-only");
  const [notes, setNotes] = useState("");
  const [executing, setExecuting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  useEffect(() => { if (readiness && !readiness.sessionId) setReadiness(null); }, [readiness]);
  const [progress, setProgress] = useState<number | null>(null);
  const [received, setReceived] = useState<{ id: string; name: string; seconds: number; preview: string }[]>([]);
  const [currentFile, setCurrentFile] = useState("");
  const previews = useRef<string[]>([]);
  const uploading = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => { previews.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  useEffect(() => {
    if (readiness?.sessionId) sessionStorage.setItem('cutkind-session', readiness.sessionId);
  }, [readiness]);
  useEffect(() => {
    const search = new URL(window.location.href).search;
    if (new URLSearchParams(search).get('new') === '1') {
      setPrefs(quickPreferences());
      return; // Start a new questionnaire without resuming or deleting the previous session.
    }
    const choice = readStyleSelection(search);
    if (choice) { setPrefs(previous=>({...previous,...choice})); return; }
    const id = new URL(window.location.href).searchParams.get('session') || sessionStorage.getItem('cutkind-session'); if (!id) return;
    let stopped = false;
    void fetch('/api/local-intake/run', { headers: { 'x-cutkind-session': id } }).then(async response => {
      if (!response.ok) { if(response.status===410) sessionStorage.removeItem('cutkind-session'); return; }
      const { session } = await response.json(); if (stopped) return;
      const brief = session.brief;
      setObjective(brief.objective); setAudience(brief.audience); setPrefs(brief.preferences);
      setMusicMood(brief.musicMood); setMusicSource(brief.musicSource); setBrollSource(brief.brollSource); setNotes(brief.resourceNotes); setResourcePolicy(brief.resourcePolicy ?? "showcase");
      setReceived((session.sources ?? []).map((source: { id: string; name: string; seconds: number })=>({...source,preview:''})));
      setReadiness({ ready:true, missing:[], error:'', uploadAllowed:true, sessionId:id, expiresAt:session.expiresAt }); setStep(3);
    }).catch(()=>{});
    return () => { stopped = true; };
  }, []);
  const set = (value: Partial<Preferences>) => setPrefs(p => ({ ...p, ...value }));
  const discard = async () => {
    if (readiness) {
      const response = await fetch("/api/local-intake", { method: "DELETE", headers: { "x-cutkind-session": readiness.sessionId } });
      if (!response.ok) throw new Error("No se pudo descartar la sesión. Inténtalo de nuevo.");
    }
    sessionStorage.removeItem("cutkind-session");
    setReadiness(null); setReceived([]);
    previews.current.forEach(url => URL.revokeObjectURL(url)); previews.current = [];
  };
  const back = async () => {
    setBusy(true); setError("");
    try { await discard(); setStep(0); window.history.replaceState(null, "", "/app?new=1"); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  };
  const upload = async (files: File[]) => {
    if (!readiness?.uploadAllowed || uploading.current) return;
    uploading.current = true;
    setError(""); setProgress(0);
    const failures: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        setCurrentFile(`${index + 1} de ${files.length}: ${file.name}`); setProgress(0);
        if (!file.size) { failures.push(`${file.name}: el archivo está vacío.`); continue; }
        try {
          const data = await new Promise<{ source: { id: string; name: string; seconds: number } }>((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.open("PUT", `/api/jobs/upload?name=${encodeURIComponent(file.name)}`);
            request.setRequestHeader("x-cutkind-session", readiness.sessionId);
            request.upload.onprogress = event => { if (event.lengthComputable) setProgress(event.loaded / event.total); };
            request.onload = () => {
              try {
                const body = JSON.parse(request.responseText);
                if (request.status >= 400) return reject(new Error(body.error));
                resolve(body);
              } catch { reject(new Error("Respuesta de subida inválida.")); }
            };
            request.onerror = () => reject(new Error("Se cortó la conexión. Vuelve a seleccionar este archivo para reintentarlo."));
            request.onabort = () => reject(new Error("Subida cancelada."));
            request.send(file);
          });
          const preview = URL.createObjectURL(file); previews.current.push(preview);
          setReceived(previous => [...previous, { ...data.source, preview }]);
        } catch (failure) { failures.push(`${file.name}: ${(failure as Error).message}`); }
      }
    } finally {
      uploading.current = false; setProgress(null); setCurrentFile(""); setError(failures.join(" "));
    }
  };
  const submit = async () => {
    if (busy) return;
    setError("");
    
    const brief = { version: 1, objective, audience, preferences: prefs, musicMood, musicSource, brollSource: prefs.support_media === 'none' ? 'licensed-library' : brollSource, resourceNotes: notes, resourcePolicy, confirmed: true };
    const errors = checkOneShotBrief(brief);
    if (errors.length) return setError(errors.join(" "));
    if (step === 0) { setStep(3); window.scrollTo(0, 0); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/local-intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(brief) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setReadiness(data);
      if (data.sessionId) window.history.replaceState(null, "", "/app?session=" + encodeURIComponent(data.sessionId));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo comprobar el encargo."); }
    finally { setBusy(false); }
  };
  return <main className="quiz">
    <header><Brand href="/app" /><span className="muted">Preguntas antes de subir · {step === 0 ? 1 : 2} de 2</span><ThemePicker /></header>
    <div className="progress" aria-hidden="true">{[0, 3].map(i => <i key={i} className={i <= step ? "on" : ""} />)}</div>
    <p className="muted">Elige y confirma antes de subir. Los archivos se procesan en este Mac; Sol revisa texto y muestras mediante tu sesión de ChatGPT.</p>
    <form onSubmit={event => { event.preventDefault(); void submit(); }}>
      {step === 0 && <section>
        <h1>Elige cómo editarlo</h1>
        <p className="lead">Elige un estilo y confirma. Puedes continuar con la selección actual; escribir es opcional.</p>
        <div className={labStyles.presetGrid} aria-label="Ediciones predeterminadas">
          {INTAKE_PRESETS.map(preset => {
            const selected=Object.entries(preset.preferences).every(([key,value])=>JSON.stringify(prefs[key as keyof Preferences])===JSON.stringify(value)) && musicMood===preset.musicMood;
            return <div key={preset.id}><button type="button" className={labStyles.presetChoice} aria-pressed={selected} onClick={()=>{set(preset.preferences);setMusicMood(preset.musicMood);setResourcePolicy('relevant-only');setMusicSource('licensed-library');setBrollSource('licensed-library');}}><strong>{preset.title}{preset.id==='explain'?' · Recomendado':''}</strong><span>{preset.description}</span></button>
              <details className={labStyles.optionalPreview}><summary>Ver imagen: {preset.title}</summary><ResourceSample value={{...prefs,...preset.preferences}} kind={preset.id==='clean'?'captions':preset.id==='impact'?'fullscreen':'compare'}/></details></div>;
          })}
        </div>
        <p className="muted">Siempre conservamos toda tu voz, el orden y el fondo original. La música instrumental está incluida. Los apoyos son máximos por video, nunca cuotas.</p>
        <p><button className="button primary" type="submit" disabled={busy}>Revisar mis elecciones →</button></p>
        <details className={labStyles.optionalPreview}><summary>Personalizar letras, gráficos y efectos</summary><StyleQuestionnaire value={prefs} onChange={set}/></details>
        <details className={labStyles.optionalPreview}><summary>Ajustar música y recursos</summary>
        <label className="field-label">Carácter de la música<select className="field" value={musicMood} onChange={e=>setMusicMood(e.target.value as OneShotBrief['musicMood'])}>{Object.entries(moods).map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label>
        <label className="field-label">Efectos de sonido<select className="field" value={prefs.sfx} onChange={e=>set({sfx:e.target.value as Preferences['sfx']})}><option value="soft">Suaves</option><option value="full">Presentes</option><option value="none">Sin efectos; conservar música</option></select></label>
        <label className="field-label">Carácter de los sonidos<select className="field" value={prefs.sound_pack ?? 'soft'} onChange={e=>set({sound_pack:e.target.value as Preferences['sound_pack']})}>{catalog.sounds.map(pack=><option key={pack.id} value={pack.id}>{pack.title}</option>)}</select></label>
        <label className="field-label">¿Qué debemos evitar? (opcional)<textarea className="field" rows={2} maxLength={600} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
        <p className="muted">Solo buscamos clips con licencia si los permites. Las láminas son imágenes fijas de clips revisados; fotos propias y cambios de fondo aún no están disponibles.</p>
        </details>
        <details className={labStyles.optionalPreview}><summary>Añadir contexto o cambiar idioma</summary>
        <label className="field-label">¿Qué debe entender o sentir quien vea el video?<textarea className="field" maxLength={300} rows={3} value={objective} onChange={e => setObjective(e.target.value)} /></label>
        <label className="field-label">¿A quién va dirigido?<input className="field" maxLength={300} value={audience} onChange={e => setAudience(e.target.value)} /></label>
        <label className="field-label">Tema del video<input className="field" maxLength={80} value={prefs.topic} onChange={e => set({ topic: e.target.value })} /></label>
        <label className="field-label">Marca o creador<input className="field" maxLength={80} value={prefs.brand_name ?? ""} onChange={e => set({ brand_name: e.target.value })} /></label>
        <label className="field-label">Idioma<select className="field" value={prefs.language ?? "mixed"} onChange={e => set({ language: e.target.value as Preferences["language"] })}><option value="es">Español</option><option value="en">English</option><option value="mixed">Español + English</option></select></label>
        <label className="field-label">Nombres o términos que debemos reconocer<input className="field" maxLength={300} value={prefs.vocabulary ?? ""} onChange={e => set({ vocabulary: e.target.value })} /></label>
        </details>
        <p><a href="/muestras">Explorar el catálogo de imágenes →</a></p>
      </section>}
      {step === 3 && <section>
        <h1>Este es el encargo</h1>
        <dl className="summary">
          <div><dt>Objetivo</dt><dd>{objective}</dd></div><div><dt>Audiencia</dt><dd>{audience}</dd></div>
          <div><dt>Recursos</dt><dd>{resourcePolicy === "relevant-only" ? "Edición natural" : "Prueba de catálogo"}</dd></div>
          <div><dt>Gráficos</dt><dd>{prefs.graphics === 'none' ? 'Sin gráficos' : [prefs.graphic_kinds?.includes('compare') ? 'Comparaciones' : '', prefs.graphic_kinds?.includes('steps') ? 'Listas' : ''].filter(Boolean).join(' · ') || 'Sin gráficos'}</dd></div>
          <div><dt>Imágenes de apoyo</dt><dd>{{auto:'Según la familia',video:'Clips de video',still:'Láminas fijas de clips revisados',none:'Sin imágenes de apoyo'}[prefs.support_media ?? 'auto']}</dd></div>
          <div><dt>Énfasis de palabras</dt><dd>{{overlay:'Sobre la grabación',fullscreen:'Pantalla completa, voz continua',none:'Solo subtítulos'}[prefs.emphasis_mode ?? 'overlay']}</dd></div>
          <div><dt>Fondo de la persona</dt><dd>Conservar el original</dd></div>
          <div><dt>Familia editorial</dt><dd>{editorialFamily(prefs)?.title}</dd></div>
          <div><dt>Subtítulos</dt><dd>{prefs.captions=== "karaoke"?"Karaoke":prefs.captions==="keyword"?"Palabra clave":"Frases blancas"}</dd></div>
          <div><dt>Tipografía</dt><dd>{editorFont(prefs.font).title}</dd></div>
          <div><dt>Sonidos</dt><dd>{prefs.sfx==="none"?"Sin efectos":`${prefs.sfx==="soft"?"Suaves":"Presentes"} · ${catalog.sounds.find(pack=>pack.id===prefs.sound_pack)?.title ?? "Discreto"}`}</dd></div>
          <div><dt>Frecuencia de apoyos</dt><dd>{prefs.vibe === "clean" ? "Separados al menos 12 s" : prefs.vibe === "dynamic" ? "Separados al menos 6 s" : "Separados al menos 8 s"}</dd></div>
          <div><dt>Música</dt><dd>{musicMood ? moods[musicMood] : "Pendiente"} · {musicSource === "own" ? "Tu pista" : "Música instrumental incluida"}</dd></div>
        </dl>
        <ul><li>Música de fondo y voz íntegra.</li>{resourcePolicy === "showcase" ? <><li>Al menos dos énfasis con texto de tu discurso.</li><li>Al menos dos gráficos distintos que expliquen ideas.</li><li>Al menos dos clips B-roll pertinentes.</li></> : <><li>Solo los recursos que permitiste, cuando aporten a lo que dices.</li><li>Tu imagen permanece si no encontramos un recurso pertinente.</li></>}<li>Transiciones entre escenas, sin cortar palabras.</li></ul>
        <p>{resourcePolicy === "showcase" ? "Énfasis y gráficos se cuentan por separado. Si falta un recurso exigido, el resultado queda incompleto." : "Se priorizan claridad, legibilidad y relación con tu discurso. No hay una cuota mínima de imágenes."}</p>
        <p className="muted">La grabación se recibe en una sesión temporal de una hora, fuera de tu biblioteca. Puedes descartarla antes; no se conserva como proyecto.</p>
      </section>}
      {error && <p className="notice" role="alert">{error}</p>}
      {readiness && <section aria-label="Subir grabación">
        <details><summary>Consejos para que la grabación salga mejor</summary><ul><li>Sube el archivo original de cámara, preferiblemente en 1080p o superior.</li><li>Coloca la cámara a la altura de los ojos, con poco espacio sobre la cabeza y sitio en el torso para los textos.</li><li>Busca luz de frente y una voz clara, cerca del micrófono y sin eco fuerte.</li><li>Prepara el encuadre antes de hablar y mantén continuidad entre tomas, salvo que el cambio sea parte de la historia.</li></ul></details>
        <h2>{received.length ? `${received.length} videos recibidos` : "Ahora sube tus videos"}</h2>
        <p>Selecciona varios videos o añade más después. Sin límite fijo de peso ni cantidad; depende del espacio disponible en tu Mac. Admite videos verticales y horizontales, con audio y de hasta 120 segundos cada uno.</p>
        <input ref={fileInput} type="file" multiple accept="video/*,.mov,.mp4,.webm" hidden disabled={progress !== null || executing}
          onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) void upload(files); e.target.value = ""; }} />
        <button className="button primary" type="button" disabled={progress !== null || busy || executing} onClick={() => fileInput.current?.click()}>
          {progress === null ? (received.length ? "Añadir más videos" : "Seleccionar videos") : progress >= 1 ? "Comprobando video…" : `Subiendo… ${Math.round(progress * 100)}%`}
        </button>
        {currentFile && <p role="status">{currentFile}</p>}
        {received.map(source => <div key={source.id}>
          <p role="status">{source.name} · {source.seconds.toFixed(1)} s · Recibido en esta sesión.</p>
          {source.preview && <details><summary>Ver original</summary><video src={source.preview} controls preload="none" aria-label={`Grabación original: ${source.name}`} style={{ width: "100%", maxHeight: 360 }} /></details>}
        </div>)}
        <button className="button" type="button" disabled={busy || progress !== null || executing} onClick={async () => {
          setBusy(true); setError("");
          try { await discard(); } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
        }}>Descartar sesión y videos</button>
        {received.length > 0 && progress === null && <LocalExecutionPanel sessionId={readiness.sessionId} sources={received} onBusy={setExecuting} />}
        <p className="muted">Los temporales se eliminan al descartarlos o tras una hora desde la última subida completada. Una transferencia activa mantiene sus temporales. Si el servidor está apagado, se limpian al volver a utilizarlo.</p>
      </section>}
      <nav className="quiz-nav" style={{ position: "static", marginTop: 32 }}><div>
        {step > 0 && !received.length && <button type="button" className="button" disabled={busy || progress !== null || executing} onClick={() => void back()}>← Atrás</button>}
        {step > 0 && !readiness && <button className="button primary" type="submit" disabled={busy}>{busy ? "Comprobando…" : step < 3 ? "Revisar mis elecciones →" : "Confirmar encargo"}</button>}
      </div></nav>
    </form>
  </main>;
}
