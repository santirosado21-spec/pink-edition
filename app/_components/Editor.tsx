"use client";

import type { PlayerRef } from "@remotion/player";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BackgroundEvent, CardEvent, CutEvent, Plan } from "../../src/edit";
import type { Job, JobStatus } from "../_lib/jobs";
import type { Preferences } from "../../src/preferences";
import { STAGE_ORDER, stageName, statusLabel } from "./stages";
import { Timeline, type Block } from "./Timeline";

const Preview = dynamic(() => import("./Preview"), { ssr: false, loading: () => <div className="preview-loading">Cargando vista previa…</div> });

type Group = "cuts" | "cards" | "backgrounds";
type AnyEvent = CutEvent | CardEvent | BackgroundEvent;
type Word = { id: string; text: string; frame: number; clip: number; until: number };

const THEMES: Record<string, string> = { base: "Base (color de marca)", health: "Salud (verde)", stress: "Estrés (rojo)" };
const KINDS: Record<string, string> = {
  patients: "Proporción: uno entre varios",
  emergency: "Alerta y columna que sube",
  risk: "2× con dos barras",
  illness: "Sensación → enfermedad",
  body: "De la cabeza al cuerpo",
  healing: "Recuperación lenta",
  bill: "Recibo / factura",
  compare: "Comparar: una mayor que otra",
  steps: "Tres pasos",
  beforeafter: "Antes → después",
  alert: "Advertencia",
  counter: "Contador (cifra dicha)",
  question: "Pregunta",
};
const MOTIFS: Record<string, string> = { network: "Red de puntos", rings: "Ondas de alarma", crosses: "Cruces médicas" };
const CUT_STYLES: Record<string, string> = { paper: "Papel (fondo claro)", solid: "Sólido (fondo de color)" };
const VIBE_NAMES = { clean: "limpio", balanced: "equilibrado", dynamic: "dinámico" };
const SFX_NAMES = { full: "completo", soft: "suave", none: "sin efectos" };
const CAPTION_NAMES = { pink: "subtítulos clásicos", keyword: "palabra clave", karaoke: "karaoke" };
// Mismo límite que valida el servidor (`MAX_EMPHASIS` en app/_lib/jobs.ts).
const MAX_EMPHASIS = 40;
const NAMES: Record<Group, string> = { cuts: "Corte de color", cards: "Tarjeta", backgrounds: "Fondo" };
// Pisos propuestos en docs/EDITING_GUIDELINES.md; son avisos, no bloqueos.
const MINIMUM: Record<Group, number> = { cuts: 25, cards: 43, backgrounds: 66 };

const clock = (frame: number, fps: number) => {
  const seconds = frame / fps;
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
};

