import { Video } from "@remotion/media";
import type { Caption } from "@remotion/captions";
import {
  Composition,
  OffthreadVideo,
  Easing,
  Series,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import defaultPlan from "../projects/piscina/plan.json";
import defaultStyle from "../style/pink-demo-v1.json";
import defaultTimeline from "./pool-full-timeline.json";
import { BackgroundEffects } from "./BackgroundEffects";
import { ColorCuts } from "./ColorCuts";
import { EditorialGraphics } from "./EditorialGraphics";
import { SoundDesign } from "./SoundDesign";
import { EditContext, buildEdit, useEdit, type CaptionPage, type EditProps, type Plan, type Timeline } from "./edit";

const FullCaptions: React.FC<{ pages: CaptionPage[] }> = ({ pages }) => {
  // El tiempo heredado del grupo corresponde al raw, junto con su video.
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { style } = useEdit();
  const settings = style.captions;
  const page = pages.find(
    (candidate) => frame >= candidate.start_frame && frame < candidate.end_frame,
  );
  if (!page) return null;

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

// Tres capas por toma comparten trim: fondo, persona recortada y captions.
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
const PinkEdit: React.FC<EditProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const edit = buildEdit(props);
  const { style, plan, clips, isSample, media } = edit;
  const intro = plan.intro_blur ?? style.intro_blur;
  const blur = interpolate(frame, [intro.hold_frames, intro.hold_frames + intro.release_frames], [intro.pixels, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  return (
    <EditContext.Provider value={edit}>
      {/* El filtro sólo existe mientras desenfoca: después apagaría el vidrio de las tarjetas. */}
      <div style={{ ...fill, filter: blur > 0 ? `blur(${blur}px)` : undefined, scale: String(1 + blur / 400) }}>
        <ClipSeries
          label="Fondo"
          render={() =>
            isSample ? (
              <div style={{ ...fill, background: "#272323" }} />
            ) : (
              <Video name="Imagen y voz originales" src={staticFile(media.source)} premountFor={fps} objectFit="cover" style={video} />
            )
          }
        />
        <BackgroundEffects />
        <EditorialGraphics />
        {/* La persona recortada vuelve a ir encima: los gráficos quedan detrás de ella. */}
        {isSample || !media.person ? null : (
          <ClipSeries
            label="Persona"
            render={() => <OffthreadVideo transparent muted src={staticFile(media.person as string)} style={{ ...video, objectFit: "cover" }} />}
          />
        )}
      </div>
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

const poolDefaults: EditProps = {
  style: defaultStyle,
  plan: defaultPlan as unknown as Plan,
  timeline: defaultTimeline as unknown as Timeline,
  media: { source: "client/pool-raw-full.mp4", person: "client/pool-person.webm" },
};

// `PinkEdit` edita cualquier video con `--props`; `PoolFullDemo` es la demo de piscina.
export const FullDemoComposition = () => (
  <>
    {["PinkEdit", "PoolFullDemo"].map((id) => (
      <Composition
        key={id}
        id={id}
        component={PinkEdit}
        defaultProps={poolDefaults}
        calculateMetadata={({ props }) => ({
          durationInFrames: props.timeline.duration_frames,
          fps: props.style.fps,
          width: props.style.width,
          height: props.style.height,
        })}
      />
    ))}
  </>
);
