import { Audio } from "@remotion/media";
import { Easing, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import config from "../full-demo-config.json";

const style = config.graphics;
type GraphicKind = "patients" | "emergency" | "risk";

const GraphicCard: React.FC<{ kind: GraphicKind; duration: number }> = ({ kind, duration }) => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.16, 1, 0.3, 1);
  const progress = interpolate(frame, [0, style.enter_frames], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease,
  });
  const highlight = interpolate(frame, [21, 35], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease,
  });
  return (
    <div style={{
      position: "absolute", left: style.left, top: style.top,
      width: style.width, height: style.height, borderRadius: style.radius,
      background: `linear-gradient(145deg, #fffefc, ${style.background})`,
      border: "2px solid rgba(255,255,255,.85)",
      boxShadow: "0 22px 54px rgba(29,18,13,.19), inset 0 -2px 0 rgba(111,75,54,.07)",
      overflow: "hidden", color: style.ink, fontFamily: config.captions.font_family,
      fontSize: config.captions.font_size, fontWeight: config.captions.font_weight,
      letterSpacing: `${config.captions.letter_spacing_em}em`,
      opacity: interpolate(frame, [0, 5, duration - style.exit_frames, duration], [0, 1, 1, 0], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      }),
      translate: interpolate(frame, [0, style.enter_frames], [`0px ${style.enter_offset}px`, "0px 0px"], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease,
      }),
    }}>
      <svg width={style.width} height={style.height} viewBox="0 0 864 246" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id={`accent-${kind}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#efb09a" /><stop offset="100%" stopColor={style.accent} />
          </linearGradient>
          <linearGradient id={`avatar-${kind}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ebe3dc" /><stop offset="100%" stopColor={style.muted} />
          </linearGradient>
        </defs>
        <path d="M42 26 H822" stroke="#fff" strokeWidth="2" />
        {kind === "patients" && <>
          <path d="M314 52 V194" stroke={style.line} strokeWidth="2" />
          {[410, 518, 626, 734].map((x, index) => (
            <g key={x} opacity={interpolate(frame, [index * 3, index * 3 + 12], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}>
              <circle cx={x} cy="123" r="47" fill={index === 0 ? `url(#accent-${kind})` : `url(#avatar-${kind})`} />
              <circle cx={x} cy="108" r="13" fill={index === 0 ? "#fff9f4" : "#fffaf6"} />
              <path d={`M${x - 25} 149 Q${x - 24} 126 ${x} 126 Q${x + 24} 126 ${x + 25} 149`} fill="#fffaf6" />
              {index === 0 && <circle cx={x} cy="123" r="56" fill="none" stroke={style.accent} strokeWidth="3" opacity={highlight} />}
            </g>
          ))}
        </>}
        {kind === "emergency" && <>
          <circle cx="682" cy="123" r="67" fill="#f3e7df" />
          <path d="M682 78 L732 160 H632 Z" fill="none" stroke={style.accent} strokeWidth="6" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} />
          <path d="M682 104 V128" stroke={style.accent} strokeWidth="6" strokeLinecap="round" />
          <circle cx="682" cy="144" r="3.5" fill={style.accent} />
          <g opacity={interpolate(frame, [49, 57], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}>
            <path d="M784 154 V94 M762 116 L784 94 L806 116" fill="none" stroke={style.ink} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </>}
        {kind === "risk" && <>
          <path d="M300 52 V194" stroke={style.line} strokeWidth="2" />
          <rect x="350" y="80" width="205" height="32" rx="16" fill={style.muted} />
          <rect x="350" y="134" width={205 + highlight * 205} height="32" rx="16" fill={`url(#accent-${kind})`} />
          <circle cx={350 + 205 + highlight * 205} cy="150" r="6" fill="#fff8f1" />
        </>}
      </svg>
      <div style={{position: "absolute", left: 46, top: 65, lineHeight: "112px"}}>
        {kind === "patients" ? "1 / 4" : kind === "emergency" ? "Emergencia" : "2×"}
      </div>
    </div>
  );
};

const SoundCue: React.FC<{ index: number }> = ({ index }) => {
  const cue = config.audio.sfx[index];
  const { fps } = useVideoConfig();
  return <Audio name={cue.id} src={staticFile(cue.file)} premountFor={fps}
    volume={(frame) => Math.pow(10, cue.gain_db / 20) * interpolate(
      frame, [0, 2, cue.duration_frames - 4, cue.duration_frames], [0, 1, 1, 0],
      {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
    )} />;
};

export const EditorialGraphics: React.FC = () => {
  const { fps } = useVideoConfig();
  return <>
    <Sequence name="Gráfico: uno de cuatro" from={339} durationInFrames={160} premountFor={fps}><GraphicCard kind="patients" duration={160} /></Sequence>
    <Sequence name="Gráfico: emergencia" from={708} durationInFrames={77} premountFor={fps}><GraphicCard kind="emergency" duration={77} /></Sequence>
    <Sequence name="Gráfico: duplica" from={1022} durationInFrames={66} premountFor={fps}><GraphicCard kind="risk" duration={66} /></Sequence>
    <Sequence name="SFX: entrada pacientes" from={339} durationInFrames={40} premountFor={fps}><SoundCue index={0} /></Sequence>
    <Sequence name="SFX: destaca uno" from={360} durationInFrames={10} premountFor={fps}><SoundCue index={1} /></Sequence>
    <Sequence name="SFX: entrada emergencia" from={708} durationInFrames={40} premountFor={fps}><SoundCue index={2} /></Sequence>
    <Sequence name="SFX: presión sube" from={757} durationInFrames={14} premountFor={fps}><SoundCue index={3} /></Sequence>
    <Sequence name="SFX: entrada duplica" from={1022} durationInFrames={40} premountFor={fps}><SoundCue index={4} /></Sequence>
    <Sequence name="SFX: segunda barra" from={1041} durationInFrames={10} premountFor={fps}><SoundCue index={5} /></Sequence>
  </>;
};
