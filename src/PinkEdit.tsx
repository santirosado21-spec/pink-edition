import { Video } from "@remotion/media";
import type { Caption } from "@remotion/captions";
import {
  Easing,
  Series,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BackgroundEffects } from "./BackgroundEffects";
import { ColorCuts } from "./ColorCuts";
import { EditorialGraphics } from "./EditorialGraphics";
import { SoundDesign } from "./SoundDesign";
import { EditContext, asset, buildEdit, highlightInk, useEdit, type CaptionPage, type EditProps } from "./edit";
import { pictureTransform } from "./zooms";

// Estilos «keyword» y «karaoke»: mismo tamaño, fuente y paginación que «pink»; sólo
// cambian el color, la escala de la palabra resaltada y cuándo aparece cada palabra.
const PresetCaptions: React.FC<{ page: CaptionPage; frame: number }> = ({ page, frame }) => {
  const { style, captionPreset, emphasis, themeOf } = useEdit();
  const settings = style.captions;
  const ink = highlightInk(themeOf("base"));
  const words = page.lines.flat();
  const active = words.reduce<string | null>((found, word) => (word.source_start_frame <= frame ? word.id : found), null);
  const ease = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1) } as const;
  return (
    <div
      style={{
        position: "absolute",
        top: settings.top,
        left: (style.width - settings.max_width) / 2,
        width: settings.max_width,
        fontFamily: settings.font_family,
        fontSize: settings.font_size,
        fontWeight: settings.font_weight,
        color: settings.color,
        textShadow: settings.shadow,
      }}
    >
      {page.lines.map((line, lineIndex) => (
        <div
          key={`${page.start_frame}-${lineIndex}`}
          style={{ display: "flex", justifyContent: "center", alignItems: "baseline", height: settings.line_height, lineHeight: `${settings.line_height}px`, gap: settings.word_gap, whiteSpace: "nowrap" }}
        >
          {line.map((word) => {
            const reveal = [word.source_start_frame, word.source_start_frame + settings.reveal_frames];
            // keyword: con palabras marcadas se resaltan sólo ésas; sin marcas, la que suena.
            const highlighted = captionPreset === "keyword" ? (emphasis.size > 0 ? emphasis.has(word.id) : word.id === active) : word.id === active;
            const karaoke = captionPreset === "karaoke";
            return (
              <span
                key={word.id}
                style={{
                  letterSpacing: `${settings.letter_spacing_em}em`,
                  color: highlighted ? ink.color : settings.color,
                  background: highlighted ? ink.backplate : undefined,
                  borderRadius: highlighted ? 14 : undefined,
                  padding: highlighted ? "0 14px" : undefined,
                  margin: highlighted ? "0 3px" : undefined,
                  opacity: karaoke ? (word.source_start_frame <= frame ? 1 : 0.45) : interpolate(frame, reveal, [0, 1], ease),
                  translate: karaoke ? undefined : interpolate(frame, reveal, [`0px ${settings.lift_pixels}px`, "0px 0px"], ease),
                  scale: !karaoke && highlighted ? "1.08" : undefined,
                  transformOrigin: "50% 100%",
                }}
              >
                {word.text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const FullCaptions: React.FC<{ pages: CaptionPage[] }> = ({ pages }) => {
  // El tiempo heredado del grupo corresponde al raw, junto con su video.
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { style, captionPreset } = useEdit();
  const settings = style.captions;
  const page = pages.find(
    (candidate) => frame >= candidate.start_frame && frame < candidate.end_frame,
  );
  if (!page) return null;
  // «pink» sigue exactamente el camino de siempre (resultado idéntico).
  if (captionPreset !== "pink") return <PresetCaptions page={page} frame={frame} />;

  return (
    <div
      style={{
        position: "absolute",
        top: settings.top,
        left: (style.width - settings.max_width) / 2,
        width: settings.max_width,
        fontFamily: settings.font_family,
        fontSize: settings.font_size,
        fontWeight: settings.font_weight,
        color: settings.color,
        textShadow: settings.shadow,
      }}
    >
      {page.lines.map((line, lineIndex) => (
        <div
          key={`${page.start_frame}-${lineIndex}`}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "baseline",
            height: settings.line_height,
            lineHeight: `${settings.line_height}px`,
            gap: settings.word_gap,
            whiteSpace: "nowrap",
          }}
        >
          {line.map((word) => {
            // Normaliza el JSON al tipo Caption del SDK sin cambiar la voz.
            const caption: Caption = {
              text: word.text,
              startMs: (word.source_start_frame * 1000) / fps,
              endMs: (word.source_end_frame * 1000) / fps,
              timestampMs: null,
              confidence: word.alignment_score,
            };
            return (
              <span
                key={word.id}
                style={{
                  letterSpacing: `${settings.letter_spacing_em}em`,
                  opacity: interpolate(
                    frame,
                    [word.source_start_frame, word.source_start_frame + settings.reveal_frames],
                    [0, 1],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                      easing: Easing.bezier(0.22, 1, 0.36, 1),
                    },
                  ),
                  translate: interpolate(
                    frame,
                    [word.source_start_frame, word.source_start_frame + settings.reveal_frames],
                    [`0px ${settings.lift_pixels}px`, "0px 0px"],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                      easing: Easing.bezier(0.22, 1, 0.36, 1),
                    },
                  ),
                }}
              >
                {caption.text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// Imagen y captions comparten el mismo recorte temporal por toma.
const ClipSeries: React.FC<{ label: string; render: (index: number) => React.ReactNode }> = ({ label, render }) => {
  const { fps } = useVideoConfig();
  const { plan, clips } = useEdit();
  return (
    <Series>
      {clips.map((clip, index) => (
        <Series.Sequence
          key={clip.id}
          name={`${label}: ${plan.clip_labels?.[index] ?? clip.id}`}
          trimBefore={clip.source_in_frame}
          durationInFrames={clip.duration_frames}
          premountFor={fps}
        >
          {render(index)}
        </Series.Sequence>
      ))}
    </Series>
  );
};

const fill = { position: "absolute", inset: 0 } as const;
const video = { width: "100%", height: "100%" } as const;

// Una edición completa de un video: recibe estilo y plan, montaje y medios.
export const PinkEdit: React.FC<EditProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const edit = buildEdit(props);
  const { style, plan, clips, isSample, media } = edit;
  const transition = plan.take_transition ?? plan.preferences?.transition ?? "none";
  const intro = plan.intro_blur ?? style.intro_blur;
  const blur = interpolate(frame, [intro.hold_frames, intro.hold_frames + intro.release_frames], [intro.pixels, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  // Ritmo: zoom activo (sube en 3 frames y vuelve de golpe) y pulso de la transición de toma.
  const take = clips.findIndex((clip) => frame >= clip.timeline_in_frame && frame < clip.timeline_in_frame + clip.duration_frames);
  const active = (plan.zooms ?? []).find((event) => {
    const start = edit.resolveFrame(event, event.id);
    return frame >= start && frame < start + event.duration_frames;
  });
  const zoomTarget = active ? active.scale : 1;
  const zoom = active ? interpolate(frame, [edit.resolveFrame(active, active.id), edit.resolveFrame(active, active.id) + 3], [1, active.scale], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const takeStart = take > 0 ? clips[take].timeline_in_frame : -1;
  const punch = transition === "punch" && take > 0 && frame < takeStart + 8
    ? interpolate(frame, [takeStart, takeStart + 8], [1.06, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1) })
    : 1;
  // Sin efecto, la imagen conserva exactamente la transformación de siempre.
  const punchPeak = punch === 1 ? 1 : 1.06;
  const framed = zoomTarget * punchPeak === 1 ? null : pictureTransform(take >= 0 ? clips[take].head : null, 1 + blur / 400, { zoom, punch }, { zoom: zoomTarget, punch: punchPeak }, style);
  const flash = transition === "flash" && take > 0 && frame < takeStart + 5 ? interpolate(frame, [takeStart, takeStart + 5], [0.55, 0]) : 0;
  return (
    <EditContext.Provider value={edit}>
      {/* El filtro sólo existe mientras desenfoca: después apagaría el vidrio de las tarjetas. */}
      <div style={{ ...fill, filter: blur > 0 ? `blur(${blur}px)` : undefined, scale: String(framed ? framed.scale : 1 + blur / 400), transformOrigin: framed ? `${framed.originX}px ${framed.originY}px` : undefined }}>
        <ClipSeries
          label="Fondo"
          render={() =>
            isSample ? (
              <div style={{ ...fill, background: "#272323" }} />
            ) : (
              <Video name="Imagen y voz originales" src={asset(media.source)} premountFor={fps} objectFit="cover" style={video} />
            )
          }
        />
        {/* Una sola imagen en movimiento. El matte se usa para medir posiciones,
            nunca como segundo decoder superpuesto (Safari podía desincronizarlo). */}
      </div>
      {/* Los gráficos no heredan el zoom del video; su posición protege cara y captions. */}
      <BackgroundEffects />
      <EditorialGraphics />
      {flash > 0 ? <div style={{ ...fill, background: "#ffffff", opacity: flash }} /> : null}
      <ClipSeries
        label="Captions"
        render={(index) => (
          <>
            <div style={{ ...fill, background: "linear-gradient(180deg, transparent 47%, rgba(0,0,0,.07) 68%, rgba(0,0,0,.32) 100%)" }} />
            <FullCaptions pages={clips[index].pages} />
          </>
        )}
      />
      <ColorCuts />
      <SoundDesign />
    </EditContext.Provider>
  );
};
