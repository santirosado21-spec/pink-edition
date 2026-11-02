import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { loader } from "./test_support/load_ts.mjs";
const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const load = loader();
const { checkPreferences, DEFAULT_PREFERENCES, applyPreferences, catalog } = load("src/preferences.ts");
const old = { topic: "", notes: "", vibe: "balanced", graphics: "few", brand_color: "#e63b7a", context_colors: false, sfx: "soft" };
assert.equal(checkPreferences(old).length, 0, "Compatibilidad con perfiles anteriores");
assert.equal(checkPreferences(DEFAULT_PREFERENCES).length, 0);
assert.ok(checkPreferences({ ...old, graphic_kinds: ["bill", "bill"] }).length);
assert.ok(checkPreferences({ ...old, font: "unavailable" }).length);
const style = require(path.join(root, "style/pink-demo-v1.json"));
for (const font of catalog.fonts) {
  const applied = applyPreferences(style, { ...old, font: font.id });
  assert.equal(applied.captions.font_file, font.file);
  assert.equal(applied.captions.font_size, font.size);
}
for (const pack of catalog.sounds) {
  const applied = applyPreferences(style, { ...old, sound_pack: pack.id });
  assert.equal(applied.audio.intro_sfx.file, pack.sample);
  assert.ok(fs.existsSync(path.join(root, "public", pack.sample)));
}
const { proposalToPlan } = load("app/_lib/proposalPlan.ts");
const timeline = { duration_frames: 120, clips: [{ timeline_in_frame: 0, source_in_frame: 0, duration_frames: 120, words: [{ id: "w1", text: "factura", source_start_frame: 0 }, { id: "w2", text: "tres", source_start_frame: 60 }] }] };
const range = { first_word: 0, last_word: 1, beat_word: 1, theme: "base", label: "Prueba", meaning: "Prueba" };
const plan = proposalToPlan({ cuts: [], backgrounds: [], cards: [{ ...range, kind: "bill" }, { ...range, kind: "counter", text: "3" }] }, timeline, { preferences: { ...old, graphic_kinds: ["bill"] }, cuts: [], cards: [], backgrounds: [] });
assert.equal(plan.cards.length, 1);
assert.equal(plan.cards[0].kind, "bill", "La propuesta respeta el catálogo elegido");
console.log("PASS: preferencias antiguas, validación, fuentes, sonidos y catálogo permitido.");
