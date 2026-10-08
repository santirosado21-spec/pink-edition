import { Sequence, useVideoConfig } from "remotion";
import config from "../full-demo-config.json";
import { LiquidGlass } from "./LiquidGlass";
import { cards } from "./graphics/cards";
import { ThemeContext, themeOf } from "./theme";
import { resolveFrame } from "./timeline";

const style = config.graphics;

export const EditorialGraphics: React.FC = () => {
  const { fps } = useVideoConfig();
  // Cada tarjeta sale del config; entra con su palabra y el énfasis con otra.
  return (
    <>
      {style.events.map((event) => {
        const Card = cards[event.kind];
        if (!Card) throw new Error(`Tarjeta desconocida: ${event.kind}`);
        const from = resolveFrame(event);
        const beat = resolveFrame({ ...event, ...event.beat }) - from;
        return (
          <Sequence key={event.id} name={`Gráfico: ${event.label}`} from={from} durationInFrames={event.duration_frames} premountFor={fps}>
            <LiquidGlass id={event.id} top={event.top} duration={event.duration_frames}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  color: style.ink,
                  fontFamily: config.captions.font_family,
                  fontSize: config.captions.font_size,
                  fontWeight: config.captions.font_weight,
                  letterSpacing: `${config.captions.letter_spacing_em}em`,
                }}
              >
                <ThemeContext.Provider value={themeOf(event.theme)}>
                  <Card duration={event.duration_frames} beat={beat} />
                </ThemeContext.Provider>
              </div>
            </LiquidGlass>
          </Sequence>
        );
      })}
    </>
  );
};
