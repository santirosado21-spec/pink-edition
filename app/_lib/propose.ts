import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { Plan, Timeline } from "../../src/edit";
import { flatWords, proposalToPlan, type Proposal } from "./proposalPlan";

const ROOT = process.cwd();

// Qué dibuja cada tarjeta, para que sólo se use cuando la frase la justifica.
const CARDS: Record<string, string> = {
  patients: "cuatro figuras de persona con una resaltada; sólo si se dice literalmente «uno de cada cuatro» personas",
  risk: "el texto «2×» y dos barras, una del doble que la otra; sólo si se dice que algo se duplica o es el doble",
  emergency: "un triángulo de alerta y una columna que sube; para una alarma del cuerpo y algo que aumenta",
  illness: "unas ondas que se apagan y una cruz médica que aparece; para algo que parece una sensación y es una enfermedad",
  body: "una figura con la cabeza encendida y otra con el cuerpo lleno; para algo que pasa de la cabeza al cuerpo",
  healing: "un anillo que se completa rápido y otro que avanza lento; para recuperarse o sanar más despacio",
  bill: "un recibo que se despliega; para pagar un costo o «pasar factura»",
};
const MOTIFS: Record<string, string> = {
  rings: "ondas concéntricas de alarma detrás de la persona",
  crosses: "retícula de cruces médicas",
  network: "red de puntos conectados",
};

const SYSTEM = `Eres el editor de Pink.ai. Recibes la transcripción de un video vertical de una persona hablando a cámara y decides qué frases llevan énfasis visual. El video ya tiene captions y sonido; tú sólo eliges cortes de color, tarjetas y fondos.

Elementos disponibles:
- Corte de color: toda la pantalla se cubre y muestra la frase elegida en mayúsculas. Estilo "paper" (fondo claro, tinta de color) para explicación o reflexión; "solid" (fondo de color) para una advertencia o afirmación fuerte.
- Tarjeta: un pictograma sobre la persona. Sólo existen las del catálogo; si ninguna ilustra literalmente la frase, no pongas tarjeta.
- Fondo: el fondo se oscurece y aparece un motivo detrás de la persona durante la frase.
- Tema de color de cada elemento: "health" para salud, médico o sanar; "stress" para estrés, emergencia, riesgo o peligro; "base" para todo lo demás.

Límites que no puedes romper:
- Sólo puedes marcar palabras que están en la transcripción, por su número. No inventes cifras, datos ni llamados a la acción.
- Una tarjeta y un corte de color no pueden coincidir en el tiempo, y dos elementos no pueden reclamar las mismas palabras. Un fondo sí puede acompañar a una tarjeta sobre la misma frase.
- Como máximo cuatro elementos nuevos en cualquier tramo de diez segundos. No hace falta llenar el video: menos elementos, bien elegidos, es mejor.
- Un corte de color necesita al menos unos 0.8 s de habla; una tarjeta, 1.5 s; un fondo, 2.2 s. Elige frases completas, no palabras sueltas cortadas a mitad de idea.

En "notes" explica en dos o tres frases qué criterio seguiste y qué dejaste sin elemento a propósito.`;

export const proposePlan = async (id: string, timeline: Timeline, current: Plan): Promise<{ plan: Plan; notes: string }> => {
  const schema = JSON.parse(await fs.readFile(path.join(ROOT, "schema/edit-plan.schema.json"), "utf-8"));
  const options = (group: string, field: string) => schema.properties[group].items.properties[field].enum as [string, ...string[]];
  const range = { first_word: z.number().int(), last_word: z.number().int(), theme: z.enum(options("cuts", "theme")), label: z.string() };
  const format = z.object({
    cuts: z.array(z.object({ ...range, style: z.enum(options("cuts", "style")) })),
    cards: z.array(z.object({ ...range, kind: z.enum(options("cards", "kind")), beat_word: z.number().int(), meaning: z.string() })),
    backgrounds: z.array(z.object({ ...range, motif: z.enum(options("backgrounds", "motif")) })),
    notes: z.string(),
  });

  const words = flatWords(timeline);
  const fps = (timeline as Timeline & { fps?: number }).fps ?? 30;
  const takes = timeline.clips.map((clip, clipIndex) => {
    const start = (clip.timeline_in_frame / fps).toFixed(1);
    const end = ((clip.timeline_in_frame + clip.duration_frames) / fps).toFixed(1);
    const text = words.map((word, index) => (word.clip === clipIndex ? `${index}:${word.text}` : null)).filter(Boolean).join(" ");
    return `Toma ${clipIndex + 1} (${start}–${end} s)\n${text}`;
  });
  const catalog = [
    "Tarjetas (kind):", ...Object.entries(CARDS).map(([kind, text]) => `- ${kind}: ${text}`),
    "Fondos (motif):", ...Object.entries(MOTIFS).map(([motif, text]) => `- ${motif}: ${text}`),
  ].join("\n");

  // Lee las credenciales del entorno (ANTHROPIC_API_KEY en .env.local).
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: "high", format: zodOutputFormat(format) },
    messages: [{
      role: "user",
      content: `Video «${id}», ${(timeline.duration_frames / fps).toFixed(1)} s. Cada palabra va precedida de su número.\n\n${takes.join("\n\n")}\n\n${catalog}\n\nPropón la edición. En "label" pon la frase elegida en minúsculas; en "beat_word", la palabra donde debe caer el énfasis de la tarjeta; en "meaning", qué ilustra la tarjeta y por qué corresponde a lo dicho.`,
    }],
  });
  if (response.stop_reason === "refusal") throw new Error("El modelo declinó proponer una edición para este video.");
  if (!response.parsed_output) throw new Error("La propuesta llegó incompleta; inténtalo de nuevo.");
  const proposal = response.parsed_output as Proposal;
  return { plan: proposalToPlan(proposal, timeline, current), notes: proposal.notes };
};
