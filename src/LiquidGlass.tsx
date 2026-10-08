import { Easing, interpolate, useCurrentFrame } from "remotion";
import config from "../full-demo-config.json";

const style = config.graphics;
const glass = style.glass;

// Mapa de desplazamiento: rojo mueve en x y verde en y; 0x80 es neutro.
// Sólo el borde se aparta del neutro, así el centro queda sin deformar.
const displacementMap = (width: number, height: number) => {
  const stops = (rim: number, high: string, mid: string) =>
    `<stop offset='0' stop-color='${high}'/><stop offset='${rim}' stop-color='${mid}'/>` +
    `<stop offset='${1 - rim}' stop-color='${mid}'/><stop offset='1' stop-color='#000000'/>`;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'><defs>` +
    `<linearGradient id='x' x1='0' x2='1' y1='0' y2='0'>${stops(glass.rim_pixels / width, "#ff0000", "#800000")}</linearGradient>` +
    `<linearGradient id='y' x1='0' x2='0' y1='0' y2='1'>${stops(glass.rim_pixels / height, "#00ff00", "#008000")}</linearGradient>` +
    `</defs><rect width='${width}' height='${height}' fill='url(#x)'/>` +
    `<rect width='${width}' height='${height}' fill='url(#y)' style='mix-blend-mode:screen'/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const LiquidGlass: React.FC<{
  id: string;
  top: number;
  duration: number;
  children: React.ReactNode;
}> = ({ id, top, duration, children }) => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.16, 1, 0.3, 1);
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const enter = interpolate(frame, [0, style.enter_frames], [0, 1], { ...clamp, easing: ease });
  const leave = interpolate(frame, [duration - style.exit_frames, duration], [0, 1], clamp);
  // La opacidad va en cada capa: en un contenedor apagaría el fondo del vidrio.
  const opacity = interpolate(frame, [0, 6], [0, 1], clamp) * (1 - leave);
  const sheen = interpolate(frame, [3, 3 + glass.sheen_frames], [-0.5, 1.5], clamp);
  const layer = { position: "absolute", inset: 0, borderRadius: style.radius } as const;

  return (
    <div
      style={{
        position: "absolute",
        left: style.left,
        top,
        width: style.width,
        height: style.height,
        translate: `0px ${(1 - enter) * style.enter_offset}px`,
        scale: String(0.94 + 0.06 * enter - 0.03 * leave),
      }}
    >
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={`glass-${id}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage href={displacementMap(style.width, style.height)} x="0" y="0" width={style.width} height={style.height} preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={glass.refraction} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div
        style={{
          ...layer,
          opacity,
          backdropFilter: `url(#glass-${id}) blur(${glass.blur}px) saturate(${glass.saturate}) brightness(${glass.brightness})`,
          background: glass.tint,
          boxShadow: `0 20px 54px rgba(0,0,0,.30), 0 0 ${glass.halo_pixels}px rgba(255,255,255,${glass.halo})`,
        }}
      />
      <div style={{ ...layer, opacity, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: `${sheen * 100}%`,
            width: "34%",
            height: "140%",
            rotate: "16deg",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,.34), transparent)",
          }}
        />
        <div
          style={{
            ...layer,
            background: "linear-gradient(160deg, rgba(255,255,255,.22) 0%, rgba(255,255,255,.04) 38%, rgba(255,255,255,0) 60%, rgba(255,255,255,.08) 100%)",
            boxShadow:
              "inset 0 3px 2px rgba(255,255,255,.90), inset 0 -2px 2px rgba(255,255,255,.30), inset 3px 0 2px rgba(255,255,255,.36), inset -2px 0 2px rgba(255,255,255,.20), inset 0 0 30px rgba(255,255,255,.16)",
          }}
        />
      </div>
      <div style={{ ...layer, opacity, filter: `blur(${(1 - enter) * 8 + leave * 6}px)` }}>{children}</div>
    </div>
  );
};
