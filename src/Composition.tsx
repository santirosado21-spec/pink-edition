import { Video } from "@remotion/media";
import {
  Composition,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import timelineData from "./pool-timeline.json";

type Word = { text: string; start_frame: number; end_frame: number };
type LayoutLine = { x: number; baseline: number };
type CaptionEvent = {
  id: string;
  start_frame: number;
  lines: string[];
  layout: { lines: LayoutLine[] };
  words: Word[];
};

const events = timelineData.visual_events as CaptionEvent[];
const isSample = (timelineData as { is_sample?: boolean }).is_sample === true;

const Phrase: React.FC<{ event: CaptionEvent }> = ({ event }) => {
  const frame = useCurrentFrame();
  let wordCursor = 0;

  return (
    <>
      {event.lines.map((line, lineIndex) => {
        const tokens = line.split(/\s+/);
        const lineWords = event.words.slice(wordCursor, wordCursor + tokens.length);
        wordCursor += tokens.length;
        const position = event.layout.lines[lineIndex];

        return (
          <div
            key={`${event.id}-${lineIndex}`}
            style={{
              position: "absolute",
              left: position.x * 1.5,
              top: position.baseline * 1.5 - 102,
              display: "flex",
              alignItems: "baseline",
              whiteSpace: "pre",
              fontFamily: "InterDisplay",
              fontSize: 114,
              fontWeight: 700,
              letterSpacing: "-0.075em",
              lineHeight: 1.0,
              color: "#fff",
              textShadow: "0 3px 16px rgba(0,0,0,.38)",
            }}
          >
            {tokens.map((token, index) => {
              const word = lineWords[index];
              const firstFrame = Math.max(0, word.start_frame - event.start_frame);
              const opacity = interpolate(
                frame,
                [firstFrame, firstFrame + 5],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.22, 1, 0.36, 1),
                },
              );
              const lift = interpolate(
                frame,
                [firstFrame, firstFrame + 5],
                [8, 0],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.22, 1, 0.36, 1),
                },
              );

              return (
                <span
                  key={`${event.id}-${index}`}
                  style={{
                    opacity,
                    translate: `0px ${lift}px`,
                    marginRight: index === tokens.length - 1 ? 0 : 21,
                  }}
                >
                  {token}
                </span>
              );
            })}
          </div>
        );
      })}
    </>
  );
};

const PoolStylePreview: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <>
      {isSample ? <div style={{position: "absolute", inset: 0, background: "#272323"}} /> : <Video
        name="Raw de piscina"
        src={staticFile("client/pool-preview.mp4")}
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
      <Sequence name="Caption s01" from={events[0].start_frame} durationInFrames={events[1].start_frame - events[0].start_frame} premountFor={fps}><Phrase event={events[0]} /></Sequence>
      <Sequence name="Caption s02" from={events[1].start_frame} durationInFrames={events[2].start_frame - events[1].start_frame} premountFor={fps}><Phrase event={events[1]} /></Sequence>
      <Sequence name="Caption s03" from={events[2].start_frame} durationInFrames={events[3].start_frame - events[2].start_frame} premountFor={fps}><Phrase event={events[2]} /></Sequence>
      <Sequence name="Caption s04" from={events[3].start_frame} durationInFrames={events[4].start_frame - events[3].start_frame} premountFor={fps}><Phrase event={events[3]} /></Sequence>
      <Sequence name="Caption s05" from={events[4].start_frame} durationInFrames={events[5].start_frame - events[4].start_frame} premountFor={fps}><Phrase event={events[4]} /></Sequence>
      <Sequence name="Caption s06" from={events[5].start_frame} durationInFrames={events[6].start_frame - events[5].start_frame} premountFor={fps}><Phrase event={events[5]} /></Sequence>
      <Sequence name="Caption s07" from={events[6].start_frame} durationInFrames={events[7].start_frame - events[6].start_frame} premountFor={fps}><Phrase event={events[6]} /></Sequence>
      <Sequence name="Caption s08" from={events[7].start_frame} durationInFrames={events[8].start_frame - events[7].start_frame} premountFor={fps}><Phrase event={events[7]} /></Sequence>
      <Sequence name="Caption s09" from={events[8].start_frame} durationInFrames={events[9].start_frame - events[8].start_frame} premountFor={fps}><Phrase event={events[8]} /></Sequence>
      <Sequence name="Caption s10" from={events[9].start_frame} durationInFrames={events[10].start_frame - events[9].start_frame} premountFor={fps}><Phrase event={events[9]} /></Sequence>
      <Sequence name="Caption s11" from={events[10].start_frame} durationInFrames={events[11].start_frame - events[10].start_frame} premountFor={fps}><Phrase event={events[10]} /></Sequence>
      <Sequence name="Caption s12" from={events[11].start_frame} durationInFrames={timelineData.duration_frames - events[11].start_frame} premountFor={fps}><Phrase event={events[11]} /></Sequence>
    </>
  );
};

export const MyComposition = () => (
  <Composition
    id="PoolStylePreview"
    component={PoolStylePreview}
    durationInFrames={timelineData.duration_frames}
    fps={timelineData.fps}
    width={1080}
    height={1920}
  />
);
