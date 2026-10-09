import type { Metadata } from "next";
import {
  Badge,
  Brand,
  PrimaryAction,
  SectionHeading,
} from "./_landing/Elements";
import ProductPreview from "./_landing/ProductPreview";
import DemoComparison from "./_landing/DemoComparison";
import Plans from "./_landing/Plans";
import Faq from "./_landing/Faq";
import { landingConfig } from "./_landing/config";
import "./landing.css";

export const metadata: Metadata = {
  title: "Pink.ai — Tu próximo Reel empieza con tu video",
  description:
    "Edición de grabaciones reales para contenido corto. Conoce Pink.ai: ritmo, subtítulos, gráficos y sonido. Acceso por invitación.",
};

const steps = [
  [
    "Sube tu grabación.",
    "Empieza con tu voz y tu material real, hablando a cámara.",
    "Disponible solo en local",
  ],
  [
    "Recibe la primera edición.",
    "La idea: recibir una propuesta de IA que puedas revisar y hacer tuya.",
    "Próximamente · IA sin validar",
  ],
  [
    "Pide cambios con tus palabras.",
    "Explica qué quieres ajustar sin aprender las herramientas de un editor.",
    "Próximamente",
  ],
  [
    "Descarga y publica.",
    "Revisa el resultado y exporta tu video vertical en MP4.",
    "Disponible solo en local",
  ],
];
const features = [
  [
    "01",
    "Ritmo sin perder tu voz.",
    "Cortes para quitar momentos sin habla, conservando tus palabras y su orden.",
  ],
  [
    "Aa",
    "Cada palabra, a tiempo.",
    "Subtítulos sincronizados con la voz, con una tipografía consistente y legible.",
  ],
  [
    "▧",
    "Gráficos con sentido.",
    "Cortes de color, tarjetas de vidrio y fondos temáticos elegidos por frase en el editor.",
  ],
  [
    "↗",
    "Sonido que acompaña.",
    "Efectos de sonido para acompañar los cortes y los elementos de la edición.",
  ],
  [
    "9:16",
    "Pensado en vertical.",
    "Contenido corto, listo para exportar en MP4 de 1080 × 1920 desde el sistema local.",
  ],
];

