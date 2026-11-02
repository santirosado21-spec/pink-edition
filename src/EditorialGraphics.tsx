import { Img, Sequence, useVideoConfig } from "remotion";
import { LiquidGlass } from "./LiquidGlass";
import { asset, ThemeContext, useEdit } from "./edit";
import { cards } from "./graphics/cards";
import { safeCardTop } from "./visualSafety";

export const EditorialGraphics: React.FC = () => {
  const { fps } = useVideoConfig();
  const { style, plan, clips, isSample, resolveFrame, themeOf } = useEdit();
  const captions = style.captions;
  // Cada tarjeta sale del plan; entra con su palabra y el énfasis con otra.
  return (
    <>
      {plan.cards.map((event) => {
        const Card = cards[event.kind];
        if (!Card && event.kind !== "photo") throw new Error(`Tarjeta desconocida: ${event.kind}`);
        const from = resolveFrame(event, event.id);
        const top = isSample ? event.top : safeCardTop({ clips }, plan, style, from, event.duration_frames, event.top);
        if (top === null || top === undefined) return null;
        const beat = resolveFrame(event.beat, event.id) - from;
        return (
          <Sequence key={event.id} name={`Gráfico: ${event.label}`} from={from} durationInFrames={event.duration_frames} premountFor={fps}>
            <LiquidGlass id={event.id} top={top} duration={event.duration_frames}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  color: plan.preferences?.graphic_material === "paper" ? "#17131c" : style.graphics.ink,
                  fontFamily: captions.font_family,
                  fontSize: captions.font_size,
                  fontWeight: captions.font_weight,
                  letterSpacing: `${captions.letter_spacing_em}em`,
                }}
              >
                <ThemeContext.Provider value={themeOf(event.theme)}>
                  {event.kind === "photo" && event.photo ? <Img src={asset(event.photo.asset)} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : Card ? <Card duration={event.duration_frames} beat={beat} text={event.text} /> : null}
                </ThemeContext.Provider>
              </div>
            </LiquidGlass>
          </Sequence>
        );
      })}
    </>
  );
};
