import { Audio } from "@remotion/media";
import { Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import config from "../full-demo-config.json";
import { clips, durationFrames, resolveFrame } from "./timeline";

const audio = config.audio;

const Cue: React.FC<{ file: string; gainDb: number; duration: number; trimBefore?: number }> = ({ file, gainDb, duration, trimBefore }) => {
  const { fps } = useVideoConfig();
  return (
    <Audio
      src={staticFile(file)}
      premountFor={fps}
      trimBefore={trimBefore}
      volume={(frame) =>
        Math.pow(10, gainDb / 20) *
        // Sin fundido de entrada: los golpes cortos tienen el ataque en el primer frame.
        interpolate(frame, [duration - 4, duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      }
    />
  );
};

export const SoundDesign: React.FC = () => {
  const { fps } = useVideoConfig();
  const cardEntries = config.graphics.events.map(resolveFrame);
  // Un barrido por frontera de toma; su pico cae en el corte. Se alternan sonidos
  // y se cede el sitio si una tarjeta entra casi a la vez.
  const cuts = clips
    .slice(1)
    .map((clip, index) => ({ frame: clip.timeline_in_frame, sound: audio.cut_sfx.sounds[index % audio.cut_sfx.sounds.length] }))
    .filter((cut) => cardEntries.every((entry) => Math.abs(entry - cut.frame) > audio.cut_sfx.skip_near_card_frames));
  const intro = audio.intro_sfx;
  // La música es opcional: `audio.music` puede ser null.
  const music = audio.music as null | { file: string; title: string; gain_db: number; fade_in_frames: number; fade_out_frames: number };
  return (
    <>
      {music ? (
        <Audio
          name={`Música: ${music.title}`}
          src={staticFile(music.file)}
          volume={(frame) =>
            Math.pow(10, music.gain_db / 20) *
            interpolate(frame, [0, music.fade_in_frames, durationFrames - music.fade_out_frames, durationFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          }
        />
      ) : null}
      <Sequence name="SFX: inicio" from={0} durationInFrames={intro.duration_frames} premountFor={fps}>
        <Cue file={intro.file} gainDb={intro.gain_db} duration={intro.duration_frames} trimBefore={intro.trim_before_frames} />
      </Sequence>
      {cuts.map(({ frame, sound }) => (
        <Sequence key={frame} name={`SFX: corte ${frame}`} from={frame - sound.peak_frames} durationInFrames={sound.duration_frames} premountFor={fps}>
          <Cue file={sound.file} gainDb={audio.cut_sfx.gain_db} duration={sound.duration_frames} />
        </Sequence>
      ))}
      {audio.sfx.map((cue) => (
        <Sequence key={cue.id} name={`SFX: ${cue.label}`} from={resolveFrame(cue)} durationInFrames={cue.duration_frames} premountFor={fps}>
          <Cue file={cue.file} gainDb={cue.gain_db} duration={cue.duration_frames} />
        </Sequence>
      ))}
    </>
  );
};
