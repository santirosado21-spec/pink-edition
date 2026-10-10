"use client";

import { useState } from "react";
import { landingConfig } from "./config";
import { Scene } from "./Scene";

// Comparador de antes y después. Con rutas en config.demo usa video real; si no, una ilustración.
export function Compare() {
  const [position, setPosition] = useState(50);
  const demo = landingConfig.demo;
  const real = Boolean(demo.original && demo.edited);

  return (
    <figure className="compare-figure">
      <div className="compare" style={{ "--pos": `${position}%` } as React.CSSProperties}>
        <div className="compare-layer">
          {real ? <video src={demo.original ?? undefined} muted loop playsInline autoPlay /> : <Scene />}
          <span className="compare-label left">Original</span>
        </div>
        <div className="compare-layer edited">
          {real ? <video src={demo.edited ?? undefined} muted loop playsInline autoPlay /> : <Scene words={["Uno", "de cada", "cuatro"]} shown={3} card />}
          <span className="compare-label right">Editado</span>
        </div>
        <i className="compare-bar" aria-hidden="true"><b>⇆</b></i>
        <input type="range" min={0} max={100} value={position} onChange={(event) => setPosition(Number(event.target.value))} aria-label="Comparar original y editado" />
      </div>
      <figcaption>{real ? "Mueve la barra para comparar." : "Mueve la barra para comparar. Ilustración: aquí irá una demo real cuando tengamos una autorizada para publicar."}</figcaption>
    </figure>
  );
}
