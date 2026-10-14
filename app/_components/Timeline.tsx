"use client";

import { useEffect, useRef, useState } from "react";

export type Lane = "cuts" | "cards" | "backgrounds" | "zooms";
export type Block = { id: string; group: Lane; label: string; theme: string; start: number; duration: number };

const LANES: { group: Lane; name: string }[] = [
  { group: "cuts", name: "Cortes" },
  { group: "cards", name: "Tarjetas" },
  { group: "backgrounds", name: "Fondos" },
  { group: "zooms", name: "Zooms" },
];
const GUTTER = 74;
const MIN_FRAMES = 10;

type Drag = { id: string; group: Lane; mode: "move" | "resize"; x: number; start: number; duration: number; began: boolean };

// Línea de tiempo: arrastrar un bloque lo mueve, arrastrar su borde derecho cambia su duración.
export const Timeline: React.FC<{
  blocks: Block[];
  total: number;
  fps: number;
  now: number;
  selected: string | null;
  onSeek: (frame: number) => void;
  onSelect: (id: string | null) => void;
  onBegin: () => void;
  onMove: (group: Lane, id: string, start: number) => void;
  onResize: (group: Lane, id: string, duration: number) => void;
}> = ({ blocks, total, fps, now, selected, onSeek, onSelect, onBegin, onMove, onResize }) => {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [width, setWidth] = useState(600);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);

  const perFrame = (Math.max(200, width - GUTTER) / total) * zoom;
  const seconds = Math.ceil(total / fps);
  const step = seconds > 60 ? 10 : 5;

  const seekFrom = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onSeek(Math.round(Math.min(total - 1, Math.max(0, (event.clientX - rect.left) / perFrame))));
  };

  const grab = (event: React.PointerEvent<HTMLElement>, block: Block, mode: Drag["mode"]) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: block.id, group: block.group, mode, x: event.clientX, start: block.start, duration: block.duration, began: false };
    onSelect(block.id);
  };
  const dragMove = (event: React.PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current) return;
    const delta = Math.round((event.clientX - current.x) / perFrame);
    // El historial guarda un paso sólo cuando el gesto de verdad cambia algo.
    if (!current.began && delta !== 0) { current.began = true; onBegin(); }
    if (current.mode === "move") onMove(current.group, current.id, Math.min(total - current.duration, Math.max(0, current.start + delta)));
    else onResize(current.group, current.id, Math.min(total - current.start, Math.max(MIN_FRAMES, current.duration + delta)));
  };
  const drop = () => { drag.current = null; };

  return (
    <div className="tl-wrap">
      <div className="tl-bar">
        <span className="muted">Línea de tiempo · arrastra un bloque para moverlo, su borde derecho para cambiar la duración</span>
        <span className="tl-zoom">
          <button className="button" onClick={() => setZoom(Math.max(1, zoom / 1.5))} disabled={zoom <= 1} aria-label="Alejar">−</button>
          <button className="button" onClick={() => setZoom(Math.min(6, zoom * 1.5))} aria-label="Acercar">＋</button>
        </span>
      </div>
      <div className="tl-scroll" ref={box}>
        <div className="tl" style={{ width: GUTTER + total * perFrame }}>
          <div className="tl-ruler" style={{ marginLeft: GUTTER }} onPointerDown={seekFrom}>
            {Array.from({ length: Math.floor(seconds / step) + 1 }, (_, index) => (
              <span key={index} className="tick" style={{ left: index * step * fps * perFrame }}>{index * step}s</span>
            ))}
          </div>
          {LANES.map((lane) => (
            <div className="tl-lane" key={lane.group}>
              <span className="tl-name">{lane.name}</span>
              <div className="tl-track" style={{ width: total * perFrame }} onPointerDown={(event) => { onSelect(null); seekFrom(event); }}>
                {blocks.filter((block) => block.group === lane.group).map((block) => (
                  <div
                    key={block.id}
                    className={`tl-block${selected === block.id ? " on" : ""}`}
                    style={{ left: block.start * perFrame, width: Math.max(14, block.duration * perFrame), "--mark": `var(--${block.theme})` } as React.CSSProperties}
                    title={block.label}
                    onPointerDown={(event) => grab(event, block, "move")}
                    onPointerMove={dragMove}
                    onPointerUp={drop}
                    onPointerCancel={drop}
                  >
                    <span>{block.label}</span>
                    <i
                      className="tl-grip"
                      onPointerDown={(event) => grab(event, block, "resize")}
                      onPointerMove={dragMove}
                      onPointerUp={drop}
                      onPointerCancel={drop}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="tl-head" style={{ left: GUTTER + now * perFrame }} />
        </div>
      </div>
    </div>
  );
};