export const Editor: React.FC<{ initial: Job }> = ({ initial }) => {
  const { id, style, timeline, media } = initial;
  const fps = style.fps;
  const [plan, setPlan] = useState<Plan>(initial.plan);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<JobStatus>(initial.status);
  const [hasOutput, setHasOutput] = useState(initial.hasOutput);
  const [qc, setQc] = useState(initial.qc);
  const [selection, setSelection] = useState<[number, number] | null>(null);
  const [theme, setTheme] = useState("base");
  const [nowIndex, setNowIndex] = useState(-1);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<"text" | "items" | "time">("text");
  const [selected, setSelected] = useState<string | null>(null);
  const [nowFrame, setNowFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [profile, setProfile] = useState<Preferences | null>(null);
  const playerRef = useRef<PlayerRef | null>(null);
  // Historial para deshacer y rehacer; cada gesto guarda el plan anterior una vez.
  const planRef = useRef(plan);
  planRef.current = plan;
  const past = useRef<Plan[]>([]);
  const future = useRef<Plan[]>([]);
  const [, bump] = useState(0);

  // Palabras en orden, con su frame en el montaje y hasta dónde llega cada una.
  const words = useMemo(() => {
    const list: Word[] = [];
    timeline.clips.forEach((clip, clipIndex) => {
      clip.words.forEach((word, wordIndex) => {
        const frame = clip.timeline_in_frame + word.source_start_frame - clip.source_in_frame;
        const next = clip.words[wordIndex + 1];
        const until = next ? clip.timeline_in_frame + next.source_start_frame - clip.source_in_frame : clip.timeline_in_frame + clip.duration_frames;
        list.push({ id: word.id, text: word.text, frame, clip: clipIndex, until });
      });
    });
    return list;
  }, [timeline]);
  const indexOf = useMemo(() => new Map(words.map((word, index) => [word.id, index])), [words]);
  const startOf = (event: AnyEvent) => (words[indexOf.get(event.anchor_word_id) ?? 0]?.frame ?? 0) + event.offset_frames;

  const items = useMemo(
    () =>
      (["cuts", "cards", "backgrounds"] as Group[])
        .flatMap((group) => (plan[group] as AnyEvent[]).map((event) => ({ group, event, start: startOf(event) })))
        .sort((a, b) => a.start - b.start),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, words],
  );

  // Qué palabras quedan bajo un corte de color o una tarjeta, para marcarlas.
  const marks = useMemo(() => {
    const map = new Map<number, { cut?: string; card?: string }>();
    for (const { group, event, start } of items) {
      if (group === "backgrounds") continue;
      words.forEach((word, index) => {
        if (word.frame >= start && word.frame < start + event.duration_frames) {
          map.set(index, { ...map.get(index), [group === "cuts" ? "cut" : "card"]: event.theme });
        }
      });
    }
    return map;
  }, [items, words]);

  const warnings = useMemo(() => {
    const list: string[] = [];
    const main = items.filter((item) => item.group !== "backgrounds");
    for (const item of items) {
      if (item.event.duration_frames < MINIMUM[item.group]) {
        list.push(`${NAMES[item.group]} «${item.event.label}» dura ${item.event.duration_frames} frames; menos de ${MINIMUM[item.group]} se lee con dificultad.`);
      }
    }
    main.forEach((a, index) =>
      main.slice(index + 1).forEach((b) => {
        if (a.start < b.start + b.event.duration_frames && b.start < a.start + a.event.duration_frames) {
          list.push(`«${a.event.label}» y «${b.event.label}» coinciden en el tiempo: uno tapa al otro.`);
        }
      }),
    );
    for (const item of items) {
      const crowd = items.filter((other) => other.start >= item.start && other.start < item.start + 300).length;
      if (crowd > 4) {
        list.push(`Hay ${crowd} elementos en 10 s a partir de ${clock(item.start, fps)}; el máximo propuesto es 4.`);
        break;
      }
    }
    return list;
  }, [items, fps]);

  // Sigue la reproducción para resaltar la palabra que suena.
  useEffect(() => {
    const timer = setInterval(() => {
      const frame = playerRef.current?.getCurrentFrame();
      if (frame === undefined) return;
      let found = -1;
      for (let index = 0; index < words.length && words[index].frame <= frame; index++) found = index;
      setNowIndex(found);
      setNowFrame(frame);
      setPlaying(playerRef.current?.isPlaying() ?? false);
    }, 100);
    return () => clearInterval(timer);
  }, [words]);

  useEffect(() => {
    if (status.state !== "running") return;
    const timer = setInterval(async () => {
      const response = await fetch(`/api/jobs/${id}?status`).catch(() => null);
      if (response?.status === 401) return void (window.location.href = "/login");
      // Un fallo pasajero de red no debe romper la pantalla: se reintenta en el siguiente ciclo.
      if (!response?.ok) return;
      const next = await response.json();
      setStatus(next.status);
      setHasOutput(next.hasOutput);
      if (next.status.state !== "running") {
        const detail = await fetch(`/api/jobs/${id}`).catch(() => null);
        if (detail?.ok) setQc(((await detail.json()) as Job).qc);
        setBusy(null);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [id, status.state]);

  // El estilo de la cuenta puede haber cambiado después de subir este video.
  useEffect(() => {
    fetch("/api/profile").then((response) => (response.ok ? response.json() : null)).then((body) => setProfile(body?.preferences ?? null)).catch(() => undefined);
  }, []);

  // El navegador avisa antes de cerrar o recargar con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(timer);
  }, [toast]);

  const seek = (frame: number) => playerRef.current?.seekTo(Math.max(0, frame));
  const record = () => {
    past.current = [...past.current.slice(-49), planRef.current];
    future.current = [];
    bump((count) => count + 1);
  };
  const change = (next: Plan) => {
    record();
    setPlan(next);
    setDirty(true);
  };
  const undo = () => {
    const previous = past.current.pop();
    if (!previous) return;
    future.current.push(planRef.current);
    setPlan(previous);
    setDirty(true);
    bump((count) => count + 1);
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(planRef.current);
    setPlan(next);
    setDirty(true);
    bump((count) => count + 1);
  };

  // Una palabra de anclaje y un desfase para cualquier frame del montaje.
  const wordAt = (frame: number) => {
    let found = 0;
    for (let index = 0; index < words.length && words[index].frame <= frame; index++) found = index;
    return found;
  };
  const anchorFor = (frame: number) => {
    const word = words[wordAt(frame)];
    return { anchor_word_id: word.id, offset_frames: frame - word.frame };
  };
  // Mover y redimensionar actúan en vivo sobre el último plan, sin registrar cada paso.
  const live = (group: Group, eventId: string, build: (event: AnyEvent) => AnyEvent) => {
    const current = planRef.current;
    setPlan({ ...current, [group]: (current[group] as AnyEvent[]).map((event) => (event.id === eventId ? build(event) : event)) });
    setDirty(true);
  };
  const moveBlock = (group: Group, eventId: string, newStart: number) =>
    live(group, eventId, (event) => {
      const delta = newStart - startOf(event);
      const moved = { ...event, ...anchorFor(newStart) } as AnyEvent;
      if (group === "cuts") (moved as CutEvent).last_word_id = words[wordAt(newStart + event.duration_frames - 1)].id;
      if (group === "cards") {
        const beat = (event as CardEvent).beat;
        const beatFrame = (words[indexOf.get(beat.anchor_word_id) ?? 0]?.frame ?? 0) + beat.offset_frames + delta;
        (moved as CardEvent).beat = anchorFor(beatFrame);
      }
      return moved;
    });
  const resizeBlock = (group: Group, eventId: string, duration: number) =>
    live(group, eventId, (event) => {
      const resized = { ...event, duration_frames: duration } as AnyEvent;
      if (group === "cuts") (resized as CutEvent).last_word_id = words[wordAt(startOf(event) + duration - 1)].id;
      return resized;
    });
  const update = (group: Group, eventId: string, patch: Partial<AnyEvent>) =>
    change({ ...plan, [group]: (plan[group] as AnyEvent[]).map((event) => (event.id === eventId ? { ...event, ...patch } : event)) });
  const remove = (group: Group, eventId: string) => {
    change({ ...plan, [group]: (plan[group] as AnyEvent[]).filter((event) => event.id !== eventId) });
    if (selected === eventId) setSelected(null);
  };

  // Atajos: espacio reproduce, flechas avanzan un segundo, ⌘/Ctrl+Z deshace, Supr borra el bloque elegido.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
      // Con un botón enfocado, la barra espaciadora ya lo activa por sí sola.
      if (event.key === " " && ["BUTTON", "A"].includes(target.tagName)) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      else if (modifier && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
      else if (event.key === " ") { event.preventDefault(); playerRef.current?.toggle(); }
      else if (event.key === "ArrowRight") seek((playerRef.current?.getCurrentFrame() ?? 0) + fps);
      else if (event.key === "ArrowLeft") seek((playerRef.current?.getCurrentFrame() ?? 0) - fps);
      else if ((event.key === "Delete" || event.key === "Backspace") && selected) {
        const found = items.find((item) => item.event.id === selected);
        if (found) remove(found.group, selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const pick = (index: number, extend: boolean) => {
    setSelection(extend && selection ? [Math.min(selection[0], index), Math.max(selection[1], index)] : [index, index]);
    if (!extend) seek(words[index].frame);
  };

  // Marca o desmarca las palabras elegidas para el estilo «palabra clave».
  const toggleEmphasis = () => {
    if (!selection) return;
    const ids = words.slice(selection[0], selection[1] + 1).map((word) => word.id);
    const current = new Set(plan.emphasis_word_ids ?? []);
    const next = new Set(current);
    if (ids.every((id) => current.has(id))) ids.forEach((id) => next.delete(id));
    else {
      ids.forEach((id) => next.add(id));
      // Una adición que pase del límite se rechaza entera: el plan no cambia.
      if (next.size > MAX_EMPHASIS) return setToast(`Puedes resaltar hasta ${MAX_EMPHASIS} palabras por video; quita algunas antes de agregar más.`);
    }
    const ordered = words.map((word) => word.id).filter((id) => next.has(id));
    change({ ...plan, emphasis_word_ids: ordered });
    setSelection(null);
  };

  const add = (group: Group) => {
    if (!selection) return;
    const first = words[selection[0]];
    const last = words[selection[1]];
    const phrase = words.slice(selection[0], selection[1] + 1).map((word) => word.text.replace(/[.,:;!?¿¡]/g, "")).join(" ").toLowerCase();
    const base = {
      id: `${group.slice(0, -1)}_${Date.now().toString(36)}`,
      label: phrase.slice(0, 48),
      theme,
      anchor_word_id: first.id,
      offset_frames: 0,
      duration_frames: Math.max(1, last.until - first.frame),
    };
    if (group === "cuts") change({ ...plan, cuts: [...plan.cuts, { ...base, style: "paper", last_word_id: last.id }] });
    if (group === "backgrounds") change({ ...plan, backgrounds: [...plan.backgrounds, { ...base, motif: "network" }] });
    if (group === "cards") {
      // La posición definitiva la calcula el servidor al guardar, sobre la persona.
      const card: CardEvent = { ...base, kind: "patients", top: plan.cards[0]?.top ?? 300, beat: { anchor_word_id: last.id, offset_frames: 0 }, meaning: "" };
      change({ ...plan, cards: [...plan.cards, card] });
    }
    setSelection(null);
  };

  const save = async (): Promise<boolean> => {
    setBusy("Guardando…");
    const response = await fetch(`/api/jobs/${id}/plan`, { method: "PUT", body: JSON.stringify(plan) });
    const body = await response.json();
    setBusy(null);
    if (!response.ok) {
      setToast([body.error, ...(body.errors ?? [])].join(" "));
      return false;
    }
    setPlan(body.plan);
    setDirty(false);
    setToast(`Guardado como versión ${body.plan.version}.`);
    return true;
  };

  const render = async () => {
    if (dirty && !(await save())) return;
    const response = await fetch(`/api/jobs/${id}/render`, { method: "POST" });
    const body = await response.json();
    if (!response.ok) return setToast(body.error);
    setHasOutput(false);
    setStatus({ state: "running", stage: "start", error: null, updated_at: Date.now() / 1000 });
  };

  const propose = async () => {
    setBusy("Proponiendo…");
    const response = await fetch(`/api/jobs/${id}/propose`, { method: "POST" });
    const body = await response.json();
    setBusy(null);
    if (!response.ok) return setToast(body.error);
    change(body.plan);
    setToast(`Propuesta lista, sin guardar. ${body.notes ?? ""}`);
  };

  const props = useMemo(() => ({ style, plan, timeline, media }), [style, plan, timeline, media]);
  // Las marcas del editor usan el color de marca del video, como el render.
  const brand = plan.preferences?.brand_color;
  const brandMarks = (brand ? { "--base": brand, ...(plan.preferences?.context_colors ? {} : { "--health": brand, "--stress": brand }) } : undefined) as React.CSSProperties | undefined;
  const outdated = profile !== null && JSON.stringify(profile) !== JSON.stringify(plan.preferences ?? null);
  const running = status.state === "running";
  const emphasized = useMemo(() => new Set(plan.emphasis_word_ids ?? []), [plan.emphasis_word_ids]);
  const quote = selection ? words.slice(selection[0], selection[1] + 1).map((word) => word.text).join(" ") : null;

  return (
    <div className="editor" data-tab={tab} style={brandMarks}>
      <div className="topbar">
        <Link href="/app" className="brand"><img src="/logo.png" alt="" /><b>Pink<span>.ai</span></b></Link>
        <span className="muted">/</span>
        <span className="title">{id}</span>
        <span className={`chip ${status.state}`}><i className="dot" />{statusLabel(status)}</span>
        {dirty && <span className="chip">Cambios sin guardar</span>}
        <span className="spacer" />
        <button className="button ghost icon" onClick={undo} disabled={past.current.length === 0} title="Deshacer (⌘Z)" aria-label="Deshacer">↶</button>
        <button className="button ghost icon" onClick={redo} disabled={future.current.length === 0} title="Rehacer (⇧⌘Z)" aria-label="Rehacer">↷</button>
        <button className="button ghost" onClick={propose} disabled={running || busy !== null}>✦ Proponer con IA</button>
        <button className="button" onClick={save} disabled={!dirty || running || busy !== null}>{busy === "Guardando…" ? busy : "Guardar"}</button>
        <button className="button primary" onClick={render} disabled={running || busy !== null}>{running ? "Renderizando…" : "Renderizar"}</button>
        {hasOutput && !running && <a className="button" href={`/api/jobs/${id}/download`}>↓ Descargar MP4</a>}
      </div>

      <div className="workspace">
        <div className="stage">
          <div className="frame"><Preview props={props} playerRef={playerRef} /></div>
          <div className="transport">
            <button className="button" onClick={() => playerRef.current?.toggle()} aria-label={playing ? "Pausar" : "Reproducir"}>{playing ? "❚❚" : "▶"}</button>
            <span className="muted">{clock(nowFrame, fps)} / {clock(timeline.duration_frames, fps)} · versión {plan.version}</span>
          </div>
          <div className="tabs" role="tablist">
            {([["text", "Texto"], ["items", `Elementos (${items.length})`], ["time", "Tiempo"]] as const).map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? "on" : ""} onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>
        </div>

        <div className="column col-text">
          <div className="toolbar">
            {quote ? (
              <>
                <div className="quote">«{quote}»</div>
                <select className="button" value={theme} onChange={(event) => setTheme(event.target.value)}>
                  {Object.entries(THEMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
                <button className="button" onClick={() => add("cuts")}>＋ Corte de color</button>
                <button className="button" onClick={() => add("cards")} disabled={!media.person} title={media.person ? "" : "Este video no tiene recorte de la persona"}>＋ Tarjeta</button>
                <button className="button" onClick={() => add("backgrounds")} disabled={!media.person}>＋ Fondo</button>
                <button className="button" onClick={toggleEmphasis} title="Para el estilo de subtítulos «palabra clave»">★ Resaltar</button>
                <button className="button ghost" onClick={() => setSelection(null)}>Cancelar</button>
              </>
            ) : (
              <div className="muted">Haz clic en una palabra para ir a ese momento. Con Mayús + clic eliges la frase completa y le agregas un corte de color, una tarjeta o un fondo.</div>
            )}
          </div>
          <div className="legend">
            <span><b style={{ borderBottom: "2px solid var(--base)" }}>subrayado</b> = corte de color</span>
            <span><b style={{ background: "linear-gradient(transparent 62%, rgba(106,166,255,.4) 62%)" }}>resaltado</b> = tarjeta</span>
          </div>
          {timeline.clips.map((clip, clipIndex) => (
            <div className="take" key={clip.id}>
              <h4>Toma {clipIndex + 1} · {clock(clip.timeline_in_frame, fps)}</h4>
              <div className="words">
                {words.map((word, index) => {
                  if (word.clip !== clipIndex) return null;
                  const mark = marks.get(index);
                  const classes = ["word", index === nowIndex && "now", selection && index >= selection[0] && index <= selection[1] && "selected", mark?.cut && "cut", mark?.card && "card", emphasized.has(word.id) && "emph"].filter(Boolean).join(" ");
                  return (
                    <span key={word.id}>
                      <span className={classes} style={mark ? ({ "--mark": `var(--${mark.cut ?? mark.card})` } as React.CSSProperties) : undefined} onClick={(event) => pick(index, event.shiftKey)}>
                        {word.text}
                      </span>{" "}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="column col-items">
          {(running || status.state === "failed") && (
            <div className="steps-box">
              <h3 className="section" style={{ margin: "0 0 10px" }}>Progreso</h3>
              <ol className="steps">
                {STAGE_ORDER.map((stage, index) => {
                  const current = STAGE_ORDER.indexOf(status.stage);
                  const state = status.state === "failed" && stage === status.stage ? "bad" : index < current ? "done" : index === current ? "now" : "";
                  return <li key={stage} className={state}><i />{stageName(stage)}</li>;
                })}
              </ol>
              {status.state === "running" && !STAGE_ORDER.includes(status.stage) && <div className="muted">{statusLabel(status)}</div>}
            </div>
          )}
          {(plan.preferences || outdated) && (
            <div className="style-box">
              {plan.preferences ? (
                <span className="grow"><i className="dot-color" style={{ background: plan.preferences.brand_color }} /> Estilo de este video: {VIBE_NAMES[plan.preferences.vibe]} · {CAPTION_NAMES[plan.preferences.captions ?? "pink"]} · sonido {SFX_NAMES[plan.preferences.sfx]}</span>
              ) : <span className="grow muted">Este video usa el estilo Pink de origen.</span>}
              {outdated && <button className="button" onClick={() => change({ ...plan, preferences: profile! })}>Usar mi estilo actual</button>}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="warnings">
              <b>Avisos de las guías de edición</b>
              <ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </div>
          )}
          <h3 className="section" style={{ margin: "0 0 12px" }}>Elementos ({items.length})</h3>
          {items.length === 0 && <div className="empty">Sin elementos: el video sale con captions y sonidos de corte. Elige una frase para agregar el primero.</div>}
          {items.map(({ group, event, start }) => (
            <div className={`item${selected === event.id ? " selected" : ""}`} key={event.id} style={{ "--mark": `var(--${event.theme})` } as React.CSSProperties}>
              <header onClick={() => { setSelected(event.id); seek(start + Math.min(14, event.duration_frames - 1)); }}>
                <span className="kind">{NAMES[group]}</span>
                <span className="label">{event.label}</span>
                <span className="time">{clock(start, fps)}</span>
                <button className="remove" title="Quitar" onClick={(click) => { click.stopPropagation(); remove(group, event.id); }}>✕</button>
              </header>
              <div className="fields">
                {group === "cuts" && (
                  <label>Estilo
                    <select value={(event as CutEvent).style} onChange={(change) => update(group, event.id, { style: change.target.value })}>
                      {Object.entries(CUT_STYLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                  </label>
                )}
                {group === "cards" && (
                  <label>Tarjeta
                    <select value={(event as CardEvent).kind} onChange={(change) => update(group, event.id, { kind: change.target.value })}>
                      {Object.entries(KINDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                  </label>
                )}
                {group === "cards" && (event as CardEvent).kind === "counter" && (
                  <label>Cifra dicha
                    <input maxLength={12} value={(event as CardEvent).text ?? ""} placeholder="200" onChange={(change) => update(group, event.id, { text: change.target.value })} />
                  </label>
                )}
                {group === "backgrounds" && (
                  <label>Motivo
                    <select value={(event as BackgroundEvent).motif} onChange={(change) => update(group, event.id, { motif: change.target.value })}>
                      {Object.entries(MOTIFS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                  </label>
                )}
                <label>Color
                  <select value={event.theme} onChange={(change) => update(group, event.id, { theme: change.target.value })}>
                    {Object.entries(THEMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </label>
                <label>Duración (frames)
                  <input type="number" min={1} value={event.duration_frames} onChange={(change) => update(group, event.id, { duration_frames: Math.max(1, Math.round(Number(change.target.value)) || 1) })} />
                </label>
                <label>Dura
                  <input value={`${(event.duration_frames / fps).toFixed(1)} s`} readOnly />
                </label>
              </div>
            </div>
          ))}
          <h3 className="section">Pedir un cambio</h3>
          <div className="ask" aria-disabled="true">
            <input disabled placeholder="«Baja los efectos de sonido», «quita ese gráfico»…" aria-label="Pedir un cambio con tus palabras" />
            <span className="chip">Próximamente</span>
          </div>
          {qc && (
            <>
              <h3 className="section">Último render</h3>
              <div className="qc">{qc}</div>
            </>
          )}
          {status.state === "failed" && status.error && <div className="notice">{status.error}</div>}
        </div>
      </div>
      <div className="dock">
        <Timeline
          blocks={items.map(({ group, event, start }) => ({ id: event.id, group, label: event.label, theme: event.theme, start, duration: event.duration_frames })) as Block[]}
          total={timeline.duration_frames}
          fps={fps}
          now={nowFrame}
          selected={selected}
          onSeek={seek}
          onSelect={setSelected}
          onBegin={record}
          onMove={moveBlock}
          onResize={resizeBlock}
        />
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
