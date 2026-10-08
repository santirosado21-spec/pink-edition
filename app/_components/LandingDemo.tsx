"use client";

import { useId, useState } from "react";

export function LandingSpeaker() {
  const id = useId();
  return (
    <svg className="speaker-art" viewBox="0 0 300 470" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-skin`} x1="111" y1="103" x2="199" y2="251" gradientUnits="userSpaceOnUse"><stop stopColor="#f8cbd7"/><stop offset="1" stopColor="#ba698a"/></linearGradient>
        <linearGradient id={`${id}-shirt`} x1="72" y1="286" x2="251" y2="471" gradientUnits="userSpaceOnUse"><stop stopColor="#343449"/><stop offset="1" stopColor="#131322"/></linearGradient>
      </defs>
      <path d="M52 470L62 322Q66 286 119 272L178 272Q234 286 239 322L254 470" fill={`url(#${id}-shirt)`}/>
      <path d="M127 239L125 278Q148 302 174 278L169 232" fill={`url(#${id}-skin)`}/>
      <path d="M103 168Q100 115 148 111Q195 112 194 168L186 215Q180 248 149 256Q115 246 109 214Z" fill={`url(#${id}-skin)`}/>
      <path d="M104 186Q91 163 97 133Q103 103 136 100Q158 83 185 111Q210 128 194 184L184 157Q179 143 177 128Q148 157 113 153Z" fill="#272235"/>
      <path d="M108 181Q94 174 100 198L111 210M190 181Q203 174 197 198L186 210" fill="#da94ab"/>
      <path d="M121 185L132 185M167 185L178 185" stroke="#714358" strokeWidth="3" strokeLinecap="round"/>
      <path d="M149 187L145 205L151 206M136 222Q149 228 163 220" stroke="#a4607a" strokeWidth="2" strokeLinecap="round"/>
      <path d="M107 286Q149 324 192 285M93 339L86 468M214 337L226 468" stroke="#626074" strokeOpacity=".5" strokeWidth="2"/>
      <path d="M132 294L145 330L158 301" stroke="#f8cbd7" strokeOpacity=".35" strokeWidth="2"/>
      <rect x="166" y="302" width="9" height="16" rx="4" fill="#0f1021"/><path d="M170 319L175 342" stroke="#0f1021" strokeWidth="2"/>
    </svg>
  );
}

export function LandingRings() {
  return <svg className="rings-art" viewBox="0 0 400 500" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="1"><ellipse cx="200" cy="245" rx="180" ry="103" transform="rotate(-35 200 245)"/><ellipse cx="200" cy="245" rx="180" ry="133" transform="rotate(-35 200 245)"/><ellipse cx="200" cy="245" rx="180" ry="163" transform="rotate(-35 200 245)"/><ellipse cx="200" cy="245" rx="180" ry="193" transform="rotate(-35 200 245)"/></g><circle cx="57" cy="298" r="5" fill="currentColor"/><circle cx="339" cy="144" r="5" fill="currentColor"/></svg>;
}

const modes = ["Captions", "Corte de color", "Detrás de ti"] as const;

export default function LandingDemo() {
  const [mode, setMode] = useState(0);
  const [paused, setPaused] = useState(false);
  return (
    <div className={`product-demo ${paused ? "is-paused" : ""}`}>
      <div className="demo-top"><span className="demo-project"><span className="project-icon">P</span> Mi próximo reel <span className="demo-divider">/</span> <span className="demo-subtle">Editor</span></span><span className="demo-label">DEMO ILUSTRADA</span></div>
      <div className="demo-body">
        <div className="preview-column">
          <div className={`demo-phone mode-${mode}`} role="img" aria-label={`Vista ilustrada: ${modes[mode]}. La frase de ejemplo es Dale espacio a tus ideas.`}>
            <div className="phone-grid"/><LandingRings/>
            <div className="phone-glass"><svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M24 43C24 35 15 33 15 23a17 17 0 0 1 34 0c0 10-9 12-9 20M24 44h16M25 50h14M29 56h6" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M27 27l5 7 5-7M32 34v9" stroke="currentColor" strokeWidth="2"/></svg><span>Una idea.<br/><strong>Tu voz.</strong></span></div>
            <LandingSpeaker/>
            <div className="phone-caption" aria-hidden="true"><span>Dale </span><span>espacio </span><br/><span>a tus </span><span>ideas.</span></div>
            {mode === 1 && <div className="phone-color-cut" aria-hidden="true"><span>DALE<br/>ESPACIO<br/>A TUS<br/><em>IDEAS.</em></span><small>EL MOMENTO ES TUYO</small></div>}
            <span className="phone-corner" aria-hidden="true">9:16</span>
          </div>
          <div className="playback"><button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Reanudar animación de la demo" : "Pausar animación de la demo"} aria-pressed={paused}><svg viewBox="0 0 20 20" aria-hidden="true">{paused ? <path d="M6 3l11 7-11 7z" fill="currentColor"/> : <path d="M6 4v12M14 4v12" stroke="currentColor" strokeWidth="3"/>}</svg></button><span className="playback-track"><i/></span><span>Sin audio</span></div>
        </div>
        <div className="transcript-column">
          <div className="pane-heading"><span>Tu video, en palabras</span><span className="tiny-tag">ES</span></div>
          <p className="transcript-note">Una frase. Muchas formas de contarla.</p>
          <div className="demo-transcript"><span className="take-label">TOMA 01 <span>00:00</span></span><p>No necesitas decir más.<br/>Necesitas que se sienta.</p><span className="take-label">TOMA 02 <span>00:04</span></span><button className="selected-phrase" type="button" onClick={() => setMode(1)} aria-label="Mostrar Dale espacio a tus ideas como corte de color">Dale espacio a tus ideas.<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2l5 19 4-8 8-4z" fill="#f6b3ca" stroke="#181721"/></svg></button></div>
          <div className="demo-tools"><span className="take-label">PRUEBA UN ESTILO</span><div className="mode-buttons" role="group" aria-label="Estilo de la vista previa">{modes.map((name, index) => <button type="button" key={name} aria-pressed={mode === index} onClick={() => setMode(index)}><span className={`mode-symbol symbol-${index}`} aria-hidden="true">{index === 0 ? "Aa" : index === 1 ? "T" : <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="11" height="11" rx="3" stroke="currentColor"/><rect x="7" y="7" width="11" height="11" rx="3" fill="currentColor"/></svg>}</span>{name}</button>)}</div></div>
          <div className="demo-result" aria-live="polite"><span className="result-check">✓</span><div><strong>{["Cada palabra, a su tiempo", "Tu frase ocupa la pantalla", "El gráfico queda detrás de ti"][mode]}</strong><span>{["Captions sincronizados con tu voz.", "Elige el énfasis desde la transcripción.", "Tu rostro y tus captions quedan libres."][mode]}</span></div></div>
        </div>
      </div>
    </div>
  );
}
