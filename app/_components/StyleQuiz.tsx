"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEFAULT_PREFERENCES, MAX_NOTES, MAX_TOPIC, brandTheme, type CaptionPreset, type Preferences } from "../../src/preferences";

// Mismos colores sugeridos que `PRESETS` en scripts/make_style_examples.py: cada uno tiene su clip.
const PRESETS: [string, string][] = [["#1f5fc4", "Azul"], ["#e63b7a", "Rosa"], ["#19a974", "Verde"], ["#ff6b00", "Naranja"], ["#7c3aed", "Morado"], ["#ffd400", "Amarillo"]];
const TOPICS = ["Salud y bienestar", "Negocios y finanzas", "Educación", "Fitness", "Estilo de vida", "Tecnología"];

type Choice<Key extends string> = { key: Key; title: string; text: string };
// El estilo general rellena gráficos y sonido; después se pueden ajustar por separado.
const VIBES: (Choice<Preferences["vibe"]> & { fills: Pick<Preferences, "graphics" | "sfx"> })[] = [
  { key: "clean", title: "Limpio", text: "Casi sólo tus palabras: subtítulos, pausas cortadas y sonido discreto.", fills: { graphics: "none", sfx: "soft" } },
  { key: "balanced", title: "Equilibrado", text: "Énfasis sólo en tus frases más importantes.", fills: { graphics: "few", sfx: "full" } },
  { key: "dynamic", title: "Dinámico", text: "Ritmo alto: cortes de color, gráficos y sonido en cada idea.", fills: { graphics: "many", sfx: "full" } },
];
const GRAPHICS: Choice<Preferences["graphics"]>[] = [
  { key: "many", title: "Sí, muchos", text: "Tarjetas y fondos cada vez que una frase los pida." },
  { key: "few", title: "Sólo los esenciales", text: "Un gráfico únicamente en las ideas centrales." },
  { key: "none", title: "Sin gráficos", text: "Tú y tus subtítulos, nada más en pantalla." },
];
const SOUNDS: Choice<Preferences["sfx"]>[] = [
  { key: "full", title: "Completos", text: "Se notan en cada corte y en cada gráfico." },
  { key: "soft", title: "Suaves", text: "Los mismos sonidos, a la mitad de volumen." },
  { key: "none", title: "Sin efectos", text: "Sólo tu voz." },
];
const CONTEXT: Choice<"on" | "off">[] = [
  { key: "on", title: "Que cambie con el tema", text: "Verde cuando hablas de salud, rojo en una alerta, y tu color en lo demás." },
  { key: "off", title: "Siempre mi color", text: "Todo el video usa el color de tu marca. El ejemplo lo muestra en azul." },
];
const CAPTIONS: Choice<CaptionPreset>[] = [
  { key: "pink", title: "Clásicos", text: "Tus palabras aparecen una a una, en blanco." },
  { key: "keyword", title: "Palabra clave", text: "La palabra importante se resalta con el color de tu marca." },
  { key: "karaoke", title: "Karaoke", text: "Ves la frase completa y se va encendiendo mientras hablas." },
];
const STEPS = ["Tu contenido", "Estilo de edición", "Subtítulos", "Gráficos", "Color", "Sonido", "Resumen"];
const titleOf = <Key extends string>(choices: Choice<Key>[], key: Key) => choices.find((choice) => choice.key === key)?.title ?? key;

// Un ejemplo es un clip real, editado por el motor con esa opción.
const Example: React.FC<{ name: string; sound?: boolean }> = ({ name, sound }) => (
  <video key={name} src={`/estilo/${name}.mp4`} poster={`/estilo/${name}.jpg`} controls playsInline loop preload="metadata" muted={!sound} />
);

function Options<Key extends string>({ choices, value, prefix, sound, two, onPick }: { choices: Choice<Key>[]; value: Key; prefix: string; sound?: boolean; two?: boolean; onPick: (key: Key) => void }) {
  return (
    <div className={`opts${two ? " two" : ""}`} role="radiogroup">
      {choices.map((choice) => (
        <div key={choice.key} className={`opt${value === choice.key ? " on" : ""}`}>
          <Example name={`${prefix}-${choice.key}`} sound={sound} />
          <button type="button" role="radio" aria-checked={value === choice.key} onClick={() => onPick(choice.key)}>
            <b>{choice.title}</b>
            <span>{choice.text}</span>
            <em>{value === choice.key ? "✓ Elegido" : "Elegir"}</em>
          </button>
        </div>
      ))}
    </div>
  );
}

