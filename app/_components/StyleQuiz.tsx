"use client";

import { FontPicker } from "./FontPicker";
import { Brand } from "./Brand";
import { ThemePicker } from "./ThemePicker";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { catalog, checkPreferences, DEFAULT_PREFERENCES, MAX_NOTES, MAX_TOPIC, brandTheme, type CaptionPreset, type Preferences } from "../../src/preferences";
const CatalogPreview = dynamic(() => import("./CatalogPreview"), { ssr: false, loading: () => <p>Cargando ejemplo…</p> });

// Colores sugeridos para la vista previa de la paleta.
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
  { key: "off", title: "Siempre mi color", text: "Todo el video usa el color de tu marca." },
];
const CAPTIONS: Choice<CaptionPreset>[] = [
  { key: "pink", title: "Clásicos", text: "Tus palabras aparecen una a una, en blanco." },
  { key: "keyword", title: "Palabra clave", text: "La palabra importante se resalta con el color de tu marca." },
  { key: "karaoke", title: "Karaoke", text: "Ves la frase completa y se va encendiendo mientras hablas." },
];
const STEPS = ["Tu marca e idioma", "Estilo de edición", "Letra y subtítulos", "Catálogo de gráficos", "Color", "Sonidos", "Transiciones", "Resumen"];
const titleOf = <Key extends string>(choices: Choice<Key>[], key: Key) => choices.find((choice) => choice.key === key)?.title ?? key;

