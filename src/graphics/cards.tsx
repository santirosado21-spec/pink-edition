import { Easing, interpolate, useCurrentFrame } from "remotion";
import config from "../../full-demo-config.json";
import { useTheme } from "../theme";

const style = config.graphics;
const W = style.width;
const H = style.height;
const ink = style.ink;
const muted = style.muted;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease } as const;

// `beat` es el frame, relativo a la tarjeta, de la palabra que marca el énfasis.
export type CardProps = { duration: number; beat: number };

const Canvas: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  return (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
    <defs>
      <linearGradient id="card-accent" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={theme.light} />
        <stop offset="100%" stopColor={theme.accent} />
      </linearGradient>
    </defs>
    {children}
  </svg>
  );
};

const Patients: React.FC<CardProps> = ({ beat }) => {
  const frame = useCurrentFrame();
  const highlight = interpolate(frame, [beat, beat + 14], [0, 1], clamp);
  return (
    <Canvas>
      {[0, 1, 2, 3].map((index) => {
        const x = W / 2 + (index - 1.5) * 150;
        const shown = interpolate(frame, [index * 3, index * 3 + 12], [0, 1], clamp);
        const first = index === 0;
        return (
          <g key={index} opacity={shown}>
            <circle cx={x} cy={H / 2} r="58" fill={first ? "url(#card-accent)" : muted} />
            <circle cx={x} cy={H / 2 - 18} r="16" fill={ink} />
            <path d={`M${x - 31} ${H / 2 + 34} Q${x - 30} ${H / 2 + 4} ${x} ${H / 2 + 4} Q${x + 30} ${H / 2 + 4} ${x + 31} ${H / 2 + 34}`} fill={ink} />
            {first && <circle cx={x} cy={H / 2} r={66 + (1 - highlight) * 14} fill="none" stroke={ink} strokeWidth="4" opacity={highlight} />}
          </g>
        );
      })}
    </Canvas>
  );
};

const Emergency: React.FC<CardProps> = ({ beat }) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [2, 18], [0, 1], clamp);
  const rise = interpolate(frame, [beat, beat + 12], [0, 1], clamp);
  const cx = W / 2 - 150;
  return (
    <Canvas>
      <circle cx={cx} cy={H / 2} r="86" fill="url(#card-accent)" opacity={draw} />
      <path d={`M${cx} ${H / 2 - 50} L${cx + 56} ${H / 2 + 42} H${cx - 56} Z`} fill="none" stroke={ink} strokeWidth="9" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} />
      <path d={`M${cx} ${H / 2 - 18} V${H / 2 + 10}`} stroke={ink} strokeWidth="9" strokeLinecap="round" opacity={draw} />
      <circle cx={cx} cy={H / 2 + 27} r="5.5" fill={ink} opacity={draw} />
      {/* Columna que sube al decir «presión»; sin escala ni cifras. */}
      <rect x={W / 2 + 60} y={H / 2 - 78} width="44" height="156" rx="22" fill={muted} opacity={draw} />
      <rect x={W / 2 + 60} y={H / 2 + 78 - (46 + rise * 110)} width="44" height={46 + rise * 110} rx="22" fill={ink} opacity={draw} />
      <g opacity={rise} transform={`translate(0 ${(1 - rise) * 26})`}>
        <path d={`M${W / 2 + 190} ${H / 2 + 46} V${H / 2 - 46} M${W / 2 + 156} ${H / 2 - 12} L${W / 2 + 190} ${H / 2 - 46} L${W / 2 + 224} ${H / 2 - 12}`} fill="none" stroke={ink} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </Canvas>
  );
};

const Risk: React.FC<CardProps> = ({ beat }) => {
  const frame = useCurrentFrame();
  const grow = interpolate(frame, [beat, beat + 14], [0, 1], clamp);
  const base = 180;
  return (
    <>
      <Canvas>
        <rect x="290" y={H / 2 - 52} width={base} height="40" rx="20" fill={muted} />
        <rect x="290" y={H / 2 + 12} width={base + grow * base} height="40" rx="20" fill="url(#card-accent)" />
        <circle cx={290 + base + grow * base - 20} cy={H / 2 + 32} r="8" fill={ink} />
      </Canvas>
      <div style={{ position: "absolute", left: 64, top: (H - config.captions.line_height) / 2, lineHeight: `${config.captions.line_height}px` }}>2×</div>
    </>
  );
};

const Illness: React.FC<CardProps> = ({ beat }) => {
  const frame = useCurrentFrame();
  const cloud = interpolate(frame, [2, 16], [0, 1], clamp);
  const turn = interpolate(frame, [beat, beat + 14], [0, 1], clamp);
  const left = W / 2 - 190;
  const right = W / 2 + 190;
  return (
    <Canvas>
      {/* Una sensación pasajera, que se apaga cuando se nombra la enfermedad. */}
      <g opacity={cloud * (1 - 0.62 * turn)} fill="none" stroke={ink} strokeWidth="9" strokeLinecap="round">
        {[-34, 0, 34].map((dy, index) => (
          <path key={dy} d={`M${left - 70} ${H / 2 + dy} q23 -22 46 0 t46 0 t46 0`} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - interpolate(frame, [2 + index * 3, 18 + index * 3], [0, 1], clamp)} />
        ))}
      </g>
      <path d={`M${W / 2 - 46} ${H / 2} H${W / 2 + 34} M${W / 2 + 10} ${H / 2 - 26} L${W / 2 + 38} ${H / 2} L${W / 2 + 10} ${H / 2 + 26}`} fill="none" stroke={ink} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity={turn} />
      <g opacity={turn} transform={`translate(${right} ${H / 2}) scale(${0.8 + 0.2 * turn})`}>
        <circle r="86" fill="url(#card-accent)" />
        <path d="M-14 -50 H14 V-14 H50 V14 H14 V50 H-14 V14 H-50 V-14 H-14 Z" fill={ink} />
      </g>
    </Canvas>
  );
};

