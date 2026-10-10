import type { JobStatus } from "../_lib/jobs";

// Nombres legibles de los pasos que reporta `scripts/pink_edit.py`.
const STAGES: Record<string, string> = {
  start: "Arrancando",
  queued: "En cola",
  analyze: "Analizando el video",
  conform: "Preparando el video",
  transcribe: "Transcribiendo",
  cut: "Cortando silencios",
  matte: "Recortando a la persona",
  place: "Colocando tarjetas",
  render: "Renderizando",
  finish: "Normalizando audio y verificando",
};

// Orden de los pasos del pipeline local, para dibujar el avance.
export const STAGE_ORDER = ["conform", "transcribe", "cut", "matte", "place", "render", "finish"];
export const stageName = (stage: string) => STAGES[stage] ?? stage;

export const statusLabel = (status: JobStatus) => {
  if (status.state === "running") return `${STAGES[status.stage] ?? status.stage}…`;
  if (status.state === "ready") return "Listo para editar";
  if (status.state === "done") return "Renderizado";
  return `Falló en: ${STAGES[status.stage] ?? status.stage}`;
};
