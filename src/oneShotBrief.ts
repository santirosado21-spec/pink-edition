import { checkPreferences, type Preferences } from "./preferences";

export const ONE_SHOT_REQUIREMENTS = Object.freeze({
  music: true, cards: 2, graphics: 2, broll: 2, transitions: 2,
  preserveAllSpeech: true, protectFaceAndCaptions: true,
});
export const MUSIC_MOODS = ["calm", "energetic", "documentary", "cinematic"] as const;
export type OneShotBrief = {
  version: 1; objective: string; audience: string; preferences: Preferences;
  musicMood: (typeof MUSIC_MOODS)[number];
  musicSource: "licensed-library" | "own";
  brollSource: "licensed-library" | "own" | "both";
  resourceNotes: string; resourcePolicy?: "showcase" | "relevant-only"; confirmed: true;
};
export function checkOneShotBrief(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["Completa las preguntas antes de subir una grabación."];
  const brief = value as Record<string, unknown>;
  const keys = ["version", "objective", "audience", "preferences", "musicMood", "musicSource", "brollSource", "resourceNotes", "resourcePolicy", "confirmed"];
  const errors = Object.keys(brief).some(key => !keys.includes(key)) ? ["El brief contiene campos desconocidos."] : [];
  if (brief.version !== 1 || brief.confirmed !== true) errors.push("Confirma el resumen antes de continuar.");
  for (const key of ["objective", "audience"]) {
    if (typeof brief[key] !== "string" || !brief[key].trim() || brief[key].length > 300) errors.push(`Completa ${key === "objective" ? "el objetivo" : "la audiencia"} (máximo 300 caracteres).`);
  }
  errors.push(...checkPreferences(brief.preferences));
  if (!MUSIC_MOODS.includes(brief.musicMood as OneShotBrief["musicMood"])) errors.push("Elige el carácter de la música.");
  if (!["licensed-library", "own"].includes(brief.musicSource as string)) errors.push("Elige de dónde saldrá la música.");
  if (!["licensed-library", "own", "both"].includes(brief.brollSource as string)) errors.push("Elige de dónde saldrán los B-rolls.");
  if (typeof brief.resourceNotes !== "string" || brief.resourceNotes.length > 600) errors.push("Las indicaciones de recursos admiten hasta 600 caracteres.");
  if (brief.resourcePolicy !== undefined && !["showcase", "relevant-only"].includes(brief.resourcePolicy as string)) errors.push("Elige una política de recursos válida.");
  const prefs = brief.preferences as Partial<Preferences> | null;
  if (typeof prefs?.topic !== "string" || !prefs.topic.trim()) errors.push("Indica el tema del video.");
  if (brief.resourcePolicy !== "relevant-only" && prefs?.graphics !== "many") errors.push("Esta prueba exige dos tarjetas y dos gráficos; no admite desactivarlos.");
  if (brief.resourcePolicy !== "relevant-only" && (prefs?.support_media === "none" || prefs?.support_media === "still" || prefs?.emphasis_mode === "none" || (Array.isArray(prefs?.graphic_kinds) && !["compare", "steps"].every(kind => prefs.graphic_kinds!.includes(kind))))) errors.push("La prueba de catálogo necesita clips, énfasis, comparaciones y listas. Elige edición natural para respetar tu selección de recursos.");
  if (!prefs?.transition || prefs.transition === "none") errors.push("Esta prueba requiere transiciones.");
  return errors;
}