function Options<Key extends string>({ choices, value, two, onPick }: { choices: Choice<Key>[]; value: Key; two?: boolean; onPick: (key: Key) => void }) {
  return (
    <div className={`opts${two ? " two" : ""}`} role="radiogroup">
      {choices.map((choice) => (
        <div key={choice.key} className={`opt${value === choice.key ? " on" : ""}`}>
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

export const StyleQuiz: React.FC<{ initial: Preferences | null; cloud?: boolean; demo?: boolean }> = ({ initial, cloud, demo }) => {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Preferences>({ ...DEFAULT_PREFERENCES, ...initial });
  useEffect(() => {
    if (!demo) return;
    try {
      const stored = JSON.parse(localStorage.getItem("cutkind-demo-style") ?? "null");
      if (stored && checkPreferences(stored).length === 0) setPrefs(stored);
    } catch { /* Las preferencias de la demo son opcionales. */ }
  }, [demo]);
  const [example, setExample] = useState<string | null>(null);
  const exampleRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (example) exampleRef.current?.scrollIntoView({ block: "center" }); }, [example]);
  const [previewTransition, setPreviewTransition] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<Preferences>) => setPrefs((current) => ({ ...current, ...patch }));
  const preset = PRESETS.find(([hex]) => hex === prefs.brand_color.toLowerCase());
  const palette = brandTheme(prefs.brand_color);

  const save = async (value: Preferences) => {
    setSaving(true);
    setError(null);
    if (demo) {
      try { localStorage.setItem("cutkind-demo-style", JSON.stringify(value)); }
      catch { setSaving(false); setError("No pudimos guardar el estilo en este navegador."); return; }
      router.push("/demo");
      return;
    }
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
        <Brand href={demo ? "/demo" : initial ? "/app" : "/"} />
        <span className="muted">Paso {step + 1} de {STEPS.length} · {STEPS[step]}</span><ThemePicker />
      </header>
      <div className="progress" aria-hidden="true">{STEPS.map((name, index) => <i key={name} className={index <= step ? "on" : ""} />)}</div>

      {step === 0 && (
        <section>
          <h1>{initial ? "Tu estilo" : "Antes de editar, cuéntanos cómo te gustan tus videos."}</h1>
          {demo && <p className="notice">Modo demo · Tu estilo se guarda sólo en este navegador, sin cuenta.</p>}
          <p className="lead">{initial ? "Ajusta tu marca y tus preferencias." : "Primero, define tu estilo. Después entrarás a tu estudio."} {cloud ? "Guardamos tus respuestas en tu cuenta para tus próximos videos." : "Guardamos tus respuestas en este equipo para tus próximos videos."}</p>
          <label className="field-label">Nombre de tu marca<input className="field" value={prefs.brand_name ?? ""} maxLength={80} onChange={(event) => set({ brand_name: event.target.value })} placeholder="Tu nombre o marca" /></label>
          <label className="field-label">Idioma de tus videos<select className="field" value={prefs.language ?? "mixed"} onChange={(event) => set({ language: event.target.value as Preferences["language"] })}>
            <option value="mixed">Español + English · detectar cambios</option><option value="es">Español</option><option value="en">English</option>
          </select></label>
          <p className="muted">El modo mixto conserva el idioma hablado, sin pedir traducción. Revisa nombres y cambios de idioma antes de exportar.</p>
          <label className="field-label">Nombres y términos que usas<input className="field" value={prefs.vocabulary ?? ""} maxLength={300} placeholder="Por ejemplo: Cutkind, Reels, AI, workflow" onChange={(event) => set({ vocabulary: event.target.value })} /></label>
          <p className="muted">Guía el reconocimiento de nombres; revisa siempre el resultado.</p>
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
          <p className="lead">Tres formas de contar tu historia. Elige el ritmo que más se parezca a ti.</p>
          <Options choices={VIBES} value={prefs.vibe} onPick={(vibe) => set({ vibe, ...VIBES.find((choice) => choice.key === vibe)!.fills })} />
        </section>
      )}

      {step === 2 && (
        <section>
          <h1>¿Cómo quieres tus subtítulos?</h1>
          <p className="lead">Elige una letra para tu marca. El tamaño se mantiene uniforme dentro del video.</p>
          <FontPicker value={prefs.font} onChange={font => set({ font })} accent={prefs.brand_color} />
          <h2>Cómo aparecen tus palabras</h2>
          <p className="muted">Elige cómo se destacan tus palabras. La letra elegida se aplica al video nuevo.</p>
          <Options choices={CAPTIONS} value={prefs.captions ?? "pink"} onPick={(captions) => set({ captions })} />
        </section>
      )}

      {step === 3 && (
        <section>
          <h1>¿Te gustan los gráficos?</h1>
          <p className="lead">Elige cuántos elementos quieres y qué tipos puede usar tu editor. La posición se calcula al guardar para dejar libre la cara y los subtítulos.</p>
          <Options choices={GRAPHICS} value={prefs.graphics} onPick={(graphics) => set({ graphics })} />
          <h2>Material de tus tarjetas</h2>
          <div className="catalog-grid" role="radiogroup" aria-label="Material de tarjetas">{catalog.materials.map((material) => <button type="button" role="radio" aria-checked={prefs.graphic_material === material.id} key={material.id} className={`catalog-choice ${prefs.graphic_material === material.id ? "on" : ""}`} onClick={() => set({ graphic_material: material.id as Preferences["graphic_material"] })}>
            <span className={`material-sample ${material.id}`} style={{ "--brand": prefs.brand_color } as React.CSSProperties}>Tu idea</span><b>{material.title}</b><span>{material.description}</span>
          </button>)}</div>
          <h2>Gráficos que te gustan</h2>
          <p className="muted">Esta selección limita las propuestas automáticas. La disponibilidad no implica que se añadan todos al video.</p>
          <div className="catalog-grid">{catalog.graphics.map((item) => <div key={item.id} className={`catalog-choice ${(prefs.graphic_kinds ?? []).includes(item.id) ? "on" : ""}`}>
            <label><input type="checkbox" checked={(prefs.graphic_kinds ?? []).includes(item.id)} onChange={(event) => set({ graphic_kinds: event.target.checked ? [...(prefs.graphic_kinds ?? []), item.id] : prefs.graphic_kinds?.filter((id) => id !== item.id) })} /> <b>{item.title}</b></label>
            <span>{item.description}</span>{item.id !== "photo" && <button type="button" className="button" onClick={() => setExample(item.id)}>Ver animación</button>}
          </div>)}</div>
          {example && <div className="catalog-preview" ref={exampleRef}><h3>{catalog.graphics.find((item) => item.id === example)?.title}</h3><CatalogPreview kind={example} preferences={prefs} /><button type="button" className="button" onClick={() => setExample(null)}>Cerrar ejemplo</button></div>}
        </section>
      )}

      {step === 4 && (
        <section>
          <h1>¿Cuál es el color de tu marca?</h1>
          <p className="lead">Lo usamos en los gráficos, los fondos y las frases a pantalla completa.</p>
          <div className="color-row">
            <div className="opt">
                <div className="palette" style={{ background: `linear-gradient(150deg, ${palette.dark}, ${palette.accent} 55%, ${palette.light})`, color: palette.on ?? "#fff" }}>
                  <b>TU COLOR</b>
                  <span>Lo verás aplicado en tu primer video.</span>
                </div>
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
          <Options two choices={CONTEXT} value={prefs.context_colors ? "on" : "off"} onPick={(key) => set({ context_colors: key === "on" })} />
        </section>
      )}

      {step === 5 && (
        <section>
          <h1>¿Efectos de sonido?</h1>
          <p className="lead">Elige la intensidad y escucha las familias de sonidos más abajo. No incluimos música: la agregas al publicar.</p>
          <Options choices={SOUNDS} value={prefs.sfx} onPick={(sfx) => set({ sfx })} />
          <h2>Familia de sonidos</h2>
          <div className="catalog-grid">{catalog.sounds.map((pack) => <div className={`catalog-choice ${prefs.sound_pack === pack.id ? "on" : ""}`} key={pack.id}>
            <b>{pack.title}</b><span>{pack.description}</span>
            <audio controls preload="none" src={`/${pack.sample}`} aria-label={`Escuchar ${pack.title}`} onPlay={(event) => document.querySelectorAll("video,audio").forEach((media) => { if (media !== event.currentTarget) (media as HTMLMediaElement).pause(); })} />
            <button type="button" className="button" aria-pressed={prefs.sound_pack === pack.id} onClick={() => set({ sound_pack: pack.id as Preferences["sound_pack"] })}>{prefs.sound_pack === pack.id ? "✓ Elegido" : "Elegir"}</button>
          </div>)}</div>
        </section>
      )}

      {step === 6 && (
        <section><h1>¿Cómo cambiamos de toma?</h1><p className="lead">Se aplica cuando el montaje corta una pausa. Un video con una sola toma no necesita transición.</p>
          <div className="catalog-grid" role="radiogroup" aria-label="Transiciones">{catalog.transitions.map((item) => <button type="button" role="radio" aria-checked={prefs.transition === item.id} className={`catalog-choice ${prefs.transition === item.id ? "on" : ""}`} key={item.id} onClick={() => { set({ transition: item.id as Preferences["transition"] }); setPreviewTransition(true); }}><b>{item.title}</b><span>{item.description}</span><span>Elegir y ver ejemplo</span></button>)}</div>
          {previewTransition && <div className="catalog-preview"><CatalogPreview preferences={prefs} transition={prefs.transition} /></div>}
        </section>
      )}
      {step === 7 && (
        <section>
          <h1>¿Algo más que debamos saber?</h1>
          <p className="lead">Opcional. Por ejemplo: «prefiero algo sobrio», «no uses rojo», «hablo rápido».</p>
          <textarea className="field" rows={3} maxLength={MAX_NOTES} value={prefs.notes} onChange={(event) => set({ notes: event.target.value })} placeholder="Escríbelo como se lo dirías a tu editor." />
          <h2>Tu estilo</h2>
          <dl className="summary">
            <div><dt>Marca</dt><dd>{prefs.brand_name || "Sin nombre"}</dd></div>
            <div><dt>Idioma</dt><dd>{prefs.language === "mixed" ? "Español + English" : prefs.language}</dd></div>
            <div><dt>Letra</dt><dd>{catalog.fonts.find((item) => item.id === prefs.font)?.title}</dd></div>
            <div><dt>Catálogo</dt><dd>{prefs.graphic_kinds?.length ?? 0} gráficos · {catalog.materials.find((item) => item.id === prefs.graphic_material)?.title}</dd></div>
            <div><dt>Transición</dt><dd>{catalog.transitions.find((item) => item.id === prefs.transition)?.title}</dd></div>
            <div><dt>Familia de sonido</dt><dd>{catalog.sounds.find((item) => item.id === prefs.sound_pack)?.title}</dd></div>
            <div><dt>Contenido</dt><dd>{prefs.topic.trim() || "Sin indicar"}</dd></div>
            <div><dt>Edición</dt><dd>{titleOf(VIBES, prefs.vibe)}</dd></div>
            <div><dt>Gráficos</dt><dd>{titleOf(GRAPHICS, prefs.graphics)}</dd></div>
            <div><dt>Color</dt><dd><i className="dot-color" style={{ background: prefs.brand_color }} />{preset?.[1] ?? prefs.brand_color.toUpperCase()} · {prefs.context_colors ? "cambia con el tema" : "siempre el tuyo"}</dd></div>
            <div><dt>Subtítulos</dt><dd>{titleOf(CAPTIONS, prefs.captions ?? "pink")}</dd></div>
            <div><dt>Sonido</dt><dd>{titleOf(SOUNDS, prefs.sfx)}</dd></div>
          </dl>
          <p className="muted">Letra, color, material, transición, idioma y sonido se aplican a los videos nuevos. Los tipos de gráficos limitan las propuestas. Los videos anteriores conservan su versión hasta que elijas actualizarla.</p>
        </section>
      )}

      {error && <div className="notice">{error}</div>}

      <nav className="quiz-nav">
        <div>
          {step > 0 && <button type="button" className="button" onClick={() => setStep(step - 1)}>← Atrás</button>}
          {step < STEPS.length - 1
            ? <button type="button" className="button primary" onClick={() => { setStep(step + 1); window.scrollTo(0, 0); }}>Siguiente →</button>
            : <button type="button" className="button primary" disabled={saving} onClick={() => save(prefs)}>{saving ? "Guardando…" : "Guardar mi estilo"}</button>}
        </div>
      </nav>
    </main>
  );
};