export const StyleQuiz: React.FC<{ initial: Preferences | null }> = ({ initial }) => {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Preferences>(initial ?? DEFAULT_PREFERENCES);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<Preferences>) => setPrefs((current) => ({ ...current, ...patch }));
  const preset = PRESETS.find(([hex]) => hex === prefs.brand_color.toLowerCase());
  const palette = brandTheme(prefs.brand_color);

  const save = async (value: Preferences) => {
    setSaving(true);
    setError(null);
    const response = await fetch("/api/profile", { method: "PUT", body: JSON.stringify(value) }).catch(() => null);
    if (response?.ok) {
      router.push("/app");
      router.refresh();
      return;
    }
    setSaving(false);
    setError(response ? ((await response.json().catch(() => ({}))).error ?? "No se pudo guardar tu estilo.") : "No se pudo guardar tu estilo. Revisa tu conexión.");
  };

  return (
    <main className="quiz">
      <header>
        <Link href={initial ? "/app" : "/"} className="brand"><img src="/logo.png" alt="" /><b>Pink<span>.ai</span></b></Link>
        <span className="muted">Paso {step + 1} de {STEPS.length} · {STEPS[step]}</span>
      </header>
      <div className="progress" aria-hidden="true">{STEPS.map((name, index) => <i key={name} className={index <= step ? "on" : ""} />)}</div>

      {step === 0 && (
        <section>
          <h1>{initial ? "Tu estilo" : "Antes de editar, cuéntanos cómo te gustan tus videos."}</h1>
          <p className="lead">Son siete preguntas, una sola vez. Con tus respuestas editamos cada video a tu gusto, y puedes cambiarlas cuando quieras.</p>
          <h2>¿De qué hablas en tus videos?</h2>
          <div className="topics">
            {TOPICS.map((topic) => (
              <button key={topic} type="button" aria-pressed={prefs.topic === topic} className={prefs.topic === topic ? "on" : ""} onClick={() => set({ topic: prefs.topic === topic ? "" : topic })}>{topic}</button>
            ))}
          </div>
          <label className="field-label">O escríbelo con tus palabras
            <input className="field" value={prefs.topic} maxLength={MAX_TOPIC} placeholder="Por ejemplo: nutrición para mamás, bienes raíces en Monterrey…" onChange={(event) => set({ topic: event.target.value })} />
          </label>
        </section>
      )}

      {step === 1 && (
        <section>
          <h1>¿Qué estilo de edición te gusta?</h1>
          <p className="lead">El mismo momento, editado de tres formas. Reproduce cada uno y elige el que más se parezca a ti.</p>
          <Options choices={VIBES} value={prefs.vibe} prefix="vibe" sound onPick={(vibe) => set({ vibe, ...VIBES.find((choice) => choice.key === vibe)!.fills })} />
        </section>
      )}

      {step === 2 && (
        <section>
          <h1>¿Cómo quieres tus subtítulos?</h1>
          <p className="lead">La misma letra y el mismo tamaño; cambia cómo se destacan tus palabras.</p>
          <Options choices={CAPTIONS} value={prefs.captions ?? "pink"} prefix="captions" onPick={(captions) => set({ captions })} />
        </section>
      )}

      {step === 3 && (
        <section>
          <h1>¿Te gustan los gráficos?</h1>
          <p className="lead">Las tarjetas aparecen detrás de ti, nunca encima, y los fondos cambian con lo que dices.</p>
          <Options choices={GRAPHICS} value={prefs.graphics} prefix="graphics" onPick={(graphics) => set({ graphics })} />
        </section>
      )}

      {step === 4 && (
        <section>
          <h1>¿Cuál es el color de tu marca?</h1>
          <p className="lead">Lo usamos en los gráficos, los fondos y las frases a pantalla completa.</p>
          <div className="color-row">
            <div className="opt">
              {preset ? <Example name={`color-${preset[0].slice(1)}`} /> : (
                <div className="palette" style={{ background: `linear-gradient(150deg, ${palette.dark}, ${palette.accent} 55%, ${palette.light})`, color: palette.on ?? "#fff" }}>
                  <b>TU COLOR</b>
                  <span>Lo verás aplicado en tu primer video.</span>
                </div>
              )}
            </div>
            <div>
              <div className="swatches">
                {PRESETS.map(([hex, name]) => (
                  <button key={hex} type="button" title={name} aria-label={name} aria-pressed={preset?.[0] === hex} className={`swatch${preset?.[0] === hex ? " on" : ""}`} style={{ background: hex }} onClick={() => set({ brand_color: hex })} />
                ))}
              </div>
              <label className="field-label">O elige tu color exacto
                <span className="exact">
                  <input type="color" value={prefs.brand_color} onChange={(event) => set({ brand_color: event.target.value })} aria-label="Color exacto" />
                  <code>{prefs.brand_color.toUpperCase()}</code>
                </span>
              </label>
              {palette.on && <p className="muted">Es un color claro: el texto sobre él irá en oscuro para que se lea.</p>}
            </div>
          </div>
          <h2>Cuando el tema cambia, ¿cambia el color?</h2>
          <Options two choices={CONTEXT} value={prefs.context_colors ? "on" : "off"} prefix="context" onPick={(key) => set({ context_colors: key === "on" })} />
        </section>
      )}

      {step === 5 && (
        <section>
          <h1>¿Efectos de sonido?</h1>
          <p className="lead">Sube el volumen y reproduce cada ejemplo. No incluimos música: la agregas al publicar.</p>
          <Options choices={SOUNDS} value={prefs.sfx} prefix="sfx" sound onPick={(sfx) => set({ sfx })} />
        </section>
      )}

      {step === 6 && (
        <section>
          <h1>¿Algo más que debamos saber?</h1>
          <p className="lead">Opcional. Por ejemplo: «prefiero algo sobrio», «no uses rojo», «hablo rápido».</p>
          <textarea className="field" rows={3} maxLength={MAX_NOTES} value={prefs.notes} onChange={(event) => set({ notes: event.target.value })} placeholder="Escríbelo como se lo dirías a tu editor." />
          <h2>Tu estilo</h2>
          <dl className="summary">
            <div><dt>Contenido</dt><dd>{prefs.topic.trim() || "Sin indicar"}</dd></div>
            <div><dt>Edición</dt><dd>{titleOf(VIBES, prefs.vibe)}</dd></div>
            <div><dt>Gráficos</dt><dd>{titleOf(GRAPHICS, prefs.graphics)}</dd></div>
            <div><dt>Color</dt><dd><i className="dot-color" style={{ background: prefs.brand_color }} />{preset?.[1] ?? prefs.brand_color.toUpperCase()} · {prefs.context_colors ? "cambia con el tema" : "siempre el tuyo"}</dd></div>
            <div><dt>Subtítulos</dt><dd>{titleOf(CAPTIONS, prefs.captions ?? "pink")}</dd></div>
            <div><dt>Sonido</dt><dd>{titleOf(SOUNDS, prefs.sfx)}</dd></div>
          </dl>
          <p className="muted">El color y el sonido se aplican solos en cada video. El resto guía la propuesta de edición.</p>
        </section>
      )}

      {error && <div className="notice">{error}</div>}

      <nav className="quiz-nav">
        <div>
          {step > 0 ? <button type="button" className="button" onClick={() => setStep(step - 1)}>← Atrás</button> : !initial && (
            <button type="button" className="button ghost" disabled={saving} onClick={() => save(DEFAULT_PREFERENCES)}>Saltar y usar el estilo Pink</button>
          )}
          {step < STEPS.length - 1
            ? <button type="button" className="button primary" onClick={() => { setStep(step + 1); window.scrollTo(0, 0); }}>Siguiente →</button>
            : <button type="button" className="button primary" disabled={saving} onClick={() => save(prefs)}>{saving ? "Guardando…" : "Guardar mi estilo"}</button>}
        </div>
      </nav>
    </main>
  );
};
