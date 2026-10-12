import { Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { useEdit } from "./edit";

// Corte a pantalla completa: tapa el video y deja sólo la frase que se está diciendo.
const Cut: React.FC<{ from: number; firstId: string; lastId: string; look: { background: string; ink: string; muted: string } }> = ({ from, firstId, lastId, look }) => {
  const frame = useCurrentFrame() + from;
  const { style, wordsBetween } = useEdit();
  const captions = style.captions;
  const words = wordsBetween(firstId, lastId);
  const current = words.reduce((found, word, index) => (word.frame <= frame ? index : found), 0);
  return (
    <div style={{ position: "absolute", inset: 0, background: look.background, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: captions.max_width,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          columnGap: captions.word_gap + 10,
          fontFamily: captions.font_family,
          fontSize: captions.font_size,
          fontWeight: captions.font_weight,
          lineHeight: `${captions.line_height}px`,
          letterSpacing: `${captions.letter_spacing_em}em`,
          textTransform: "uppercase",
        }}
      >
        {words.map((word, index) => (
          <span key={word.id} style={{ color: index === current ? look.ink : look.muted }}>
            {word.text.replace(/[.,:;!?]/g, "")}
          </span>
        ))}
      </div>
    </div>
  );
};

export const ColorCuts: React.FC = () => {
  const { fps } = useVideoConfig();
  const { style, plan, resolveFrame, themeOf } = useEdit();
  const settings = style.cuts;
  return (
    <>
      {plan.cuts.map((event) => {
        const from = resolveFrame(event, event.id);
        const theme = themeOf(event.theme);
        // El color del corte sigue el tema: fondo de color o papel con tinta de color.
        const look =
          event.style === "solid"
            ? { ...settings.solid, background: `linear-gradient(150deg, ${theme.dark} 0%, ${theme.accent} 55%, ${theme.light} 100%)`, ink: theme.on ?? settings.solid.ink, muted: theme.on_muted ?? settings.solid.muted }
            : { ...settings.paper, ink: theme.ink ?? theme.accent };
        return (
          <Sequence key={event.id} name={`Corte de color: ${event.label}`} from={from} durationInFrames={event.duration_frames} premountFor={fps}>
            <Cut from={from} firstId={event.anchor_word_id} lastId={event.last_word_id} look={look} />
          </Sequence>
        );
      })}
    </>
  );
};
