import type { Metadata } from "next";
import { Chat } from "./_landing/Chat";
import { Brand, Heading, PrimaryAction } from "./_landing/Elements";
import Faq from "./_landing/Faq";
import Plans from "./_landing/Plans";
import { getPrimaryAction, landingConfig } from "./_landing/config";
import { ThemePicker } from "./_components/ThemePicker";
import "./landing.css";

export const metadata: Metadata = {
  title: "Cutkind — Tu voz. Tu historia. Tu mejor corte.",
  description: "Sube tu grabación y conviértela en un video con ritmo, subtítulos, gráficos y sonido. Después, pide los cambios que quieras con tus propias palabras.",
};

const STEPS: [string, string, string?][] = [
  ["Sube tu grabación", "Tu video, hablando a cámara. Esa es la materia prima."],
  ["Recibe la primera edición", "Pausas fuera, subtítulos, gráficos y sonido ya puestos.", "Próximamente con IA"],
  ["Pide cambios con tus palabras", "Dilo como se lo dirías a un editor, sin aprender uno.", "Próximamente"],
  ["Descarga y publica", "Un MP4 vertical, listo para Reels, TikTok y Shorts."],
];

export default function Landing() {
  const action = getPrimaryAction(landingConfig);
  return (
    <div className="landing">
      <a className="skip" href="#contenido">Ir al contenido</a>
      {!landingConfig.flowConnected && (
        <div className="announce"><span>Cutkind abre por invitación.</span> <a href={action.href}>Solicita acceso →</a></div>
      )}
      <nav className="nav" aria-label="Principal">
        <div className="wrap nav-in">
          <Brand />
          <div className="nav-links"><a href="#como">Cómo funciona</a><a href="#incluye">Qué incluye</a><a href="#planes">Planes</a><a href="#preguntas">Preguntas</a></div>
          <ThemePicker /><a className="nav-enter" href="/app">Entrar</a>
        </div>
      </nav>

      <main id="contenido">
        <header className="hero wrap">
          <div className="hero-copy">
            <p className="pill"><span aria-hidden="true">✦</span> MENOS EDICIÓN. MÁS TÚ.</p>
            <h1>Tu voz.<br />Tu historia.<br /><em>Tu mejor corte.</em></h1>
            <p className="lead">Convierte lo que grabaste en algo que quieras compartir. Cortes, subtítulos y gráficos que acompañan tu historia.</p>
            <div className="actions"><PrimaryAction /><a className="ghost" href="#como">Cómo funciona</a></div>
            <p className="support">Hecho para Reels, TikTok y Shorts. Editamos tu material real: tu voz y tu cara siguen siendo tuyas.</p>
          </div>
          <div className="hero-video">
            <span className="hero-caption">YOUR VOICE. A KINDER CUT.</span>
            <div className="phone">
              <div className="demo-placeholder">
                <span className="demo-placeholder-tag">PRÓXIMAMENTE</span>
                <img src="/brand/cutkind-symbol.svg" width={124} height={124} alt="" />
                <span className="demo-placeholder-wordmark">cutkind</span>
                <p>Nuestra historia.<br />Nuestro primer corte.</p>
                <span className="demo-placeholder-detail">Estamos preparando nuestra demo.</span>
              </div>
            </div>
            <div className="hero-note"><span aria-hidden="true">✦</span><div><b>Tu esencia, intacta.</b><span>Nos encargamos de los cortes.</span></div><span className="hero-check" aria-hidden="true">✓</span></div>
          </div>
        </header>

        <section className="section tint" id="como">
          <div className="wrap">
            <Heading eyebrow="Cómo funciona" sub="Hoy el flujo corre en pruebas privadas; lo marcado está en camino.">Cuatro pasos. Cero editores complicados.</Heading>
            <ol className="how">
              {STEPS.map(([title, text, tag], index) => (
                <li key={title}><b>{index + 1}</b><h3>{title}</h3><p>{text}</p>{tag && <span className="soon">{tag}</span>}</li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section wrap" id="incluye">
          <Heading eyebrow="Qué incluye la edición" sub="Todo lo que normalmente toma horas en una línea de tiempo.">Una edición completa, pensada para contenido corto.</Heading>
          <div className="facts">
            {landingConfig.features.map((feature) => <div key={feature.title}><h3>{feature.title}</h3><p>{feature.text}</p></div>)}
            <div><h3>Cortes sin habla</h3><p>Quitamos los momentos sin voz y conservamos cada palabra, en el mismo orden.</p></div>
            <div><h3>Sonido que acompaña</h3><p>Efectos en los cortes y en cada gráfico, sin tapar tu voz.</p></div>
            <div><h3>Pensado en vertical</h3><p>Contenido corto en 9:16, listo para Reels, TikTok y Shorts.</p></div>
          </div>
        </section>

        <section className="section dark" id="correcciones">
          <div className="wrap talk">
            <div className="talk-copy">
              <p className="eyebrow">Correcciones conversacionales</p>
              <h2>No necesitas saber cómo editar. Solo explicar qué quieres cambiar.</h2>
              <p className="sub">Escribes el cambio como se lo dirías a una persona y lo ves aplicado. Revisas, aceptas o pides otro ajuste.</p>
              <span className="soon on-dark">Próximamente · hoy es una demostración</span>
            </div>
            <Chat />
          </div>
        </section>

        <section className="section wrap" id="planes">
          <Heading eyebrow="Planes" sub="Los precios llegan pronto. Siempre verás el costo antes de confirmar una edición.">Elige cómo publicas.</Heading>
          <Plans />
        </section>

        <section className="wrap">
          <div className="voice">
            <div><h2>También podrás decirlo en voz alta.</h2><p>Dicta tus instrucciones y correcciones en lugar de escribirlas.</p></div>
            <span className="soon">Próximamente</span>
          </div>
        </section>

        <section className="section wrap" id="preguntas">
          <Heading eyebrow="Preguntas frecuentes" sub="Lo esencial antes de subir tu primer video.">Antes de empezar.</Heading>
          <Faq />
        </section>

        <section className="close" id="acceso">
          <div className="wrap">
            <h2>Tú tienes algo que contar.<br />Cutkind te ayuda a publicarlo.</h2>
            <PrimaryAction light />
            {!landingConfig.flowConnected && (
              <p className="access-note">Acceso por invitación, por ahora.{landingConfig.accessEmail ? <> Escríbenos a <a href={`mailto:${landingConfig.accessEmail}`}>{landingConfig.accessEmail}</a>.</> : " Pronto abriremos la lista de espera."}</p>
            )}
          </div>
        </section>
      </main>

      <footer className="foot"><div className="wrap foot-in"><Brand /><span>Hecho para creadores.</span><a href="#contenido">Volver arriba ↑</a></div></footer>
    </div>
  );
}
