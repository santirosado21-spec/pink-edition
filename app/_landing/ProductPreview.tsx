"use client";
import { useState } from "react";
import { LandingRings, LandingSpeaker } from "./Illustration";

const modes = ["Subtítulos", "Corte de color", "Fondo y tarjeta"];
export default function ProductPreview() {
  const [mode, setMode] = useState(0);
  return (
    <div className="product-preview">
      <div className="preview-top">
        <span>Tu próxima idea / 9:16</span>
        <span className="status-label">Demostración ilustrada</span>
      </div>
      <div className="preview-layout">
        <div
          className={`preview-phone preview-mode-${mode}`}
          role="img"
          aria-label={`Ejemplo ilustrado de ${modes[mode]}: Dale espacio a tus ideas. No es un video real.`}
        >
          <LandingRings />
          {mode === 2 && (
            <div className="idea-card">
              <span aria-hidden="true">✳</span>Una idea.
              <br />
              Tu voz.
            </div>
          )}
          <LandingSpeaker />
          <div className="illustrated-caption">
            Dale espacio
            <br />a tus <span>ideas.</span>
          </div>
          {mode === 1 && (
            <div className="color-frame">
              Dale espacio
              <br />a tus <span>ideas.</span>
            </div>
          )}
        </div>
        <div className="preview-controls">
          <p className="eyebrow">UNA FRASE, TU INTENCIÓN</p>
          <p className="sample-phrase">
            «Dale espacio
            <br />a tus ideas.»
          </p>
          <p>Explora cómo puede verse una frase de tu grabación.</p>
          <div
            className="mode-buttons"
            role="group"
            aria-label="Estilo de la ilustración"
          >
            {modes.map((name, index) => (
              <button
                key={name}
                type="button"
                aria-pressed={mode === index}
                onClick={() => setMode(index)}
              >
                <span aria-hidden="true">{["Aa", "↗", "▧"][index]}</span>
                {name}
              </button>
            ))}
          </div>
          <p className="preview-disclaimer">
            Ilustración sin audio. Estos controles solo cambian este ejemplo.
          </p>
        </div>
      </div>
      <div className="illustrated-timeline" aria-hidden="true">
        <span>VOZ</span>
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
