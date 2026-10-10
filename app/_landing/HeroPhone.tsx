"use client";

import { useEffect, useState } from "react";
import { Scene, type SceneProps } from "./Scene";

const SCENES: { name: string; hint: string; words: string[]; props: SceneProps }[] = [
  { name: "Captions", hint: "Cada palabra aparece cuando la dices.", words: ["Uno", "de cada", "cuatro", "pacientes"], props: {} },
  { name: "Detrás de ti", hint: "Tarjetas y fondos van detrás de tu silueta, nunca encima.", words: ["que van", "al doctor"], props: { card: true } },
  { name: "Corte de color", hint: "Tu frase clave ocupa toda la pantalla.", words: [], props: { cut: "ENFERMEDAD", tone: "red" } },
  { name: "Fondo", hint: "El fondo acompaña lo que estás diciendo.", words: ["modo de", "emergencia"], props: { dim: true, rings: true } },
];
const STEPS = 8;

// Demo animada del producto: avanza sola y se puede elegir una escena.
export function HeroPhone() {
  const [tick, setTick] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStill(true); setTick(STEPS - 1); return; }
    const timer = setInterval(() => setTick((value) => value + 1), 420);
    return () => clearInterval(timer);
  }, []);

  const index = Math.floor(tick / STEPS) % SCENES.length;
  const scene = SCENES[index];
  const shown = Math.min(scene.words.length, (tick % STEPS) + 1);

  return (
    <div className="hero-phone">
      <div className="phone" role="img" aria-label={`Demostración ilustrada: ${scene.name}. ${scene.hint}`}>
        <i className="phone-notch" />
        <Scene {...scene.props} words={scene.words} shown={shown} />
        <span className="demo-tag">Demo ilustrada</span>
      </div>
      <div className="scene-tabs" role="tablist" aria-label="Escenas de la demostración">
        {SCENES.map((item, i) => (
          <button key={item.name} role="tab" aria-selected={i === index} className={i === index ? "on" : ""} onClick={() => { setTick(i * STEPS); }}>
            {item.name}
          </button>
        ))}
      </div>
      <p className="scene-hint" aria-live="polite">{still ? "Elige una escena para verla." : scene.hint}</p>
    </div>
  );
}
