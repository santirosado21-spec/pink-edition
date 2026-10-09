"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { JobSummary } from "../_lib/jobs";
import { statusLabel } from "./stages";

export const Home: React.FC<{ initial: JobSummary[]; online?: boolean }> = ({ initial, online }) => {
  const [jobs, setJobs] = useState(initial);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const busy = jobs.some((job) => job.status.state === "running");

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(async () => setJobs(await (await fetch("/api/jobs")).json()), 3000);
    return () => clearInterval(timer);
  }, [busy]);

  // XMLHttpRequest y no fetch: es lo que informa el avance de la subida.
  const upload = (file: File) => {
    setError(null);
    setProgress(0);
    const request = new XMLHttpRequest();
    request.open("PUT", `/api/jobs/upload?name=${encodeURIComponent(file.name)}`);
    request.upload.onprogress = (event) => setProgress(event.loaded / event.total);
    request.onload = async () => {
      setProgress(null);
      if (request.status >= 400) setError(JSON.parse(request.responseText).error ?? "No se pudo subir el video.");
      setJobs(await (await fetch("/api/jobs")).json());
    };
    request.onerror = () => {
      setProgress(null);
      setError("Se cortó la conexión durante la subida.");
    };
    request.send(file);
  };

  return (
    <main className="home">
      <header>
        <Link href="/" className="brand"><img src="/logo.png" alt="" /><b>Pink<span>.ai</span></b></Link>
        <div className="muted">Sube tu reel o TikTok y recíbelo editado.</div>
      </header>

      <div
        className={`drop${over ? " over" : ""}`}
        onClick={() => input.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => { event.preventDefault(); setOver(false); const file = event.dataTransfer.files[0]; if (file) upload(file); }}
      >
        <h2>{progress === null ? "Arrastra tu video aquí" : `Subiendo… ${Math.round(progress * 100)}%`}</h2>
        <div className="muted">Vertical, una persona hablando a cámara. Transcribimos, cortamos silencios y recortamos a la persona; tarda unos minutos.</div>
        {progress !== null && <div className="bar"><i style={{ width: `${progress * 100}%` }} /></div>}
        <input ref={input} type="file" accept="video/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); event.target.value = ""; }} />
      </div>
      {online && <div className="notice">Esta es la versión en línea: todavía no procesa videos. La edición funciona por ahora sólo en el equipo local.</div>}
      {error && <div className="notice">{error}</div>}

      <h3 className="section">Tus videos</h3>
      {jobs.length === 0 && <div className="empty" style={{ marginTop: 14 }}>Aún no hay videos. Sube el primero.</div>}
      <div className="grid">
        {jobs.map((job) => (
          <Link key={job.id} href={`/edit/${job.id}`} className="job">
            <div className="thumb" style={job.poster ? { backgroundImage: `url(${job.poster})` } : undefined} />
            <div className="meta">
              <div className="name">{job.id}</div>
              <div className="muted">{job.seconds ? `${job.seconds.toFixed(0)} s · ${job.words} palabras` : "Analizando…"}</div>
              <div><span className={`chip ${job.status.state}`}><i className="dot" />{statusLabel(job.status)}</span></div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
};
