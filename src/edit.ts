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
};
export type Timeline = { is_sample?: boolean; duration_frames: number; clips: SpeechClip[] };
// El estilo es fijo por look; el plan son las decisiones de un video
// (`schema/edit-plan.schema.json`).
export type Style = typeof styleJson;
// Todo se ancla a una palabra; el frame absoluto sólo sirve con datos ficticios.
export type Anchor = { anchor_word_id: string; offset_frames: number; sample_frame?: number };
export type PlanEvent = Anchor & { id: string; label: string; theme: string; duration_frames: number };
export type CutEvent = PlanEvent & { style: string; last_word_id: string };
export type CardEvent = PlanEvent & { kind: string; top?: number; beat: Anchor; meaning?: string; text?: string };
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
export const useTheme = () => useContext(ThemeContext);