const Body: React.FC<CardProps> = ({ beat }) => {
  const frame = useCurrentFrame();
  const shown = interpolate(frame, [2, 14], [0, 1], clamp);
  const flow = interpolate(frame, [beat, beat + 18], [0, 1], clamp);
  const pulse = 1 + 0.06 * Math.sin((frame / 30) * Math.PI * 2 * 1.4);
  const figure = (x: number, lit: number) => (
    <g>
      <circle cx={x} cy={H / 2 - 62} r={34 * (lit === 0 ? pulse : 1)} fill="url(#card-accent)" />
      <path d={`M${x - 64} ${H / 2 + 104} Q${x - 64} ${H / 2 - 16} ${x} ${H / 2 - 16} Q${x + 64} ${H / 2 - 16} ${x + 64} ${H / 2 + 104} Z`} fill={muted} />
      <clipPath id={`body-fill-${x}`}>
        <rect x={x - 70} y={H / 2 - 20} width="140" height={130 * lit} />
      </clipPath>
      <path d={`M${x - 64} ${H / 2 + 104} Q${x - 64} ${H / 2 - 16} ${x} ${H / 2 - 16} Q${x + 64} ${H / 2 - 16} ${x + 64} ${H / 2 + 104} Z`} fill="url(#card-accent)" clipPath={`url(#body-fill-${x})`} />
    </g>
  );
  return (
    <Canvas>
      <g opacity={shown}>
        {figure(W / 2 - 170, 0)}
        <path d={`M${W / 2 - 56} ${H / 2 + 10} H${W / 2 + 44} M${W / 2 + 18} ${H / 2 - 18} L${W / 2 + 48} ${H / 2 + 10} L${W / 2 + 18} ${H / 2 + 38}`} fill="none" stroke={ink} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity={0.35 + 0.65 * flow} />
        {figure(W / 2 + 170, flow)}
      </g>
    </Canvas>
  );
};

const Healing: React.FC<CardProps> = ({ duration }) => {
  const frame = useCurrentFrame();
  const shown = interpolate(frame, [2, 12], [0, 1], clamp);
  const quick = interpolate(frame, [6, 22], [0, 1], clamp);
  const slow = interpolate(frame, [6, duration], [0, 0.42], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ring = (x: number, amount: number, color: string) => (
    <g transform={`translate(${x} ${H / 2})`}>
      <circle r="78" fill="none" stroke={muted} strokeWidth="16" />
      <circle r="78" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - amount} transform="rotate(-90)" />
      <path d="M-11 -34 H11 V-11 H34 V11 H11 V34 H-11 V11 H-34 V-11 H-11 Z" fill={color} opacity={0.35 + 0.65 * amount} />
    </g>
  );
  return (
    <Canvas>
      <g opacity={shown}>
        {ring(W / 2 - 150, quick, ink)}
        {ring(W / 2 + 150, slow, "url(#card-accent)")}
      </g>
    </Canvas>
  );
};

const Bill: React.FC<CardProps> = ({ beat }) => {
  const frame = useCurrentFrame();
  const unroll = interpolate(frame, [2, 18], [0, 1], clamp);
  const total = interpolate(frame, [beat, beat + 10], [0, 1], clamp);
  const x = W / 2 - 150;
  const top = 34;
  const height = 182 * unroll;
  const teeth = Array.from({ length: 10 }, (_, index) => `L${x + 300 - index * 30 - 15} ${top + height + 14} L${x + 300 - (index + 1) * 30} ${top + height}`).join(" ");
  return (
    <Canvas>
      <path d={`M${x} ${top} H${x + 300} V${top + height} ${teeth} Z`} fill={ink} opacity="0.94" />
      {[0, 1, 2].map((row) => (
        <g key={row} opacity={interpolate(frame, [8 + row * 3, 16 + row * 3], [0, 1], clamp)}>
          <rect x={x + 30} y={top + 28 + row * 34} width={130 - row * 18} height="14" rx="7" fill="#3a3432" opacity="0.5" />
          <rect x={x + 214} y={top + 28 + row * 34} width="56" height="14" rx="7" fill="#3a3432" opacity="0.5" />
        </g>
      ))}
      <rect x={x + 30} y={top + 136} width={240 * total} height="22" rx="11" fill="url(#card-accent)" opacity={total} />
    </Canvas>
  );
};

export const cards: Record<string, React.FC<CardProps>> = {
  patients: Patients,
  emergency: Emergency,
  risk: Risk,
  illness: Illness,
  body: Body,
  healing: Healing,
  bill: Bill,
};
