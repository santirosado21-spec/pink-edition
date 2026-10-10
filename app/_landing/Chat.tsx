"use client";

import { useEffect, useRef, useState } from "react";

const MESSAGES: { from: "me" | "pink"; text: string }[] = [
  { from: "me", text: "Baja los efectos de sonido." },
  { from: "pink", text: "Listo, ahora acompañan sin tapar tu voz." },
  { from: "me", text: "Quita ese gráfico." },
  { from: "pink", text: "Quitado. El resto queda igual." },
  { from: "me", text: "Mantén todo lo que digo y corta solo las pausas." },
  { from: "pink", text: "Hecho: tus palabras siguen en el mismo orden." },
  { from: "me", text: "Usa la misma tipografía en todo el video." },
  { from: "pink", text: "Ya está: una sola letra, del principio al final." },
];

// Conversación de ejemplo: los mensajes aparecen de a uno al entrar en pantalla.
export function Chat() {
  const box = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(MESSAGES.length);

  useEffect(() => {
    const element = box.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setCount(0);
    let timer: ReturnType<typeof setInterval> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || timer) return;
      timer = setInterval(() => setCount((value) => { if (value >= MESSAGES.length && timer) clearInterval(timer); return Math.min(MESSAGES.length, value + 1); }), 900);
    }, { threshold: 0.35 });
    observer.observe(element);
    return () => { observer.disconnect(); if (timer) clearInterval(timer); };
  }, []);

  return (
    <div className="chat" ref={box} role="log" aria-label="Conversación de ejemplo">
      <span className="chat-tag">Demostración</span>
      {MESSAGES.slice(0, count).map((message, index) => (
        <p key={index} className={`bubble ${message.from}`}>{message.text}</p>
      ))}
      <div className="chat-input" aria-hidden="true"><span>Escribe qué quieres cambiar…</span><b>↑</b></div>
    </div>
  );
}
