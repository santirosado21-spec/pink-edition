import { Sequence, useVideoConfig } from "remotion";
import { LiquidGlass } from "./LiquidGlass";
import { ThemeContext, useEdit } from "./edit";
import { cards } from "./graphics/cards";

// Detrás de la persona por defecto; al frente sólo las que no cupieron sobre la cabeza.
export const EditorialGraphics: React.FC<{ layer: "behind" | "front" }> = ({ layer }) => {
  const { fps } = useVideoConfig();
  const { style, plan, resolveFrame, themeOf } = useEdit();
  const captions = style.captions;
  // Cada tarjeta sale del plan; entra con su palabra y el énfasis con otra.
  return (
    <>
      {plan.cards.filter((event) => (event.layer ?? "behind") === layer).map((event) => {
        const Card = cards[event.kind];
        if (!Card) throw new Error(`Tarjeta desconocida: ${event.kind}`);
        if (event.top === undefined) throw new Error(`Tarjeta ${event.id} sin posición: falta ejecutar place_graphics.py.`);
        const from = resolveFrame(event, event.id);
        const beat = resolveFrame(event.beat, event.id) - from;
        return (
          <Sequence key={event.id} name={`Gráfico: ${event.label}`} from={from} durationInFrames={event.duration_frames} premountFor={fps}>
            <LiquidGlass id={event.id} top={event.top} duration={event.duration_frames}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  color: style.graphics.ink,
                  fontFamily: captions.font_family,
                  fontSize: captions.font_size,
                  fontWeight: captions.font_weight,
                  letterSpacing: `${captions.letter_spacing_em}em`,
                }}
              >
                <ThemeContext.Provider value={themeOf(event.theme)}>
                  <Card duration={event.duration_frames} beat={beat} text={event.text} />
                </ThemeContext.Provider>
              </div>
            </LiquidGlass>
          </Sequence>
        );
      })}
    </>
  );
};
