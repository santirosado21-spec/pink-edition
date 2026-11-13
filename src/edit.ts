import { createContext, useContext } from "react";
import { staticFile } from "remotion";
import styleJson from "../style/pink-demo-v1.json";
import { applyPreferences, type CaptionPreset, type Preferences } from "./preferences";
import type { Head, TakeTransition, ZoomEvent } from "./zooms";

export type AlignedWord = {
  id: string;
  text: string;
  source_start_frame: number;
  source_end_frame: number;
  alignment_score: number | null;
};
export type CaptionPage = {
  start_frame: number;
  end_frame: number;
  lines: AlignedWord[][];
};
export type SpeechClip = {
  id: string;
  source_in_frame: number;
  duration_frames: number;
  timeline_in_frame: number;
  words: AlignedWord[];
  pages: CaptionPage[];
  // Caja de la cabeza en la toma (scripts/heads.py); encuadra zooms y transiciones.
  head?: Head | null;
  // Detección real de rostros; distinta de la heurística de silueta para zoom.
  face?: Head | null;
};
export type Timeline = { is_sample?: boolean; duration_frames: number; clips: SpeechClip[]; transcription_review_required?: boolean; audio_preserved?: boolean };
// El estilo es fijo por look; el plan son las decisiones de un video
// (`schema/edit-plan.schema.json`).
export type Style = typeof styleJson;
// Todo se ancla a una palabra; el frame absoluto sólo sirve con datos ficticios.
export type Anchor = { anchor_word_id: string; offset_frames: number; sample_frame?: number };
export type PlanEvent = Anchor & { id: string; label: string; theme: string; duration_frames: number };
export type CutEvent = PlanEvent & { style: string; last_word_id: string };
export type StockPhoto = { provider: "Pexels" | "Openverse" | "Pixabay" | "Wikimedia"; id: number | string; asset: string; photographer: string; url: string; license: string; alt: string };
export type CardEvent = PlanEvent & { kind: string; top?: number; beat: Anchor; meaning?: string; text?: string; photo?: StockPhoto };
export type BackgroundEvent = PlanEvent & { motif: string };
export type Plan = {
  style: string;
  version: number;
  cuts: CutEvent[];
  cards: CardEvent[];
  backgrounds: BackgroundEvent[];
  clip_labels?: string[];
  intro_blur?: Style["intro_blur"];
  // Gustos del creador (cuestionario de estilo), copiados al crear el video.
  preferences?: Preferences;
  // Palabras que el estilo «keyword» resalta; sin ellas resalta la palabra activa.
  emphasis_word_ids?: string[];
  // Ritmo: zooms tipo «punch-in» y transición en cada cambio de toma (opcionales).
  zooms?: ZoomEvent[];
  take_transition?: TakeTransition;
};
// Rutas dentro de `public/`: el video original y el recorte de la persona.
export type EditMedia = { source: string; person: string | null };
export type EditProps = { style: Style; plan: Plan; timeline: Timeline; media: EditMedia };
// `ink` y `on` sólo existen en paletas derivadas de un color de marca: la tinta sobre
// papel y sobre el fondo de color cuando el color tal cual no se leería.
export type Theme = { accent: string; light: string; dark: string; ink?: string; on?: string; on_muted?: string };

// Los medios son rutas de `public/` (local) o URLs completas (firmadas, en la nube).
export const asset = (path: string) => (/^https?:/.test(path) ? path : staticFile(path));

// Todo lo que una edición necesita: estilo y plan, montaje y medios de un video.
export const buildEdit = ({ style: houseStyle, plan, timeline, media }: EditProps) => {
  const style = applyPreferences(houseStyle, plan.preferences);
  const clips = timeline.clips;
  const isSample = timeline.is_sample === true;
  const words = clips.flatMap((clip) =>
    clip.words.map((word) => ({
      id: word.id,
      text: word.text,
      frame: clip.timeline_in_frame + word.source_start_frame - clip.source_in_frame,
    })),
  );
  const wordFrames = new Map(words.map((word) => [word.id, word.frame]));
  const themes = style.themes as Record<string, Theme>;
  return {
    style,
    plan,
    media,
    clips,
    isSample,
    sfx: plan.preferences?.sfx !== "none",
    captionPreset: (plan.preferences?.captions ?? "pink") as CaptionPreset,
    emphasis: new Set(plan.emphasis_word_ids ?? []),
    durationFrames: timeline.duration_frames,
    resolveFrame: (anchor: Anchor, id: string): number => {
      if (isSample) return anchor.sample_frame ?? 0;
      const frame = wordFrames.get(anchor.anchor_word_id);
      if (frame === undefined) {
        throw new Error(`Evento ${id}: no existe la palabra ${anchor.anchor_word_id}.`);
      }
      return frame + anchor.offset_frames;
    },
    // Palabras consecutivas de un tramo, con su frame en el montaje.
    wordsBetween: (firstId: string, lastId: string) => {
      const first = words.findIndex((word) => word.id === firstId);
      const last = words.findIndex((word) => word.id === lastId);
      return first < 0 || last < first ? [] : words.slice(first, last + 1);
    },
    // Azul de base; el color cambia con el tema de la frase (salud, estrés).
    themeOf: (name: string): Theme => themes[name] ?? themes.base,
  };
};

export type Edit = ReturnType<typeof buildEdit>;
export const EditContext = createContext<Edit | null>(null);
export const useEdit = (): Edit => {
  const edit = useContext(EditContext);
  if (!edit) throw new Error("Falta EditContext: el componente debe ir dentro de PinkEdit.");
  return edit;
};

export const ThemeContext = createContext<Theme>({ accent: "#1f5fc4", light: "#6aa6ff", dark: "#174a9c" });

// Luminancia relativa (WCAG) para elegir tintas legibles sin depender del fondo.
export const relativeLuminance = (hex: string): number => {
  const channel = (index: number) => {
    const value = parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
};

// Palabra resaltada: la tinta conserva el color de marca y va sobre una placa
// sólida que contrasta con ella (precedente: la placa del karaoke en OneShotVideo).
// La placa garantiza la lectura sobre cielos claros, fondos oscuros o texturas
// sin conocer el fondo; su relleno además separa las palabras entre sí.
export const highlightInk = (theme: Theme): { color: string; backplate: string } => {
  const dark = relativeLuminance(theme.accent) < 0.5;
  return {
    color: theme.accent,
    backplate: dark ? "rgba(255,255,255,.94)" : "rgba(16,16,20,.78)",
  };
};
// Placa de karaoke: la insignia conserva el color de marca y la tinta se elige
// por la mayor relación de contraste WCAG, para que la palabra activa se lea
// tanto con acentos claros como con un color de marca oscuro (pendiente
// estético anotado en docs/estrategia/06-pocs-y-plan.md, POC 2).
const contrastRatio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
export const karaokeInk = (brandColor: string): { background: string; color: string } => {
  const luminance = relativeLuminance(brandColor);
  const darkInk = relativeLuminance("#171717");
  return { background: brandColor, color: contrastRatio(luminance, 1) > contrastRatio(luminance, darkInk) ? "#ffffff" : "#171717" };
};
export const useTheme = () => useContext(ThemeContext);
