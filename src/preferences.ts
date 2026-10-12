import type { Style, Theme } from "./edit";

// Lo que el creador contesta una vez en el cuestionario de estilo. Viaja copiado en
// el plan de cada video (`plan.preferences`).
export const VIBES = ["clean", "balanced", "dynamic"] as const;
export const GRAPHICS = ["many", "few", "none"] as const;
export const SFX = ["full", "soft", "none"] as const;
export type Preferences = {
  topic: string;
  vibe: (typeof VIBES)[number];
  graphics: (typeof GRAPHICS)[number];
  brand_color: string;
  context_colors: boolean;
  sfx: (typeof SFX)[number];
  notes: string;
};

// Los valores por defecto reproducen el look de la casa: sin preferencias nada cambia.
export const DEFAULT_PREFERENCES: Preferences = {
  topic: "",
  vibe: "dynamic",
  graphics: "many",
  brand_color: "#1f5fc4",
  context_colors: true,
  sfx: "full",
  notes: "",
};
export const MAX_TOPIC = 80;
export const MAX_NOTES = 300;
const SOFT_SFX_DB = -6;
const DARK_INK = "#17131c";
const HEX = /^#[0-9a-f]{6}$/i;

export const checkPreferences = (value: unknown): string[] => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return ["Las preferencias no son válidas."];
  const prefs = value as Record<string, unknown>;
  const errors: string[] = [];
  const unknown = Object.keys(prefs).filter((key) => !(key in DEFAULT_PREFERENCES));
  if (unknown.length > 0) errors.push(`Preferencias desconocidas: ${unknown.join(", ")}.`);
  if (typeof prefs.topic !== "string" || prefs.topic.length > MAX_TOPIC) errors.push(`El tema admite hasta ${MAX_TOPIC} caracteres.`);
  if (typeof prefs.notes !== "string" || prefs.notes.length > MAX_NOTES) errors.push(`La nota admite hasta ${MAX_NOTES} caracteres.`);
  if (!VIBES.includes(prefs.vibe as Preferences["vibe"])) errors.push("Estilo de edición desconocido.");
  if (!GRAPHICS.includes(prefs.graphics as Preferences["graphics"])) errors.push("Preferencia de gráficos desconocida.");
  if (!SFX.includes(prefs.sfx as Preferences["sfx"])) errors.push("Preferencia de sonido desconocida.");
  if (typeof prefs.brand_color !== "string" || !HEX.test(prefs.brand_color)) errors.push("El color de marca debe ser un hexadecimal como #1f5fc4.");
  if (typeof prefs.context_colors !== "boolean") errors.push("Falta indicar si el color cambia con el tema.");
  return errors;
};

type Rgb = [number, number, number];
const toRgb = (hex: string): Rgb => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255) as Rgb;
const toHsl = ([r, g, b]: Rgb): Rgb => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
};
const fromHsl = (h: number, s: number, l: number): string => {
  const channel = (n: number) => {
    const k = (n + h * 12) % 12;
    const value = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
};
const luminance = (hex: string) => {
  const [r, g, b] = toRgb(hex).map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
// Contraste de un color contra el blanco (WCAG): 3 es el mínimo para texto grande.
export const contrastWithWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

// Paleta de un color de marca: el color tal cual, su versión clara y oscura, y las
// tintas que garantizan que el texto de los cortes de color se lea.
export const brandTheme = (hex: string): Theme => {
  const [h, s, l] = toHsl(toRgb(hex));
  const accent = hex.toLowerCase();
  // Sobre papel la tinta es el color; uno claro se oscurece hasta que se lea.
  let ink = accent;
  for (let lightness = l; contrastWithWhite(ink) < 3.2 && lightness > 0.05; lightness -= 0.02) ink = fromHsl(h, s, lightness);
  const readableOnAccent = contrastWithWhite(accent) >= 3;
  return {
    accent,
    // La versión clara dibuja pictogramas sobre vidrio oscuro: nunca queda apagada.
    light: fromHsl(h, s, clamp(l + 0.24, 0.55, 0.86)),
    dark: fromHsl(h, s, clamp(l - 0.1, 0.1, 0.7)),
    ink,
    // Sobre un fondo de color claro, el blanco no se lee: la tinta pasa a oscura.
    ...(readableOnAccent ? {} : { on: DARK_INK, on_muted: "rgba(23,19,28,0.42)" }),
  };
};

// El estilo de la casa con las preferencias del creador aplicadas. Sin preferencias
// devuelve el mismo objeto.
export const applyPreferences = (style: Style, prefs?: Preferences): Style => {
  if (!prefs) return style;
  const themes = style.themes as Record<string, Theme>;
  const sameBrand = prefs.brand_color.toLowerCase() === themes.base.accent.toLowerCase();
  const base = sameBrand ? themes.base : brandTheme(prefs.brand_color);
  const [hue, saturation] = toHsl(toRgb(prefs.brand_color));
  const softer = (sound: { gain_db: number }) => ({ ...sound, gain_db: sound.gain_db + SOFT_SFX_DB });
  const audio = style.audio;
  return {
    ...style,
    themes: prefs.context_colors ? { ...themes, base } : Object.fromEntries(Object.keys(themes).map((name) => [name, base])),
    cuts: sameBrand ? style.cuts : { ...style.cuts, paper: { ...style.cuts.paper, muted: fromHsl(hue, saturation * 0.35, 0.71) } },
    background: sameBrand ? style.background : { ...style.background, dim: `${fromHsl(hue, Math.min(saturation, 0.75), 0.13)}75` },
    audio:
      prefs.sfx === "soft"
        ? { ...audio, intro_sfx: softer(audio.intro_sfx), cut_sfx: softer(audio.cut_sfx), card_enter_sfx: softer(audio.card_enter_sfx), card_beat_sfx: softer(audio.card_beat_sfx), color_cut_sfx: softer(audio.color_cut_sfx) }
        : audio,
  } as Style;
};
