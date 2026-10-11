import assert from "node:assert/strict";
import { test } from "node:test";
import style from "../style/pink-demo-v1.json";
import { validatePlan } from "../app/_lib/jobs";
import { proposePlan, revisePlan, type ProposeClient } from "../app/_lib/propose";
import { flatWords, planToProposal, proposalToPlan, type Proposal } from "../app/_lib/proposalPlan";
import { enforceRules, spokenIn } from "../app/_lib/proposalRules";
import type { Style } from "../src/edit";
import { emptyPlan, timelineOf } from "./fixtures";

const rules = style.proposal;
// 40 palabras de 10 frames: cada palabra es un tercio de segundo.
const timeline = timelineOf([
  "el ahorro empieza con una decisión que casi nadie toma a tiempo",
  "si guardas el 30 por ciento de lo que ganas tu dinero crece",
  "primero anotas luego recortas y al final inviertes cada mes",
  "esa es la diferencia entre vivir al día y tener libertad",
]);
const words = flatWords(timeline);
const range = (first: number, last: number, label = `frase ${first}`) => ({ first_word: first, last_word: last, theme: "base", label });
const proposal = (parts: Partial<Proposal>): Proposal => ({ cuts: [], cards: [], backgrounds: [], notes: "", ...parts });
const card = (first: number, last: number, kind = "compare", text?: string) => ({ ...range(first, last), kind, beat_word: last, meaning: "prueba", ...(text ? { text } : {}) });

test("descarta un corte y una tarjeta que coinciden en el tiempo", () => {
  const result = enforceRules(proposal({ cuts: [{ ...range(0, 5), style: "paper" }], cards: [card(3, 9)] }), words, rules);
  assert.equal(result.proposal.cuts.length, 1);
  assert.equal(result.proposal.cards.length, 0);
  assert.match(result.dropped[0], /se cruza/);
});

test("un fondo puede acompañar a una tarjeta, pero no a un corte", () => {
  const withCard = enforceRules(proposal({ cards: [card(12, 20)], backgrounds: [{ ...range(12, 22), motif: "network" }] }), words, rules);
  assert.equal(withCard.proposal.backgrounds.length, 1);
  const withCut = enforceRules(proposal({ cuts: [{ ...range(12, 20), style: "solid" }], backgrounds: [{ ...range(12, 22), motif: "network" }] }), words, rules);
  assert.equal(withCut.proposal.backgrounds.length, 0);
});

test("respeta las duraciones mínimas de STYLE", () => {
  // Dos palabras = 20 frames: menos que un corte (24).
  const result = enforceRules(proposal({ cuts: [{ ...range(0, 1), style: "paper" }], cards: [card(4, 7)] }), words, rules);
  assert.equal(result.proposal.cuts.length, 0);
  assert.equal(result.proposal.cards.length, 0);
  assert.equal(result.dropped.length, 2);
});

test("el contador sólo muestra una cifra que se dijo en su frase", () => {
  const spoken = enforceRules(proposal({ cards: [card(12, 18, "counter", "30%")] }), words, rules);
  assert.equal(spoken.proposal.cards.length, 1);
  const invented = enforceRules(proposal({ cards: [card(12, 18, "counter", "45%")] }), words, rules);
  assert.equal(invented.proposal.cards.length, 0);
  const missing = enforceRules(proposal({ cards: [card(12, 18, "counter")] }), words, rules);
  assert.equal(missing.proposal.cards.length, 0);
  // La cifra existe en el video, pero no en la frase marcada.
  const elsewhere = enforceRules(proposal({ cards: [card(0, 8, "counter", "30")] }), words, rules);
  assert.equal(elsewhere.proposal.cards.length, 0);
});

test("no permite más elementos de los admitidos en una ventana", () => {
  const dense = timelineOf([Array.from({ length: 60 }, (_, i) => `w${i}`).join(" ")], 5);
  const tight = flatWords(dense);
  // Cinco cortes de 5 palabras (25 frames) en 150 frames: el quinto sobra.
  const cuts = [0, 6, 12, 18, 24].map((first) => ({ ...range(first, first + 4), style: "paper" }));
  const result = enforceRules(proposal({ cuts }), tight, rules);
  assert.equal(result.proposal.cuts.length, rules.max_per_window);
  assert.match(result.dropped[0], /más de 4 elementos/);
});

test("descarta rangos fuera del video", () => {
  const result = enforceRules(proposal({ cuts: [{ ...range(30, 99), style: "paper" }, { ...range(5, 2), style: "paper" }] }), words, rules);
  assert.equal(result.proposal.cuts.length, 0);
  assert.equal(result.dropped.length, 2);
});

