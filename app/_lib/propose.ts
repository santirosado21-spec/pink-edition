import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { Plan, Style, Timeline } from "../../src/edit";
import { flatWords, proposalToPlan, type Proposal } from "./proposalPlan";
import { enforceRules, type ProposalRules } from "./proposalRules";

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
  compare: "dos barras, una claramente más larga; para «más que», «mayor», «más rápido» dicho en la frase, sin cifras",
  steps: "tres pasos numerados que aparecen en secuencia; para un proceso en tres movimientos (primero, luego, al final)",
  beforeafter: "dos paneles con una flecha y una palomita al final; para una transformación de un estado a otro",
  alert: "un triángulo de advertencia con signo de exclamación; para un error, un peligro o una advertencia",
  counter: "un número grande que sube hasta la cifra dicha; SÓLO si el hablante dijo esa cifra literalmente, y se pone en el campo text",
  question: "un signo de interrogación grande con un pulso; para una pregunta retórica o un misterio que plantea el hablante",
};
const MOTIFS: Record<string, string> = {
  rings: "ondas concéntricas de alarma detrás de la persona",
  crosses: "retícula de cruces médicas",
  network: "red de puntos conectados",
};

const seconds = (frames: number, fps: number) => Number((frames / fps).toFixed(1));
const system = (rules: ProposalRules, fps: number) => `Eres el editor de Pink.ai. Recibes la transcripción de un video vertical de una persona hablando a cámara y decides qué frases llevan énfasis visual. El video ya tiene captions y sonido; tú sólo eliges cortes de color, tarjetas y fondos.

Elementos disponibles:
- Corte de color: toda la pantalla se cubre y muestra la frase elegida en mayúsculas. Estilo "paper" (fondo claro, tinta de color) para explicación o reflexión; "solid" (fondo de color) para una advertencia o afirmación fuerte.
- Tarjeta: un pictograma sobre la persona. Sólo existen las del catálogo; si ninguna ilustra literalmente la frase, no pongas tarjeta.
- Fondo: el fondo se oscurece y aparece un motivo detrás de la persona durante la frase.
- Tema de color de cada elemento: "health" para salud, médico o sanar; "stress" para estrés, emergencia, riesgo o peligro; "money" para dinero, ahorro, precios o negocios; "tech" para tecnología, internet o inteligencia artificial; "base" para todo lo demás.

Límites que no puedes romper:
- Sólo puedes marcar palabras que están en la transcripción, por su número. No inventes cifras, datos ni llamados a la acción.
- Una tarjeta y un corte de color no pueden coincidir en el tiempo, y dos elementos no pueden reclamar las mismas palabras. Un fondo sí puede acompañar a una tarjeta sobre la misma frase.
- Como máximo ${rules.max_per_window} elementos nuevos en cualquier tramo de ${seconds(rules.window_frames, fps)} s. No hace falta llenar el video: menos elementos, bien elegidos, es mejor.
- Un corte de color necesita al menos ${seconds(rules.min_frames.cut, fps)} s de habla; una tarjeta, ${seconds(rules.min_frames.card, fps)} s; un fondo, ${seconds(rules.min_frames.background, fps)} s. Elige frases completas, no palabras sueltas cortadas a mitad de idea.

En "notes" explica en dos o tres frases qué criterio seguiste y qué dejaste sin elemento a propósito.`;

// Lo único que usa del SDK: así las pruebas pasan un cliente falso sin red ni clave.
export type ProposeClient = Pick<Anthropic, "messages">;

export const proposePlan = async (
  id: string,
  timeline: Timeline,
  current: Plan,
  style: Style,
  client: ProposeClient = new Anthropic(),
): Promise<{ plan: Plan; notes: string; dropped: string[] }> => {
  const schema = JSON.parse(await fs.readFile(path.join(ROOT, "schema/edit-plan.schema.json"), "utf-8"));
  const options = (group: string, field: string) => schema.properties[group].items.properties[field].enum as [string, ...string[]];
  const range = { first_word: z.number().int(), last_word: z.number().int(), theme: z.enum(options("cuts", "theme")), label: z.string() };
  const format = z.object({
    cuts: z.array(z.object({ ...range, style: z.enum(options("cuts", "style")) })),
    cards: z.array(z.object({ ...range, kind: z.enum(options("cards", "kind")), beat_word: z.number().int(), meaning: z.string(), text: z.string().max(12).optional() })),
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

  const rules = style.proposal;
  // El cliente por defecto lee las credenciales del entorno (ANTHROPIC_API_KEY en .env.local).
  const response = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    system: system(rules, fps),
    output_config: { effort: "high", format: zodOutputFormat(format) },
    messages: [{
      role: "user",
      content: `Video «${id}», ${(timeline.duration_frames / fps).toFixed(1)} s. Cada palabra va precedida de su número.\n\n${takes.join("\n\n")}\n\n${catalog}\n\nPropón la edición. En "label" pon la frase elegida en minúsculas; en "beat_word", la palabra donde debe caer el énfasis de la tarjeta; en "meaning", qué ilustra la tarjeta y por qué corresponde a lo dicho; en "text" (sólo para counter), la cifra tal como se dijo.`,
    }],
  });
  if (response.stop_reason === "refusal") throw new Error("El modelo declinó proponer una edición para este video.");
  if (!response.parsed_output) throw new Error("La propuesta llegó incompleta; inténtalo de nuevo.");
  // El modelo puede equivocarse: las reglas se comprueban aquí, no sólo en el prompt.
  const { proposal, dropped } = enforceRules(response.parsed_output as Proposal, words, rules);
  return { plan: proposalToPlan(proposal, timeline, current), notes: proposal.notes, dropped };
};
