"use client";

import type { PlayerRef } from "@remotion/player";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BackgroundEvent, CardEvent, CutEvent, Plan } from "../../src/edit";
import type { Job, JobStatus } from "../_lib/jobs";
import { statusLabel } from "./stages";

const Preview = dynamic(() => import("./Preview"), { ssr: false, loading: () => <div className="preview-loading">Cargando vista previa…</div> });

type Group = "cuts" | "cards" | "backgrounds";
type AnyEvent = CutEvent | CardEvent | BackgroundEvent;
type Word = { id: string; text: string; frame: number; clip: number; until: number };

const THEMES: Record<string, string> = { base: "Base (azul)", health: "Salud (verde)", stress: "Estrés (rojo)" };
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
  const playerRef = useRef<PlayerRef | null>(null);

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
    }, 150);
    return () => clearInterval(timer);
  }, [words]);

  useEffect(() => {
    if (status.state !== "running") return;
    const timer = setInterval(async () => {
      const next = await (await fetch(`/api/jobs/${id}?status`)).json();
      setStatus(next.status);
      setHasOutput(next.hasOutput);
      if (next.status.state !== "running") {
        const job = (await (await fetch(`/api/jobs/${id}`)).json()) as Job;
        setQc(job.qc);
        setBusy(null);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [id, status.state]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(timer);
  }, [toast]);

  const seek = (frame: number) => playerRef.current?.seekTo(Math.max(0, frame));
  const change = (next: Plan) => {
    setPlan(next);
    setDirty(true);
  };
  const update = (group: Group, eventId: string, patch: Partial<AnyEvent>) =>
    change({ ...plan, [group]: (plan[group] as AnyEvent[]).map((event) => (event.id === eventId ? { ...event, ...patch } : event)) });
  const remove = (group: Group, eventId: string) => change({ ...plan, [group]: (plan[group] as AnyEvent[]).filter((event) => event.id !== eventId) });

  const pick = (index: number, extend: boolean) => {
    setSelection(extend && selection ? [Math.min(selection[0], index), Math.max(selection[1], index)] : [index, index]);
    if (!extend) seek(words[index].frame);
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
    const dropped = (body.dropped ?? []) as string[];
    setToast(`Propuesta lista, sin guardar. ${body.notes ?? ""}${dropped.length > 0 ? ` Descartados por las reglas: ${dropped.join(" ")}` : ""}`);
  };

  const props = useMemo(() => ({ style, plan, timeline, media }), [style, plan, timeline, media]);
  const running = status.state === "running";
  const quote = selection ? words.slice(selection[0], selection[1] + 1).map((word) => word.text).join(" ") : null;

  return (
    <div className="editor">
      <div className="topbar">
        <Link href="/app" className="brand"><img src="/logo.png" alt="" /><b>Pink<span>.ai</span></b></Link>
        <span className="muted">/</span>
        <span className="title">{id}</span>
        <span className={`chip ${status.state}`}><i className="dot" />{statusLabel(status)}</span>
        {dirty && <span className="chip">Cambios sin guardar</span>}
        <span className="spacer" />
        <button className="button ghost" onClick={propose} disabled={running || busy !== null}>✦ Proponer con IA</button>
        <button className="button" onClick={save} disabled={!dirty || running || busy !== null}>{busy === "Guardando…" ? busy : "Guardar"}</button>
        <button className="button primary" onClick={render} disabled={running || busy !== null}>{running ? "Renderizando…" : "Renderizar"}</button>
        {hasOutput && !running && <a className="button" href={`/api/jobs/${id}/download`}>↓ Descargar MP4</a>}
      </div>

      <div className="workspace">
        <div className="stage">
          <div className="frame"><Preview props={props} playerRef={playerRef} /></div>
          <div className="muted">Vista previa en vivo · {clock(timeline.duration_frames, fps)} · versión {plan.version}</div>
        </div>

        <div className="column">
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
                  const classes = ["word", index === nowIndex && "now", selection && index >= selection[0] && index <= selection[1] && "selected", mark?.cut && "cut", mark?.card && "card"].filter(Boolean).join(" ");
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

        <div className="column">
          {warnings.length > 0 && (
            <div className="warnings">
              <b>Avisos de las guías de edición</b>
              <ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </div>
          )}
          <h3 className="section" style={{ margin: "0 0 12px" }}>Elementos ({items.length})</h3>
          {items.length === 0 && <div className="empty">Sin elementos: el video sale con captions y sonidos de corte. Elige una frase para agregar el primero.</div>}
          {items.map(({ group, event, start }) => (
            <div className="item" key={event.id} style={{ "--mark": `var(--${event.theme})` } as React.CSSProperties}>
              <header onClick={() => seek(start + Math.min(14, event.duration_frames - 1))}>
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
          {qc && (
            <>
              <h3 className="section">Último render</h3>
              <div className="qc">{qc}</div>
            </>
          )}
          {status.state === "failed" && status.error && <div className="notice">{status.error}</div>}
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
