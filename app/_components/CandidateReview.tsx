"use client";
import { useEffect, useState } from "react";
import type { Candidate, CandidateSummary } from "../_lib/candidates";

export function CandidateReview({ job, refresh, onPreview }: {
  job: string; refresh: unknown; onPreview: (candidate: Candidate, baseline: boolean) => void;
}) {
  const [items, setItems] = useState<CandidateSummary[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/jobs/${job}/candidates`, { cache: "no-store", signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { if (!controller.signal.aborted) { setItems(data.candidates ?? []); setMessage(""); } })
      .catch(() => { if (!controller.signal.aborted) setMessage("No se pudo cargar el historial."); });
    return () => controller.abort();
  }, [job, refresh]);
  async function preview(id: string, baseline: boolean) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/jobs/${job}/candidates?candidate=${id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onPreview(data.candidate, baseline);
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="steps-box" aria-label="Historial de propuestas">
    <h3>Historial de propuestas</h3>
    <p>La primera propuesta y su punto de partida quedan conservados. Compararlas no cambia tu borrador.</p>
    {!items.length && !message && <p className="muted">La próxima propuesta aparecerá aquí.</p>}
    {items.map(item => <div key={item.id} style={{ marginBottom: 12 }}>
      <p>{new Date(item.created_at).toLocaleString()} · base v{item.base_version} · {item.report.accepted} recursos añadidos
        {item.stale && " · la edición activa cambió"}</p>
      <button className="button" disabled={busy} onClick={() => void preview(item.id, true)}>Ver punto de partida</button>{" "}
      <button className="button" disabled={busy} onClick={() => void preview(item.id, false)}>Ver propuesta</button>
    </div>)}
    {message && <p role="status">{message}</p>}
  </section>;
}
