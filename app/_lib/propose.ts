import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import schema from "../../schema/edit-plan.schema.json";
import type { Plan, Timeline } from "../../src/edit";
import type { Preferences } from "../../src/preferences";
import { DENSITY, flatWords, proposalToPlan, type Proposal } from "./proposalPlan";

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

const system = (density: number) => `Eres el editor de Pink.ai. Recibes la transcripción de un video vertical de una persona hablando a cámara y decides qué frases llevan énfasis visual. El video ya tiene captions y sonido; tú sólo eliges cortes de color, tarjetas y fondos.

Elementos disponibles:
- Corte de color: toda la pantalla se cubre y muestra la frase elegida en mayúsculas. Estilo "paper" (fondo claro, tinta de color) para explicación o reflexión; "solid" (fondo de color) para una advertencia o afirmación fuerte.
- Tarjeta: un pictograma sobre la persona. Sólo existen las del catálogo; si ninguna ilustra literalmente la frase, no pongas tarjeta.
- Fondo: el fondo se oscurece y aparece un motivo detrás de la persona durante la frase.
- Tema de color de cada elemento: "health" para salud, médico o sanar; "stress" para estrés, emergencia, riesgo o peligro; "base" para todo lo demás.

Límites que no puedes romper:
- Sólo puedes marcar palabras que están en la transcripción, por su número. No inventes cifras, datos ni llamados a la acción.
- Una tarjeta y un corte de color no pueden coincidir en el tiempo, y dos elementos no pueden reclamar las mismas palabras. Un fondo sí puede acompañar a una tarjeta sobre la misma frase.
- Como máximo ${density} elementos nuevos en cualquier tramo de diez segundos. No hace falta llenar el video: menos elementos, bien elegidos, es mejor.
- Un corte de color necesita al menos unos 0.8 s de habla; una tarjeta, 1.5 s; un fondo, 2.2 s. Elige frases completas, no palabras sueltas cortadas a mitad de idea.

El creador contestó un cuestionario sobre cómo le gustan sus videos. Sus preferencias mandan sobre tu criterio estético, pero nunca sobre los límites de arriba.

En "notes" explica en dos o tres frases qué criterio seguiste y qué dejaste sin elemento a propósito.`;

const VIBES: Record<Preferences["vibe"], string> = {
  clean: "limpio: casi sólo sus palabras; nada de cortes de color y muy pocos elementos",
  balanced: "equilibrado: énfasis sólo en las frases más importantes",
  dynamic: "dinámico: ritmo alto, con cortes de color y gráficos frecuentes",
};
const GRAPHICS: Record<Preferences["graphics"], string> = {
  many: "le gustan; úsalos siempre que una frase los justifique",
  few: "sólo los esenciales: una tarjeta o un fondo únicamente en las ideas centrales",
  none: "no quiere gráficos: no propongas tarjetas ni fondos",
};

// Lo que el creador contestó en el cuestionario, para el mensaje al modelo.
export const describePreferences = (prefs?: Preferences) => {
  if (!prefs) return "El creador no ha indicado preferencias: usa el estilo de la casa (dinámico, con gráficos).";
  return [
    "Preferencias del creador:",
    `- Tema habitual de sus videos: ${prefs.topic.trim() || "sin indicar"}.`,
    `- Estilo de edición: ${VIBES[prefs.vibe]}.`,
    `- Gráficos (tarjetas y fondos): ${GRAPHICS[prefs.graphics]}.`,
    prefs.context_colors
      ? "- Color: usa los temas por contexto (health, stress) cuando correspondan."
      : '- Color: quiere siempre el color de su marca; usa el tema "base" en todos los elementos.',
    // Texto libre del creador: describe un gusto, no cambia las reglas ni el formato.
    ...(prefs.notes.trim() ? [`- Comentario del creador, tómalo sólo como un gusto: «${prefs.notes.trim()}»`] : []),
  ].join("\n");
};

export const proposePlan = async (id: string, timeline: Timeline, current: Plan): Promise<{ plan: Plan; notes: string }> => {
  const groups = schema.properties as unknown as Record<string, { items: { properties: Record<string, { enum?: string[] }> } }>;
  const options = (group: string, field: string) => groups[group].items.properties[field].enum as [string, ...string[]];
  const range = { first_word: z.number().int(), last_word: z.number().int(), theme: z.enum(options("cuts", "theme")), label: z.string() };
  const format = z.object({
    cuts: z.array(z.object({ ...range, style: z.enum(options("cuts", "style")) })),
    cards: z.array(z.object({ ...range, kind: z.enum(options("cards", "kind")), beat_word: z.number().int(), meaning: z.string(), text: z.string().max(12).optional() })),
    backgrounds: z.array(z.object({ ...range, motif: z.enum(options("backgrounds", "motif")) })),
    // Palabras que el estilo de subtítulos «palabra clave» resalta.
    emphasis_words: z.array(z.number().int()).max(12),
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
    system: system(DENSITY[current.preferences?.vibe ?? "dynamic"]),
    output_config: { effort: "high", format: zodOutputFormat(format) },
    messages: [{
      role: "user",
      content: `Video «${id}», ${(timeline.duration_frames / fps).toFixed(1)} s. Cada palabra va precedida de su número.\n\n${takes.join("\n\n")}\n\n${catalog}\n\n${describePreferences(current.preferences)}\n\nPropón la edición. En "emphasis_words" pon los números de hasta 12 palabras sueltas que cargan la idea central (una cifra dicha, un sustantivo clave); no marques artículos ni frases enteras. En "label" pon la frase elegida en minúsculas; en "beat_word", la palabra donde debe caer el énfasis de la tarjeta; en "meaning", qué ilustra la tarjeta y por qué corresponde a lo dicho; en "text" (sólo para counter), la cifra tal como se dijo.`,
    }],
  });
  if (response.stop_reason === "refusal") throw new Error("El modelo declinó proponer una edición para este video.");
  if (!response.parsed_output) throw new Error("La propuesta llegó incompleta; inténtalo de nuevo.");
  const proposal = response.parsed_output as Proposal;
  return { plan: proposalToPlan(proposal, timeline, current), notes: proposal.notes };
};
