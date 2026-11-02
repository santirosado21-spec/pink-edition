"use client";
import { Player } from "@remotion/player";
import { interpolate, useCurrentFrame } from "remotion";
import { EditContext, buildEdit } from "../../src/edit";
import { EditorialGraphics } from "../../src/EditorialGraphics";
import { DEFAULT_PREFERENCES, type Preferences } from "../../src/preferences";
import style from "../../style/pink-demo-v1.json";

function Scene({ kind, preferences, transition }: { kind: string; preferences: Preferences; transition?: string }) {
  const frame = useCurrentFrame();
  const effectFrame = frame - 45;
  const scale = transition === "punch" && effectFrame >= 0 && effectFrame < 8 ? interpolate(effectFrame, [0, 8], [1.06, 1]) : 1;
  const flash = transition === "flash" && effectFrame >= 0 && effectFrame < 5 ? interpolate(effectFrame, [0, 5], [0.55, 0]) : 0;
  const edit = buildEdit({ style: { ...style, graphics: { ...style.graphics, left: 50 } },
    timeline: { is_sample: true, duration_frames: 90, clips: [] }, media: { source: "", person: null },
    plan: { version: 1, style: style.id, cuts: [], backgrounds: [], preferences,
      cards: [{ id: "catalog", kind, label: "Ejemplo ilustrativo", theme: "base", duration_frames: 90,
        anchor_word_id: "sample", offset_frames: 0, sample_frame: 0, top: 80,
        beat: { anchor_word_id: "sample", offset_frames: 0, sample_frame: 30 }, text: "3" }] } });
  return <EditContext.Provider value={edit}>
    <div style={{ position: "absolute", inset: 0, background: frame < 45 || !transition ? "#171a26" : "#273b43", transform: `scale(${scale})` }}>
      <EditorialGraphics />
      <div style={{ position: "absolute", bottom: 28, left: 50, color: "#fff", font: "24px sans-serif" }}>{transition ? (frame < 45 ? "Toma 1" : "Toma 2") : "Ejemplo del catálogo · 3 segundos"}</div>
    </div>
    {flash > 0 && <div style={{ position: "absolute", inset: 0, background: "white", opacity: flash }} />}
  </EditContext.Provider>;
}
export default function CatalogPreview({ kind = "question", preferences = DEFAULT_PREFERENCES, transition }: { kind?: string; preferences?: Preferences; transition?: string }) {
  return <Player key={`${kind}-${transition ?? ""}`} component={Scene} inputProps={{ kind, preferences, transition }}
    durationInFrames={90} fps={30} compositionWidth={800} compositionHeight={420}
    controls acknowledgeRemotionLicense style={{ width: "100%", aspectRatio: "800 / 420" }} />;
}
