import { Video } from "@remotion/media";
import type { Caption } from "@remotion/captions";
import {
  Composition,
  Easing,
  Series,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import timeline from "./pool-full-timeline.json";
import config from "../full-demo-config.json";
import { EditorialGraphics } from "./EditorialGraphics";

type AlignedWord = {
  id: string;
  text: string;
  source_start_frame: number;
  source_end_frame: number;
  alignment_score: number | null;
};
type CaptionPage = {
  start_frame: number;
  end_frame: number;
  lines: AlignedWord[][];
};

const settings = config.captions;
const isSample = (timeline as { is_sample?: boolean }).is_sample === true;

const FullCaptions: React.FC<{ pages: CaptionPage[] }> = ({ pages }) => {
  // El tiempo heredado del grupo corresponde al raw, junto con su video.
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const page = pages.find(
    (candidate) => frame >= candidate.start_frame && frame < candidate.end_frame,
  );
  if (!page) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: settings.top,
        left: (config.width - settings.max_width) / 2,
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

const SpeechContent: React.FC<{ clipIndex: number }> = ({ clipIndex }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {isSample ? <div style={{position: "absolute", inset: 0, background: "#272323"}} /> : <Video
        name="Imagen y voz originales"
        src={staticFile("client/pool-raw-full.mp4")}
        premountFor={fps}
        objectFit="cover"
        style={{ width: "100%", height: "100%" }}
      />}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, transparent 47%, rgba(0,0,0,.07) 68%, rgba(0,0,0,.32) 100%)",
          pointerEvents: "none",
        }}
      />
      <FullCaptions pages={timeline.clips[clipIndex].pages} />
    </>
  );
};

const PoolFullDemo: React.FC = () => {
  const { fps } = useVideoConfig();
  // Cada toma es un nodo editable; su trim mueve video, voz y captions juntos.
  return (
    <>
    <Series>
      <Series.Sequence name="01 Inicio" trimBefore={56} durationInFrames={166} premountFor={fps}>
        <SpeechContent clipIndex={0} />
      </Series.Sequence>
      <Series.Sequence name="02 Sensación y enfermedad" trimBefore={452} durationInFrames={130} premountFor={fps}>
        <SpeechContent clipIndex={1} />
      </Series.Sequence>
      <Series.Sequence name="03 Uno de cada cuatro" trimBefore={763} durationInFrames={203} premountFor={fps}>
        <SpeechContent clipIndex={2} />
      </Series.Sequence>
      <Series.Sequence name="04 Efectos del estrés" trimBefore={1119} durationInFrames={131} premountFor={fps}>
        <SpeechContent clipIndex={3} />
      </Series.Sequence>
      <Series.Sequence name="05 Modo de emergencia" trimBefore={1428} durationInFrames={155} premountFor={fps}>
        <SpeechContent clipIndex={4} />
      </Series.Sequence>
      <Series.Sequence name="06 Enfermar y sanar" trimBefore={1731} durationInFrames={114} premountFor={fps}>
        <SpeechContent clipIndex={5} />
      </Series.Sequence>
      <Series.Sequence name="07 Estudios y diabetes" trimBefore={2022} durationInFrames={189} premountFor={fps}>
        <SpeechContent clipIndex={6} />
      </Series.Sequence>
      <Series.Sequence name="08 Reflexión completa" trimBefore={2407} durationInFrames={380} premountFor={fps}>
        <SpeechContent clipIndex={7} />
      </Series.Sequence>
      <Series.Sequence name="09 Consecuencia y despedida" trimBefore={2929} durationInFrames={131} premountFor={fps}>
        <SpeechContent clipIndex={8} />
      </Series.Sequence>
    </Series>
    <EditorialGraphics />
    </>
  );
};

export const FullDemoComposition = () => (
  <Composition
    id="PoolFullDemo"
    component={PoolFullDemo}
    durationInFrames={1599}
    fps={30}
    width={1080}
    height={1920}
  />
);
