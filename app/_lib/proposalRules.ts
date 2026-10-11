import type { FlatWord, Proposal } from "./proposalPlan";

// Límites que la propuesta automática no puede romper, en frames (STYLE.proposal).
export type ProposalRules = {
  min_frames: { cut: number; card: number; background: number };
  window_frames: number;
  max_per_window: number;
};

type Group = "cuts" | "cards" | "backgrounds";
type Candidate = { group: Group; index: number; first: number; last: number; start: number; end: number; label: string };
const NAMES: Record<Group, string> = { cuts: "corte", cards: "tarjeta", backgrounds: "fondo" };
const MIN_KEY = { cuts: "cut", cards: "card", backgrounds: "background" } as const;

// Una cifra cuenta como dicha si aparece tal cual entre las palabras de su frase.
const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9%×x.,]/g, "");
export const spokenIn = (value: string, words: FlatWord[]) => {
  const target = normalize(value).replace(/[.,]$/, "");
  if (!target) return false;
  const joined = words.map((word) => normalize(word.text).replace(/[.,]$/, ""));
  if (joined.some((word) => word === target) || joined.join("").includes(target)) return true;
  // «30%» cuenta si se dijo «30 por ciento»: basta con que la cifra esté entre las palabras.
  const digits = target.replace(/[^0-9.,]/g, "").replace(/[.,]$/, "");
  return digits.length > 0 && joined.some((word) => word.replace(/[^0-9.,]/g, "") === digits);
};

/**
 * Aplica las reglas editoriales a la respuesta del modelo. Respeta el orden en que
 * el modelo listó los elementos: el primero que entra gana y el que choca se descarta
 * con su motivo, que se devuelve para mostrarlo junto a las notas.
 */
export const enforceRules = (proposal: Proposal, words: FlatWord[], rules: ProposalRules): { proposal: Proposal; dropped: string[] } => {
  const dropped: string[] = [];
  const accepted: Candidate[] = [];
  const keep: Record<Group, Set<number>> = { cuts: new Set(), cards: new Set(), backgrounds: new Set() };

  const candidates: Candidate[] = (["cuts", "cards", "backgrounds"] as const).flatMap((group) =>
    proposal[group].map((range, index) => {
      const first = range.first_word;
      const last = range.last_word;
      const valid = Number.isInteger(first) && Number.isInteger(last) && first >= 0 && last >= first && last < words.length;
      return { group, index, first, last, label: range.label, start: valid ? words[first].frame : -1, end: valid ? words[last].until : -1 };
    }),
  );
  const reject = (item: Candidate, reason: string) => dropped.push(`${NAMES[item.group]} «${item.label}»: ${reason}`);

  for (const item of candidates) {
    if (item.start < 0) {
      reject(item, "apunta a palabras que no existen.");
      continue;
    }
    const minimum = rules.min_frames[MIN_KEY[item.group]];
    if (item.end - item.start < minimum) {
      reject(item, `dura ${item.end - item.start} frames y el mínimo es ${minimum}.`);
      continue;
    }
    if (item.group === "cards") {
      const card = proposal.cards[item.index];
      if (card.kind === "counter" && !(card.text && spokenIn(card.text, words.slice(item.first, item.last + 1)))) {
        reject(item, "el contador necesita una cifra dicha literalmente en la frase.");
        continue;
      }
    }
    // Cortes y tarjetas no coinciden en el tiempo; un fondo sólo puede acompañar a una tarjeta.
    const clash = accepted.find((other) => {
      const together = (item.group === "backgrounds") !== (other.group === "backgrounds");
      const allowed = together && (item.group === "cards" || other.group === "cards");
      return !allowed && item.start < other.end && other.start < item.end;
    });
    if (clash) {
      reject(item, `se cruza con «${clash.label}».`);
      continue;
    }
    const crowd = accepted.filter((other) => Math.abs(other.start - item.start) < rules.window_frames);
    const busiest = [item, ...crowd].some((anchor) =>
      [item, ...accepted].filter((other) => other.start >= anchor.start && other.start < anchor.start + rules.window_frames).length > rules.max_per_window,
    );
    if (busiest) {
      reject(item, `habría más de ${rules.max_per_window} elementos en ${Math.round(rules.window_frames / 30)} s.`);
      continue;
    }
    accepted.push(item);
    keep[item.group].add(item.index);
  }

  return {
    proposal: {
      ...proposal,
      cuts: proposal.cuts.filter((_, index) => keep.cuts.has(index)),
      cards: proposal.cards.filter((_, index) => keep.cards.has(index)),
      backgrounds: proposal.backgrounds.filter((_, index) => keep.backgrounds.has(index)),
    },
    dropped,
  };
};
