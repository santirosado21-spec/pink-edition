import { Sequence, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import config from "../full-demo-config.json";
import { themeOf } from "./theme";
import { resolveFrame } from "./timeline";

const settings = config.background;

// Fondo detrás de la persona según el tema de la frase; sin azar por frame.
const Motif: React.FC<{ id: string; motif: string; duration: number; color: string }> = ({ id, motif, duration, color }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const shown = interpolate(frame, [0, settings.fade_frames, duration - settings.fade_frames, duration], [0, 1, 1, 0], clamp);
  const points = Array.from({ length: settings.points }, (_, index) => {
    const angle = random(`${id}-a-${index}`) * Math.PI * 2;
    const drift = 26 + random(`${id}-d-${index}`) * 30;
    const phase = (frame / 30) * (0.5 + random(`${id}-s-${index}`) * 0.6);
    return {
      x: random(`${id}-x-${index}`) * width + Math.cos(angle + phase) * drift,
      y: 180 + random(`${id}-y-${index}`) * (height * 0.62) + Math.sin(angle + phase) * drift,
      size: 4 + random(`${id}-r-${index}`) * 6,
      at: random(`${id}-t-${index}`) * settings.fade_frames * 1.5,
    };
  });
  const links: [number, number, number][] = [];
  points.forEach((a, i) => points.slice(i + 1).forEach((b, offset) => {
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (distance < settings.link_distance) links.push([i, i + 1 + offset, 1 - distance / settings.link_distance]);
  }));
  const cx = width / 2;
  const cy = height * 0.42;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, opacity: shown, background: settings.dim, backdropFilter: `saturate(${settings.saturate}) blur(${settings.blur}px)` }} />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: shown }}>
        {motif === "network" && links.map(([a, b, strength]) => (
          <line key={`${a}-${b}`} x1={points[a].x} y1={points[a].y} x2={points[b].x} y2={points[b].y} stroke={color} strokeWidth="2" opacity={strength * 0.55} />
        ))}
        {motif === "network" && points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={point.size} fill={color} opacity={interpolate(frame, [point.at, point.at + 8], [0, 0.9], clamp)} />
        ))}
        {/* Ondas de alarma que salen desde detrás de la persona. */}
        {motif === "rings" && [0, 1, 2, 3, 4].map((index) => {
          const phase = ((frame + index * 9) % 45) / 45;
          return <circle key={index} cx={cx} cy={cy} r={160 + phase * 760} fill="none" stroke={color} strokeWidth={10 - phase * 7} opacity={(1 - phase) * 0.8} />;
        })}
        {/* Cruces médicas en retícula, con un pulso suave escalonado. */}
        {motif === "crosses" && Array.from({ length: 35 }, (_, index) => {
          const x = 108 + (index % 5) * 216;
          const y = 190 + Math.floor(index / 5) * 216;
          const pulse = 0.35 + 0.45 * Math.max(0, Math.sin((frame - index * 3) / 7));
          return <path key={index} transform={`translate(${x} ${y})`} d="M-10 -34 H10 V-10 H34 V10 H10 V34 H-10 V10 H-34 V-10 H-10 Z" fill={color} opacity={pulse * interpolate(frame, [index, index + 8], [0, 1], clamp)} />;
        })}
      </svg>
    </>
  );
};

export const BackgroundEffects: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      {settings.events.map((event) => (
        <Sequence key={event.id} name={`Fondo: ${event.label}`} from={resolveFrame(event)} durationInFrames={event.duration_frames} premountFor={fps}>
          <Motif id={event.id} motif={event.motif} duration={event.duration_frames} color={themeOf(event.theme).light} />
        </Sequence>
      ))}
    </>
  );
};