test("spokenIn compara sin acentos ni signos", () => {
  const sample = timelineOf(["subió un 2,5 por ciento en México"]);
  const list = flatWords(sample);
  assert.equal(spokenIn("2,5", list), true);
  assert.equal(spokenIn("2,5%", list), true);
  assert.equal(spokenIn("mexico", list), true);
  assert.equal(spokenIn("3", list), false);
  assert.equal(spokenIn("", list), false);
});

const fakeClient = (parsed: Proposal | null, stop_reason = "end_turn") => {
  const calls: Record<string, unknown>[] = [];
  const client = { messages: { parse: async (request: Record<string, unknown>) => (calls.push(request), { stop_reason, parsed_output: parsed }) } };
  return { client: client as unknown as ProposeClient, calls };
};

test("proposePlan produce un plan válido y aplica las reglas", async () => {
  const { client, calls } = fakeClient(proposal({
    cuts: [{ ...range(36, 39, "libertad"), style: "solid" }],
    cards: [card(12, 18, "counter", "30%"), card(14, 20, "compare")],
    backgrounds: [{ ...range(24, 33), motif: "network" }],
    notes: "Criterio de prueba.",
  }));
  const result = await proposePlan("prueba", timeline, emptyPlan(), style as Style, client);
  assert.equal(result.plan.cuts.length, 1);
  assert.equal(result.plan.cards.length, 1);
  assert.equal(result.plan.cards[0].text, "30%");
  assert.equal(result.plan.backgrounds.length, 1);
  assert.equal(result.dropped.length, 1);
  assert.deepEqual(await validatePlan(result.plan, timeline), []);
  // El prompt lleva las palabras numeradas y los límites de STYLE.
  const request = calls[0] as { model: string; system: string; messages: { content: string }[] };
  assert.equal(request.model, "claude-opus-5-5");
  assert.match(request.messages[0].content, /12:si 13:guardas 14:el 15:30/);
  assert.match(request.system, /Como máximo 4 elementos nuevos en cualquier tramo de 10 s/);
  assert.match(request.system, /al menos 0.8 s de habla; una tarjeta, 1.5 s; un fondo, 2.2 s/);
});

test("proposePlan informa una negativa del modelo", async () => {
  const { client } = fakeClient(null, "refusal");
  await assert.rejects(proposePlan("prueba", timeline, emptyPlan(), style as Style, client), /declinó/);
});

test("planToProposal recupera las mismas frases que produjo proposalToPlan", () => {
  const original = proposal({
    cuts: [{ ...range(36, 39, "libertad"), style: "solid" }],
    cards: [card(12, 18, "counter", "30%")],
    backgrounds: [{ ...range(24, 33), motif: "network" }],
  });
  const back = planToProposal(proposalToPlan(original, timeline, emptyPlan()), timeline);
  assert.deepEqual(back.cuts.map((cut) => [cut.first_word, cut.last_word, cut.style]), [[36, 39, "solid"]]);
  assert.deepEqual(back.cards.map((item) => [item.first_word, item.last_word, item.beat_word, item.text]), [[12, 18, 18, "30%"]]);
  assert.deepEqual(back.backgrounds.map((item) => [item.first_word, item.last_word]), [[24, 33]]);
});

test("revisePlan manda el plan actual y la instrucción, y aplica las reglas", async () => {
  const current = proposalToPlan(proposal({ cards: [card(12, 18, "counter", "30%")] }), timeline, emptyPlan());
  const { client, calls } = fakeClient(proposal({
    cuts: [{ ...range(36, 39, "libertad"), theme: "money", style: "solid" }],
    cards: [card(12, 18, "counter", "45%")],
    notes: "Agregué el corte al final.",
  }));
  const result = await revisePlan("prueba", timeline, current, style as Style, "pon un corte en libertad", client);
  const request = calls[0] as { messages: { content: string }[] };
  assert.match(request.messages[0].content, /"first_word":12,"last_word":18/);
  assert.match(request.messages[0].content, /«pon un corte en libertad»/);
  // El modelo cambió la cifra a una que no se dijo: la tarjeta se descarta.
  assert.equal(result.plan.cuts.length, 1);
  assert.equal(result.plan.cuts[0].theme, "money");
  assert.equal(result.plan.cards.length, 0);
  assert.equal(result.notes, "Agregué el corte al final.");
  assert.equal(result.dropped.length, 1);
  assert.deepEqual(await validatePlan(result.plan, timeline), []);
});
