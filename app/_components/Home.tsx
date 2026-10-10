"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import style from "../../style/pink-demo-v1.json";
import type { JobSummary } from "../_lib/jobs";
import { CLOUD_MAX_MB } from "../_lib/supabase/config";
import { supabaseBrowser } from "../_lib/supabase/browser";
import { InstallButton } from "./InstallButton";
import { statusLabel } from "./stages";

const videoSeconds = (file: File) =>
  new Promise<number>((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => { URL.revokeObjectURL(video.src); resolve(video.duration); };
    video.onerror = () => reject(new Error("No se pudo leer el video."));
    video.src = URL.createObjectURL(file);
  });

export const Home: React.FC<{ initial: JobSummary[]; online?: boolean; cloud?: boolean }> = ({ initial, online, cloud }) => {
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

  // En la nube el navegador sube directo al almacenamiento y pide el análisis a la cola.
  const uploadCloud = async (file: File) => {
    setError(null);
    try {
      if (file.size > CLOUD_MAX_MB * 1024 * 1024) throw new Error(`El archivo pesa más de ${CLOUD_MAX_MB} MB, el máximo en línea por ahora.`);
      const seconds = await videoSeconds(file);
      if (seconds > style.limits.max_seconds) throw new Error(`El video dura ${Math.round(seconds)} s y el máximo es ${style.limits.max_seconds} s.`);
      setProgress(0.05);
      const supabase = supabaseBrowser();
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Tu sesión venció. Entra de nuevo.");
      const id = crypto.randomUUID();
      const extension = (file.name.match(/\.[a-z0-9]{2,5}$/i)?.[0] ?? ".mp4").toLowerCase();
      const path = `${user.id}/${id}${extension}`;
      const stored = await supabase.storage.from("sources").upload(path, file, { contentType: file.type || "video/mp4" });
      if (stored.error) throw new Error(stored.error.message);
      const video = await supabase.from("videos").insert({ id, title: file.name.replace(/\.[^.]+$/, ""), source_path: path });
      if (video.error) throw new Error(video.error.message);
      const job = await supabase.from("jobs").insert({ video_id: id, kind: "analyze" });
      if (job.error) throw new Error(job.error.message);
    } catch (failure) {
      setError((failure as Error).message);
    }
    setProgress(null);
    setJobs(await (await fetch("/api/jobs")).json());
  };

  // XMLHttpRequest y no fetch: es lo que informa el avance de la subida.
  const upload = (file: File) => {
    if (cloud) return void uploadCloud(file);
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
        <span className="grow" style={{ flex: 1 }} />
        <InstallButton />
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
              <div className="name">{job.title ?? job.id}</div>
              <div className="muted">{job.seconds ? `${job.seconds.toFixed(0)} s · ${job.words} palabras` : "Analizando…"}</div>
              <div><span className={`chip ${job.status.state}`}><i className="dot" />{statusLabel(job.status)}</span></div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
};
