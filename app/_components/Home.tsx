"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import style from "../../style/pink-demo-v1.json";
import type { JobSummary } from "../_lib/jobs";
import { CLOUD_MAX_MB } from "../_lib/supabase/config";
import { supabaseBrowser } from "../_lib/supabase/browser";
import { InstallButton } from "./InstallButton";
import { statusLabel } from "./stages";

const videoInfo = (file: File) =>
  new Promise<{ seconds: number; width: number; height: number }>((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => { URL.revokeObjectURL(video.src); resolve({ seconds: video.duration, width: video.videoWidth, height: video.videoHeight }); };
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

  const refresh = async () => {
    const response = await fetch("/api/jobs").catch(() => null);
    if (response?.status === 401) return void (window.location.href = "/login");
    if (response?.ok) setJobs(await response.json());
  };

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [busy]);

  // Lo que el motor rechazaría se avisa antes de subir. Si el navegador no puede leer
  // el archivo, en local decide el motor; en la nube no se sube a ciegas.
  const reject = async (file: File): Promise<string | null> => {
    let info;
    try {
      info = await videoInfo(file);
    } catch (failure) {
      return cloud ? (failure as Error).message : null;
    }
    if (info.width > info.height) return "El video es horizontal. Pink.ai edita videos verticales (9:16).";
    if (info.seconds > style.limits.max_seconds) return `El video dura ${Math.round(info.seconds)} s y el máximo es ${style.limits.max_seconds} s.`;
    return null;
  };

  // En la nube el navegador sube directo al almacenamiento y pide el análisis a la cola.
  const uploadCloud = async (file: File) => {
    setError(null);
    try {
      if (file.size > CLOUD_MAX_MB * 1024 * 1024) throw new Error(`El archivo pesa más de ${CLOUD_MAX_MB} MB, el máximo en línea por ahora.`);
      const problem = await reject(file);
      if (problem) throw new Error(problem);
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
    await refresh();
  };

  // XMLHttpRequest y no fetch: es lo que informa el avance de la subida.
  const upload = async (file: File) => {
    if (cloud) return void uploadCloud(file);
    setError(null);
    const problem = await reject(file);
    if (problem) return setError(problem);
    setProgress(0);
    const request = new XMLHttpRequest();
    request.open("PUT", `/api/jobs/upload?name=${encodeURIComponent(file.name)}`);
    request.upload.onprogress = (event) => setProgress(event.loaded / event.total);
    request.onload = async () => {
      setProgress(null);
      if (request.status >= 400) {
        let message = "No se pudo subir el video.";
        try { message = JSON.parse(request.responseText).error ?? message; } catch { /* respuesta sin JSON */ }
        setError(message);
      }
      await refresh();
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
        {!online && <Link className="button ghost" href="/estilo">Mi estilo</Link>}
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
