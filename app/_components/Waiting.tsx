"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { JobStatus } from "../_lib/jobs";
import { statusLabel } from "./stages";

// Mientras el video se analiza no hay nada que editar: sólo se muestra el avance.
export const Waiting: React.FC<{ id: string; initial: JobStatus | null }> = ({ id, initial }) => {
  const [status, setStatus] = useState(initial);
  const router = useRouter();
  useEffect(() => {
    if (!status || status.state === "failed") return;
    const timer = setInterval(async () => {
      const next = (await (await fetch(`/api/jobs/${id}?status`)).json()).status as JobStatus;
      setStatus(next);
      if (next.state !== "running") router.refresh();
    }, 3000);
    return () => clearInterval(timer);
  }, [id, router, status]);
  return (
    <div className="waiting">
      <div>
        <div className="brand"><img src="/logo.png" alt="" /><b>Pink<span>.ai</span></b></div>
        <h2>{id}</h2>
        {status ? <span className={`chip ${status.state}`}><i className="dot" />{statusLabel(status)}</span> : <span className="chip failed">No existe este video</span>}
        {status?.error && <div className="notice">{status.error}</div>}
        <p><Link className="button" href="/app">← Volver a tus videos</Link></p>
      </div>
    </div>
  );
};
