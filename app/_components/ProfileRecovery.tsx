"use client";

import { useState } from "react";
import { StyleQuiz } from "./StyleQuiz";

export function ProfileRecovery({ message, invalid, cloud = false }: { message: string; invalid: boolean; cloud?: boolean }) {
  const [rebuild, setRebuild] = useState(false);
  if (rebuild) return <StyleQuiz initial={null} cloud={cloud} />;
  return <main className="home">
    <h1>Revisa tu estilo</h1>
    <p role="alert" className="notice">{message}</p>
    {invalid && <>
      <p>Puedes rehacer tus preferencias. Tu estilo guardado sólo se sustituirá cuando guardes el cuestionario; los videos anteriores conservan el suyo.</p>
    </>}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {invalid && <button className="button primary" onClick={() => setRebuild(true)}>Rehacer mi estilo</button>}
      <a className="button" href="/estilo">Volver a intentar</a>
    </div>
  </main>;
}
