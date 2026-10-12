import { Audio } from "@remotion/media";
import { Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { useEdit } from "./edit";

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
  const { style, plan, clips, resolveFrame, sfx } = useEdit();
  const audio = style.audio;
  // El creador puede pedir el video sin efectos: queda sólo su voz.
  if (!sfx) return null;
  const cardEntries = plan.cards.map((card) => resolveFrame(card, card.id));
  // Un barrido por frontera de toma; su pico cae en el corte. Se alternan sonidos
  // y se cede el sitio si una tarjeta entra casi a la vez.
  const cuts = clips
    .slice(1)
    .map((clip, index) => ({ frame: clip.timeline_in_frame, sound: audio.cut_sfx.sounds[index % audio.cut_sfx.sounds.length] }))
    .filter((cut) => cardEntries.every((entry) => Math.abs(entry - cut.frame) > audio.cut_sfx.skip_near_card_frames));
  // Tarjetas y cortes de color no traen sonido en el plan: lo pone el estilo.
  const cues = [
    ...plan.cards.map((card, index) => ({ id: `${card.id}_enter`, label: `entra ${card.label}`, frame: cardEntries[index], sound: audio.card_enter_sfx })),
    ...plan.cards
      .filter((card) => !audio.card_beat_sfx.silent_kinds.includes(card.kind))
      .map((card) => ({ id: `${card.id}_beat`, label: `énfasis ${card.label}`, frame: resolveFrame(card.beat, card.id), sound: audio.card_beat_sfx })),
    ...plan.cuts.map((cut) => ({
      id: `${cut.id}_cut`,
      label: `corte de color ${cut.label}`,
      frame: resolveFrame(cut, cut.id) - audio.color_cut_sfx.lead_frames,
      sound: audio.color_cut_sfx,
    })),
  ];
  const intro = audio.intro_sfx;
  return (
    <>
      <Sequence name="SFX: inicio" from={0} durationInFrames={intro.duration_frames} premountFor={fps}>
        <Cue file={intro.file} gainDb={intro.gain_db} duration={intro.duration_frames} trimBefore={intro.trim_before_frames} />
      </Sequence>
      {cuts.map(({ frame, sound }) => (
        <Sequence key={frame} name={`SFX: corte ${frame}`} from={frame - sound.peak_frames} durationInFrames={sound.duration_frames} premountFor={fps}>
          <Cue file={sound.file} gainDb={audio.cut_sfx.gain_db} duration={sound.duration_frames} />
        </Sequence>
      ))}
      {cues.map((cue) => (
        <Sequence key={cue.id} name={`SFX: ${cue.label}`} from={cue.frame} durationInFrames={cue.sound.duration_frames} premountFor={fps}>
          <Cue file={cue.sound.file} gainDb={cue.sound.gain_db} duration={cue.sound.duration_frames} />
        </Sequence>
      ))}
    </>
  );
};