export default function Landing() {
  return (
    <div className="landing">
      <a className="skip-link" href="#contenido">
        Ir al contenido
      </a>
      <nav className="landing-nav" aria-label="Navegación principal">
        <div className="wrap nav-inner">
          <Brand />
          <div className="nav-links">
            <a href="#demo">Demo</a>
            <a href="#como">Cómo funciona</a>
            <a href="#planes">Planes</a>
            <a href="#preguntas">Preguntas</a>
          </div>
          <a className="nav-entry" href="/app">
            Entrar <span aria-hidden="true">↗</span>
          </a>
        </div>
      </nav>
      <main id="contenido">
        <section className="hero" aria-labelledby="hero-title">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">
                TU MATERIAL. TU VOZ. TU FORMA DE CONTAR.
              </p>
              <h1 id="hero-title">
                Tu próximo Reel empieza con <span>tu video.</span>
              </h1>
              <p className="hero-lead">
                Dale ritmo a tu grabación con subtítulos, gráficos y sonido. Tú
                pones lo que tienes que contar.
              </p>
              <p className="future-copy">
                <Badge>Próximamente</Badge> Una primera edición con IA y cambios
                pedidos con tus propias palabras.
              </p>
              <div className="hero-actions">
                <PrimaryAction />
                <a className="text-link" href="#demo">
                  Ver una demo <span aria-hidden="true">↓</span>
                </a>
              </div>
              <p className="hero-note">Hecho para Reels, TikTok y Shorts.</p>
              <p className="availability">
                Por ahora, el editor funciona solo en el equipo del propietario.
                El flujo público aún no está conectado.
              </p>
            </div>
            <ProductPreview />
          </div>
          <div className="wrap hero-foot">
            <span>GRABACIONES REALES, IDEAS PROPIAS</span>
            <span>Para creadores, emprendedores y marcas personales.</span>
          </div>
        </section>
        <section className="section wrap" id="demo">
          <SectionHeading
            number="02"
            title="La misma historia. Otra forma de verla."
          >
            Un espacio para comparar el original con su edición, sin cambiar
            quién está detrás de la cámara.
          </SectionHeading>
          <DemoComparison />
        </section>
        <section className="how-section" id="como">
          <div className="wrap section">
            <SectionHeading
              number="03"
              title="De tu cámara a tu próxima publicación."
            >
              Este es el flujo que estamos construyendo. La edición pública
              todavía no está disponible.
            </SectionHeading>
            <ol className="steps">
              {steps.map(([title, description, status], index) => (
                <li key={title}>
                  <span className="step-number">0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <Badge>{status}</Badge>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className="section wrap" id="incluye">
          <SectionHeading
            number="04"
            title="La edición se nota. Tú te reconoces."
          >
            Estas herramientas ya funcionan en el editor local. Editamos lo que
            grabas, sin sustituirte por un personaje artificial.
          </SectionHeading>
          <div className="features-grid">
            {features.map(([symbol, title, description]) => (
              <article className="feature-card" key={title}>
                <span className="feature-symbol" aria-hidden="true">
                  {symbol}
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="conversation-section" id="correcciones">
          <div className="wrap section split-section">
            <div>
              <Badge>Próximamente</Badge>
              <SectionHeading
                number="05"
                title="Menos botones. Más tus palabras."
              >
                No necesitas saber cómo editar. Solo explicar qué quieres
                cambiar.
              </SectionHeading>
              <p>
                Así imaginamos las correcciones conversacionales: tú describes
                el cambio y revisas la nueva versión. Esta función aún no está
                conectada.
              </p>
            </div>
            <div className="conversation">
              <div className="conversation-top">
                <span>Tu intención, por escrito</span>
                <Badge>Demostración</Badge>
              </div>
              <p className="conversation-note">
                Ejemplos de instrucciones · no es un chat activo
              </p>
              {[
                "Baja los efectos de sonido.",
                "Quita ese gráfico.",
                "Mantén todo lo que digo y corta solo las pausas.",
                "Usa la misma tipografía en todo el video.",
              ].map((text) => (
                <blockquote key={text}>{text}</blockquote>
              ))}
              <p className="conversation-bottom">Tu video sigue siendo tuyo.</p>
            </div>
          </div>
        </section>
        <section className="section wrap" id="planes">
          <SectionHeading number="06" title="A tu ritmo de publicación.">
            Pago por video o paquetes de créditos: opciones previstas para
            distintas formas de crear. Condiciones por definir.
          </SectionHeading>
          <Plans />
        </section>
        <section className="voice-section">
          <div className="wrap voice-inner">
            <div className="voice-art" aria-hidden="true">
              <svg viewBox="0 0 100 100" fill="none">
                <rect
                  x="39"
                  y="15"
                  width="22"
                  height="42"
                  rx="11"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  d="M28 45v4a22 22 0 0 0 44 0v-4M50 71v15M37 86h26"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <Badge>Próximamente</Badge>
              <p className="eyebrow">07 / DICTADO POR VOZ</p>
              <h2>También podrás decirlo en voz alta.</h2>
              <p>
                La idea es dictar instrucciones y correcciones para tu video.
                Por ahora, no hay dictado disponible.
              </p>
            </div>
          </div>
        </section>
        <section className="section wrap faq-section" id="preguntas">
          <SectionHeading number="08" title="Antes de darle rec.">
            Lo que puedes esperar hoy y lo que todavía estamos preparando.
          </SectionHeading>
          <Faq />
        </section>
        <section className="closing" aria-labelledby="closing-title">
          <div className="wrap">
            <img src="/logo.png" width="100" height="100" alt="" />
            <p className="eyebrow">09 / TU PRÓXIMA HISTORIA</p>
            <h2 id="closing-title">
              Tú tienes algo que contar.
              <br />
              <span>Pink.ai te ayuda a publicarlo.</span>
            </h2>
            <PrimaryAction />
            <div id="acceso" className="access-block">
              <h3>Acceso por invitación, por ahora.</h3>
              <p>El registro público todavía no está abierto.</p>
              {landingConfig.accessEmail ? (
                <a
                  className="text-link"
                  href={`mailto:${landingConfig.accessEmail}`}
                >
                  {landingConfig.accessEmail}
                </a>
              ) : (
                <p>El canal para solicitar una invitación se anunciará aquí.</p>
              )}
            </div>
          </div>
        </section>
      </main>
      <footer className="landing-footer wrap">
        <Brand />
        <p>Tu voz siempre es el punto de partida.</p>
        <a href="#contenido">Volver arriba ↑</a>
      </footer>
    </div>
  );
}
